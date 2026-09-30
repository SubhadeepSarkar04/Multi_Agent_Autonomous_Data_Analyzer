"""
agents.py

Agent node definitions for the AutoML multi-agent pipeline.

This module defines:
  - `run_agent_node()`: the single shared execution loop used by every
    agent node. It calls the LLM, parses the THOUGHT/CODE response,
    executes the CODE block in the sandbox, and reconciles the result
    back into pipeline state (including self-correction bookkeeping).
  - Four node functions -- `loader_eda_node`, `feature_engineer_node`,
    `tuner_node`, `explainer_node` -- each of which supplies a
    specialized system prompt and delegates everything else to
    `run_agent_node()`.

No agent node ever inspects a DataFrame, a fitted model, or a plot
directly. Every node receives `state: DataScientistState` (paths and
metadata only), and the only way a node changes state is through
`state_updates`, produced inside the sandbox and merged back in by
`execute_agent_code()`.
"""

from __future__ import annotations

from typing import Any, Dict

from state_schema import DataScientistState
from llm_provider import get_llm
from sandbox import execute_agent_code
from parsing import parse_agent_response


MAX_RETRIES = 3


# ---------------------------------------------------------------------------
# Shared execution loop
# ---------------------------------------------------------------------------

def run_agent_node(state: DataScientistState, system_prompt: str, agent_name: str) -> Dict[str, Any]:
    """
    Shared execution loop used by every agent node in the pipeline.

    Steps:
      1. Build the full prompt: the node's static `system_prompt` plus
         dynamic context pulled from `state` (schema summary, target
         column, problem type, and -- on a retry -- the previous
         failure's traceback and code, so the LLM can fix its own
         mistake rather than starting blind).
      2. Call the LLM via the `llm_provider.get_llm()` factory.
      3. Parse the raw response into (thought, code) with
         `parse_agent_response()`. The thought is log-only and is never
         executed or merged into state. If parsing fails (missing or
         malformed <code> tags), that is treated exactly like a sandbox
         execution failure -- same retry/error-tracking path below --
         rather than attempting to salvage code from unstructured text.
      4. Execute the parsed code with `execute_agent_code()`, which
         deep-copies state before running anything and returns the
         original, untouched state on failure (see sandbox.py).
      5. Reconcile: on success, adopt the new state, reset
         `retry_count` to 0, clear `error_traceback`, and record
         `agent_name` as `last_agent`. On failure, keep the state
         returned by the sandbox (the untouched original), increment
         `retry_count`, set `error_traceback`, and still record
         `agent_name` as `last_agent` so the failure is attributable.

    Args:
        state: Current pipeline state before this node runs.
        system_prompt: This node's static instructions (role, allowed
            state_updates keys, task description, THOUGHT/CODE format
            requirement, and any node-specific hard constraints).
        agent_name: Identifier for this node (e.g. "loader_eda"),
            recorded into `state["last_agent"]` and used in log/error
            messages.

    Returns:
        A new `DataScientistState` dict reflecting either a successful
        state_updates merge or an updated retry/error bookkeeping state
        after a failure. Never mutates the `state` argument in place.
    """
    full_prompt = _build_full_prompt(state=state, system_prompt=system_prompt, agent_name=agent_name)

    llm = get_llm(provider="groq", model_name="openai/gpt-oss-120b")
    raw_response = llm.invoke(full_prompt)

    # Thought is log-only from this point forward: it is used for the
    # audit log only and never touches sandbox execution or state.
    response_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
    try:
       thought, code = parse_agent_response(response_text)
       parse_error = None
    except ValueError as e:
        thought = response_text
        code = ""
        parse_error = str(e)

    if parse_error is not None:
        # Malformed/missing THOUGHT or CODE tags is treated identically
        # to a sandbox execution failure: state is untouched, the retry
        # counter advances, and the parse error becomes the traceback
        # fed into the next retry's prompt.
        new_state: DataScientistState = dict(state)  # shallow copy is fine; only top-level fields change
        new_state["retry_count"] = state["retry_count"] + 1
        new_state["error_traceback"] = f"PARSE_ERROR ({agent_name}): {parse_error}"
        new_state["last_agent"] = agent_name
        return new_state

    _log_thought(agent_name=agent_name, thought=thought)

    result = execute_agent_code(code=code, state=state)

    if result["ok"]:
        new_state = dict(result["state"])
        new_state["code_history"] = list(state["code_history"]) + [code]
        new_state["retry_count"] = 0
        new_state["error_traceback"] = None
        new_state["last_agent"] = agent_name
        return new_state

    # Failure: result["state"] is the ORIGINAL, untouched state per the
    # sandbox's contract (see execute_agent_code). Only bookkeeping
    # fields change here.
    new_state = dict(result["state"])
    new_state["retry_count"] = state["retry_count"] + 1
    new_state["error_traceback"] = result["traceback"]
    new_state["last_agent"] = agent_name
    return new_state


def _build_full_prompt(state: DataScientistState, system_prompt: str, agent_name: str) -> str:
    """
    Combine a node's static system_prompt with dynamic state context.

    Always includes schema_summary, target_column, and problem_type.
    On a retry (error_traceback is already set from a prior attempt at
    this same node), also includes that traceback and instructs the
    model to fix its own previous mistake rather than starting fresh.
    """
    context_lines = [
        system_prompt,
        "",
        "--- CURRENT STATE CONTEXT ---",
        f"csv_path: {state.get('csv_path')}",
        f"cleaned_csv_path: {state.get('cleaned_csv_path') or state.get('csv_path')}",
        f"schema_summary:\n{state.get('schema_summary', '')}",
        f"target_column: {state.get('target_column')}",
        f"problem_type: {state.get('problem_type')}",
    ]

    if state.get("error_traceback"):
        context_lines += [
            "",
            "--- PREVIOUS ATTEMPT FAILED ---",
            f"Attempt {state['retry_count']} of {MAX_RETRIES} for agent '{agent_name}' failed with:",
            state["error_traceback"],
            "Fix the bug that caused this traceback. If dropping or transforming columns, use `errors='ignore'` or check column existence (`[c for c in cols if c in df.columns]`). Ensure your response includes valid executable Python code in a ```python ... ``` block that mutates state_updates.",
        ]

    return "\n".join(context_lines)


def _log_thought(agent_name: str, thought: str) -> None:
    """
    Record an agent's THOUGHT section for audit purposes only.

    This is intentionally a stub: wire it to whatever logging/telemetry
    the surrounding project uses. The thought text must never be
    executed and must never be written into state_updates, code_history,
    or error_traceback -- those fields hold only code strings, tracebacks,
    and typed state values.
    """
    print(f"[{agent_name}] THOUGHT: {thought}")


# ---------------------------------------------------------------------------
# Agent node: loader_eda
# ---------------------------------------------------------------------------

LOADER_EDA_SYSTEM_PROMPT = """
You are the loader_eda agent in an AutoML pipeline. You write Python code
that is executed in an isolated sandbox -- you do not answer questions in
prose, and you never see or return an actual dataset.

ALLOWED state_updates KEYS (you may set these and only these):
  - schema_summary   (str)
  - cleaned_csv_path (str)
  - eda_plot_paths   (List[str])

READ-ONLY INPUTS AVAILABLE TO YOUR CODE:
  - csv_path        (str, path to the raw dataset)
  - target_column   (str)
  - problem_type    (str, 'classification' or 'regression')

YOUR TASK:
  1. Read the dataset at csv_path with `df = pd.read_csv(csv_path)`.
  2. Apply conservative cleaning:
     - Drop duplicate rows: `df = df.drop_duplicates()`.
     - Fill missing values with simple imputation (median for numeric, mode for categorical).
     - Save to CSV: `df.to_csv('cleaned_dataset.csv', index=False)`.
     - Set `state_updates['cleaned_csv_path'] = 'cleaned_dataset.csv'`.
  3. Generate and save 2 to 3 clean EDA plots with matplotlib:
     - Plot 1: Target distribution
       `plt.figure(figsize=(8, 5))`
       `df[target_column].value_counts().plot(kind='bar', color='#4F46E5')` (or hist if regression)
       `plt.title(f'Target Distribution: {target_column}')`
       `plt.tight_layout()`
       `plt.savefig('eda_target_dist.png', dpi=120, bbox_inches='tight')`
       `plt.close('all')`
     - Plot 2: Correlation heatmap (numeric columns only)
       `num_df = df.select_dtypes(include=[np.number])`
       `if len(num_df.columns) > 1:`
       `    plt.figure(figsize=(8, 6))`
       `    corr = num_df.corr()`
       `    plt.imshow(corr, cmap='coolwarm', interpolation='none')`
       `    plt.colorbar()`
       `    plt.xticks(range(len(corr)), corr.columns, rotation=45, ha='right')`
       `    plt.yticks(range(len(corr)), corr.columns)`
       `    plt.title('Correlation Heatmap')`
       `    plt.tight_layout()`
       `    plt.savefig('eda_correlation.png', dpi=120, bbox_inches='tight')`
       `    plt.close('all')`
     - Set `state_updates['eda_plot_paths'] = ['eda_target_dist.png', 'eda_correlation.png']`.
  4. Generate a concise profile of the cleaned data and set `state_updates['schema_summary'] = profile_csv_schema('cleaned_dataset.csv')`.

OUTPUT FORMAT:

<thought>
Brief reasoning about what you observed and what cleaning/EDA choices you're making and why. LOG-ONLY: recorded for audit purposes, never executed.
</thought>

```python
# Executable Python code. It must mutate state_updates directly.
```

Do not: return a description of the data instead of code, print results and expect them to be read, or set any state_updates key not listed above.
""".strip()


def loader_eda_node(state: DataScientistState) -> DataScientistState:
    """Profile, clean, and generate EDA plots for the raw dataset."""
    return run_agent_node(state=state, system_prompt=LOADER_EDA_SYSTEM_PROMPT, agent_name="loader_eda")


# ---------------------------------------------------------------------------
# Agent node: feature_engineer
# ---------------------------------------------------------------------------

FEATURE_ENGINEER_SYSTEM_PROMPT = """
You are the feature_engineer agent in an AutoML pipeline. You write
Python code that is executed in an isolated sandbox -- you do not answer
questions in prose, and you never see or return an actual dataset.

ALLOWED state_updates KEYS (you may set these and only these):
  - cleaned_csv_path (str)   # overwrite with the feature-engineered version
  - schema_summary   (str)   # refreshed to reflect the new columns

READ-ONLY INPUTS AVAILABLE TO YOUR CODE:
  - cleaned_csv_path (str, path to the cleaned dataset from loader_eda)
  - target_column    (str)
  - problem_type      (str)

YOUR TASK:
  1. Load the dataset at cleaned_csv_path.
  2. Inspect existing columns. When dropping unused/text/ID columns, ALWAYS use `errors='ignore'`
     (e.g. `df.drop(columns=['PassengerId', 'Name', 'Ticket', 'Cabin'], errors='ignore')`) or
     `[c for c in cols if c in df.columns]` to avoid KeyError if earlier steps already removed them.
  3. Engineer features appropriate to problem_type ('classification' or
     'regression') and the schema (encode categoricals, derive
     interaction/ratio features, transform skewed numeric columns, etc.).
     Never derive a feature from target_column that would leak it.
  4. Save the result -- overwrite cleaned_csv_path or write a new path (e.g. 'cleaned_dataset.csv'),
     either way set state_updates['cleaned_csv_path'] to wherever you saved it.
  5. Regenerate a schema summary reflecting the new columns and set
     state_updates['schema_summary'] = profile_csv_schema(state_updates['cleaned_csv_path']) (or a summary string).

OUTPUT FORMAT:

<thought>
Brief reasoning about which features you're deriving and why, given the schema_summary and problem_type.
</thought>

```python
# Executable Python code. It must mutate state_updates directly.
```

Do not: touch target_column's values, set model_path or metrics (not your keys to write), or skip regenerating schema_summary after changing columns.
""".strip()


def feature_engineer_node(state: DataScientistState) -> DataScientistState:
    """Derive and persist engineered features for the given problem_type."""
    return run_agent_node(state=state, system_prompt=FEATURE_ENGINEER_SYSTEM_PROMPT, agent_name="feature_engineer")


# ---------------------------------------------------------------------------
# Agent node: tuner
# ---------------------------------------------------------------------------

TUNER_SYSTEM_PROMPT = """
You are the tuner agent in an AutoML pipeline. You write Python code
that is executed in an isolated sandbox -- you do not answer questions
in prose, and you never see or return an actual dataset or model object.

ALLOWED state_updates KEYS (you may set these and only these):
  - model_path (str)
  - metrics    (Dict[str, Any])

READ-ONLY INPUTS AVAILABLE TO YOUR CODE:
  - cleaned_csv_path (str)
  - target_column    (str)
  - problem_type      (str)

YOUR TASK:
  1. Load the dataset at cleaned_csv_path, separate X and y (where y is target_column).
     Ensure all feature columns in X are strictly numeric (e.g. `X = pd.get_dummies(X, drop_first=True)` and `X = X.fillna(0)`).
     Split into train/validation sets (e.g. test_size=0.2, random_state=42).
  2. Train a simple baseline model (e.g. RandomForestClassifier or RandomForestRegressor with default params and `n_jobs=-1`)
     and evaluate its validation performance (accuracy/f1 for classification, `r2_score(y_val, y_pred)` or `np.sqrt(mean_squared_error(y_val, y_pred))` for regression).
     NOTE: Do NOT pass `squared=False` to `mean_squared_error` (deprecated in modern sklearn). Use `np.sqrt(mean_squared_error(y_val, y_pred))` instead.
  3. Run an Optuna study to tune hyperparameters (e.g. n_estimators, max_depth, min_samples_split).
     HARD CONSTRAINT: call study.optimize(objective, n_trials=3) -- exactly 3 trials.
     SPEED OPTIMIZATION:
     - Always instantiate models with `n_jobs=-1` (e.g. `RandomForestClassifier(n_estimators=..., max_depth=..., n_jobs=-1, random_state=42)`).
     - If the dataset has > 5,000 rows, use a 5,000-row random sample of the training set during the Optuna search for fast execution.
  4. Refit the champion model on the training set, serialize it using `joblib.dump(best_model, 'champion_model.joblib')`,
     and set `state_updates['model_path'] = 'champion_model.joblib'`.
  5. Set `state_updates['metrics']` to a dict with baseline and tuned scores and best parameters:
     `state_updates['metrics'] = {"baseline": {"val_score": baseline_score}, "tuned": {"val_score": tuned_score}, "best_params": study.best_params}`.

OUTPUT FORMAT:

<thought>
Brief reasoning about model choice and validation metric.
</thought>

```python
# Executable Python code. It must mutate state_updates directly.
# Your Optuna study MUST use n_trials=3, exactly.
```

Do not: run more than 3 Optuna trials under any circumstance, run multiple studies to "get a better result," or set shap_plot_path or any key outside model_path/metrics.
""".strip()


def tuner_node(state: DataScientistState) -> DataScientistState:
    """Train a baseline model, tune with Optuna (n_trials=3, fixed), and serialize the champion model."""
    return run_agent_node(state=state, system_prompt=TUNER_SYSTEM_PROMPT, agent_name="tuner")


# ---------------------------------------------------------------------------
# Agent node: explainer
# ---------------------------------------------------------------------------

EXPLAINER_SYSTEM_PROMPT = """
You are the explainer agent in an AutoML pipeline. You write Python code
that is executed in an isolated sandbox -- you do not answer questions in
prose, and you never see or return raw SHAP values as text.

ALLOWED state_updates KEYS (you may set these and only these):
  - shap_plot_path (str)

READ-ONLY INPUTS AVAILABLE TO YOUR CODE:
  - model_path       (str, if None, use "champion_model.joblib" as fallback)
  - cleaned_csv_path (str)
  - target_column    (str)

YOUR TASK (High-Performance Explainer):
  1. Load the model from model_path with joblib.load(...) and the dataset from cleaned_csv_path with pd.read_csv(...).
  2. Prepare numeric feature sample (drop target_column):
     - `X = df.drop(columns=[target_column], errors='ignore')`
     - `X_numeric = X.select_dtypes(include=[np.number])`
     - Fast subsample (max 50 rows for instant evaluation): `X_sample = X_numeric.sample(n=min(50, len(X_numeric)), random_state=42)`
  3. Compute SHAP values with optimized TreeExplainer:
     - Extract underlying tree estimator if model is wrapped in a pipeline:
       `estimator = model.named_steps.get('classifier', model.named_steps.get('regressor', model)) if hasattr(model, 'named_steps') else model`
     - Try fast TreeExplainer first:
       `try:`
       `    explainer = shap.TreeExplainer(estimator)`
       `    shap_values = explainer.shap_values(X_sample, check_additivity=False)`
       `except Exception:`
       `    explainer = shap.Explainer(estimator, shap.kmeans(X_sample, min(10, len(X_sample))))`
       `    shap_values = explainer(X_sample).values`
     - If binary classification where `shap_values` is a list of 2 arrays, select the positive class: `if isinstance(shap_values, list) and len(shap_values) == 2: shap_values = shap_values[1]`
     - If `shap_values` is an Explanation object (has `.values`), use `shap_values = shap_values.values`.
  4. Generate and save a clean summary plot (top 15 features):
     `plt.figure(figsize=(10, 6))`
     `shap.summary_plot(shap_values, X_sample, max_display=15, show=False)`
     `plt.tight_layout()`
     `plt.savefig('shap_summary_plot.png', dpi=100, bbox_inches='tight')`
     `plt.close('all')`
  5. Set `state_updates['shap_plot_path'] = 'shap_summary_plot.png'`.

OUTPUT FORMAT:

<thought>
Brief reasoning about explainer choice. LOG-ONLY: recorded for audit purposes, never executed.
</thought>

```python
# Executable Python code. It must mutate state_updates directly.
# Background sample MUST be capped at 50 rows for high speed.
```

Do not: compute SHAP values on the full dataset, call plt.show(), or return the raw shap_values array in state_updates (only the plot path is a valid output).
""".strip()


def explainer_node(state: DataScientistState) -> DataScientistState:
    """Compute a SHAP global feature-importance summary (<=100-row sample) and persist the plot."""
    return run_agent_node(state=state, system_prompt=EXPLAINER_SYSTEM_PROMPT, agent_name="explainer")