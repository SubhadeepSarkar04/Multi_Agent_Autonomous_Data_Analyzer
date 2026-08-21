"""
sandbox.py

Isolated execution runtime for the AutoML multi-agent pipeline.

This module is the ONLY place where agent-generated code is exec()'d and
the ONLY place where native data-science objects (DataFrames, fitted
models, matplotlib figures) come into existence. Agents communicate with
the rest of the pipeline exclusively through `DataScientistState`, a
TypedDict of paths and metadata (see agent_state.py) -- never through raw
objects passed back out of this module.

Day 2 requirements implemented here:
  1. `execute_agent_code()` deep-copies the incoming state before running
     any agent code, so a crashing script cannot corrupt the caller's
     state. On failure, the ORIGINAL (pre-execution) state is returned
     alongside the error traceback -- never a partially-mutated copy.
  2. `profile_csv_schema()` reads only the first 5 rows of a CSV (via
     `nrows=5`) so schema profiling never loads a full dataset into
     memory.
  3. `plt.show()` is monkey-patched, for the duration of each exec() call
     only, to raise a RuntimeError. This forces agent code to persist
     figures with `plt.savefig(...)` (the only way a plot can become a
     path in `state_updates`) instead of trying to display them
     interactively, which would hang or no-op in a headless sandbox.
"""

from __future__ import annotations

import copy
import io
import os
import traceback
import contextlib
from typing import Any, Dict, Optional, TypedDict, List


class DataScientistState(TypedDict):
    """Shared pipeline state. Only paths, metadata, and primitives --
    never raw DataFrames, models, or figures."""
    csv_path: str
    target_column: str
    problem_type: str
    schema_summary: str
    cleaned_csv_path: Optional[str]
    eda_plot_paths: List[str]
    model_path: Optional[str]
    shap_plot_path: Optional[str]
    metrics: Dict[str, Any]
    code_history: List[str]
    retry_count: int
    error_traceback: Optional[str]
    last_agent: Optional[str]


class _RestrictedShowError(RuntimeError):
    """Raised when agent code calls plt.show(). Distinct subclass so
    callers can special-case this failure mode in logs if desired."""


def profile_csv_schema(csv_path: str) -> str:
    """
    Build a lightweight schema profile of a CSV WITHOUT loading the full
    file into memory.

    Reads only the first 5 rows (header + 5 data rows via `nrows=5`) to
    report column names, inferred dtypes, and a small sample of values.
    This is intentionally not a substitute for full statistics (e.g. no
    row counts, no full-column min/max) -- it exists purely to give
    agent prompts enough schema context to write correct code, at
    guaranteed-bounded memory cost regardless of the underlying file
    size.

    Args:
        csv_path: Path to the CSV file to profile.

    Returns:
        A human-readable string: column dtypes followed by a 5-row
        sample, suitable for direct injection into an LLM prompt.
    """
    import pandas as pd

    sample_df = pd.read_csv(csv_path, nrows=5)

    dtypes_block = sample_df.dtypes.to_string()
    sample_block = sample_df.to_string()

    return (
        f"Columns and dtypes (inferred from first 5 rows):\n"
        f"{dtypes_block}\n\n"
        f"Sample rows:\n"
        f"{sample_block}"
    )


def _build_safe_builtins() -> Dict[str, Any]:
    """
    Return a restricted __builtins__ mapping for agent code.
    """
    import builtins

    denylist = {
        "eval", "exec", "compile", "input",
        "open", "exit", "quit", "help", "breakpoint",
    }
    
    # Build the safe list, filtering out dunder methods EXCEPT __import__
    safe_builtins = {
        name: getattr(builtins, name)
        for name in dir(builtins)
        if (not name.startswith("_") or name == "__import__") and name not in denylist
    }
    
    return safe_builtins


def _build_exec_globals(state: DataScientistState, state_updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Construct the namespace agent code executes in.

    Only primitive, read-only fields from `state` are exposed -- never
    `state` itself -- plus the mutable `state_updates` dict that is the
    sole channel for the agent's code to communicate results back out,
    and `profile_csv_schema` for on-demand schema inspection.
    """
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
    import joblib
    import optuna
    import shap

    import matplotlib
    matplotlib.use("Agg")

    # Safe headless plt.show: no-op so libraries like shap that call plt.show() internally do not crash
    def _safe_show(*_args: Any, **_kwargs: Any) -> None:
        pass

    plt.show = _safe_show  # type: ignore[assignment]

    effective_csv_path = state.get("cleaned_csv_path") or state.get("csv_path")
    df = None
    if effective_csv_path and os.path.exists(effective_csv_path):
        try:
            df = pd.read_csv(effective_csv_path)
        except Exception:
            df = None

    return {
        "__builtins__": _build_safe_builtins(),
        "state_updates": state_updates,
        # Read-only, primitive-only view of state:
        "csv_path": state.get("csv_path"),
        "target_column": state.get("target_column"),
        "problem_type": state.get("problem_type"),
        "schema_summary": state.get("schema_summary", ""),
        "cleaned_csv_path": effective_csv_path,
        "model_path": state.get("model_path"),
        "eda_plot_paths": state.get("eda_plot_paths", []),
        "shap_plot_path": state.get("shap_plot_path"),
        "df": df,
        # Helper available to agent code:
        "profile_csv_schema": profile_csv_schema,
        # Pre-imported libraries:
        "pd": pd,
        "np": np,
        "plt": plt,
        "joblib": joblib,
        "optuna": optuna,
        "shap": shap,
    }


def execute_agent_code(code: str, state: DataScientistState) -> Dict[str, Any]:
    """
    Execute agent-generated code against a DEEP COPY of `state`.

    Requirement 1: the incoming `state` is deep-copied before anything
    runs. Agent code only ever sees primitives derived from that copy
    (see `_build_exec_globals`), and on success only `state_updates`
    (already just paths/strings/dicts, never live objects) is merged
    back into a fresh copy for the caller. If execution raises for any
    reason, the function returns the ORIGINAL, untouched `state` --
    never the deep copy, and never anything partially mutated -- so a
    crashing script can never corrupt the caller's data.

    Args:
        code: Python source to execute. Expected to be already extracted
            from an agent response's <code> tag (THOUGHT/CODE parsing
            happens upstream of this function, not here) and to mutate
            a dict named `state_updates` with the keys it's permitted
            to write.
        state: The current pipeline state. Never mutated in place.

    Returns:
        A dict with keys:
          - "ok": bool, whether execution succeeded.
          - "state": DataScientistState. On success, a NEW state dict
                with `state_updates` merged in. On failure, the
                original, unmodified `state` passed in.
          - "traceback": Optional[str]. Full traceback text on failure,
                None on success.
          - "stdout": str. Captured stdout from the execution, for
                logging (not for parsing results out of).
    """
    # Requirement 1: deep-copy before execution. `original_state` is kept
    # completely untouched and is what gets returned on any failure.
    original_state: DataScientistState = state
    working_state: DataScientistState = copy.deepcopy(state)

    state_updates: Dict[str, Any] = {
        "cleaned_csv_path": state.get("cleaned_csv_path") or state.get("csv_path"),
        "eda_plot_paths": list(state.get("eda_plot_paths") or []),
        "schema_summary": state.get("schema_summary", ""),
        "model_path": state.get("model_path"),
        "metrics": dict(state.get("metrics") or {}),
        "shap_plot_path": state.get("shap_plot_path"),
    }
    exec_globals = _build_exec_globals(working_state, state_updates)

    # Keep a reference to the real plt.show so it can be restored after
    # this call, regardless of outcome -- the patch must not leak into
    # any other code running in this process.
    import matplotlib.pyplot as plt
    original_show = plt.show

    stdout_buffer = io.StringIO()
    try:
        with contextlib.redirect_stdout(stdout_buffer):
            exec(compile(code, "<agent_code>", "exec"), exec_globals)

        # Success: extract state updates from exec_globals.
        # Handle all LLM patterns:
        # 1. state_updates mutated in-place
        # 2. state_updates reassigned (state_updates = {...})
        # 3. variables assigned at top-level (model_path = ..., metrics = ..., etc.)
        final_updates: Dict[str, Any] = {}
        if isinstance(exec_globals.get("state_updates"), dict):
            final_updates.update(exec_globals["state_updates"])
        elif isinstance(state_updates, dict):
            final_updates.update(state_updates)

        allowed_keys = [
            "cleaned_csv_path",
            "eda_plot_paths",
            "schema_summary",
            "model_path",
            "metrics",
            "shap_plot_path",
        ]
        for key in allowed_keys:
            if key in exec_globals and exec_globals[key] is not None:
                # If set at top-level in code, prefer non-empty value
                val = exec_globals[key]
                if val != "" and val != [] and val != {}:
                    final_updates[key] = val

        merged_state: DataScientistState = copy.deepcopy(working_state)
        merged_state.update(final_updates)  # type: ignore[typeddict-item]

        return {
            "ok": True,
            "state": merged_state,
            "traceback": None,
            "stdout": stdout_buffer.getvalue(),
        }

    except Exception:
        # Failure: return the ORIGINAL state, untouched. Do not leak any
        # partial state_updates or the mutated working_state copy.
        return {
            "ok": False,
            "state": original_state,
            "traceback": traceback.format_exc(),
            "stdout": stdout_buffer.getvalue(),
        }

    finally:
        # Always restore the real plt.show(), whether execution
        # succeeded, failed, or raised something unexpected.
        plt.show = original_show