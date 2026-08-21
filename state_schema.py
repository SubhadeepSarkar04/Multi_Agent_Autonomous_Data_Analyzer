"""
state_schema.py
----------------
Defines the shared, mutable state container that flows through every node of
the LangGraph StateGraph. This is the single source of truth passed between
agents. Agents never return free-form text as their "output" -- they mutate
this dict (via generated Python code executed in the sandbox) and the
mutated dict IS the node's output.

NOTE ON COMPATIBILITY:
This revision renames/restructures several keys relative to the previous
version of this schema:
    task_type       -> problem_type
    schema_profile  -> schema_summary
    clean_csv_path  -> cleaned_csv_path
    plots           -> eda_plot_paths (+ new dedicated shap_plot_path)
    current_retry   -> retry_count
    current_node    -> last_agent
Any other module that reads or writes state by key (agents.py, graph.py,
sandbox.py, main.py) must be updated to use these exact names, or state
lookups will raise KeyError / silently diverge from this schema.
"""

from typing import TypedDict, Optional, List, Dict, Any


class DataScientistState(TypedDict):
    # --- Dataset pointers ---------------------------------------------------
    csv_path: str                      # Path to the user's original raw dataset
    target_column: str                 # Column name the model should predict
    cleaned_csv_path: Optional[str]    # Path to the cleaned dataset written by the EDA agent

    # --- Task metadata -------------------------------------------------------
    problem_type: str                  # "classification" | "regression"
    schema_summary: str                # Human-readable schema profile injected into prompts

    # --- Artifacts produced by the pipeline -----------------------------------
    eda_plot_paths: List[str]          # File paths of every EDA/visualization PNG generated so far
    model_path: Optional[str]          # Path to the serialized champion model (joblib)
    shap_plot_path: Optional[str]      # Path to the SHAP global feature-importance summary PNG
    metrics: Dict[str, Any]            # {"baseline": {...}, "tuned": {...}, "best_hyperparameters": {...}}

    # --- Audit / execution trail ----------------------------------------------
    code_history: List[str]            # Every successfully executed code string, in order
    retry_count: int                   # Self-correction attempts made on the CURRENT node
    error_traceback: Optional[str]     # Full traceback text from the last failed execution
    last_agent: Optional[str]          # Name of the agent/node that last executed


# Hard cap on self-correction cycles per node before the graph gives up and
# routes to the terminal failure sink. Shared by graph.py and agents.py.
MAX_RETRIES = 3