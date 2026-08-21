"""
main.py

CLI entry point for the AutoML multi-agent pipeline.

Usage:
    python main.py --csv_path /path/to/data.csv --target price --type regression

Builds the initial DataScientistState from CLI arguments, runs the
compiled LangGraph app (loader -> feature_engineer -> tuner -> explainer,
with per-node self-correction and a shared system_failure_sink terminal
node), and reports the final metrics and artifact paths.

Every run is persisted to the SQLite registry (data/runs.db) via
database.py, so CLI-triggered runs appear alongside API-triggered runs
in the Streamlit Past Runs sidebar.
"""

from __future__ import annotations

import argparse
import pprint
import uuid

import database
from graph import app
from state_schema import DataScientistState


def parse_args() -> argparse.Namespace:
    """
    Define and parse the CLI arguments for a pipeline run.

    Returns:
        Namespace with csv_path, target, and type, all required.
    """
    parser = argparse.ArgumentParser(
        description="Run the AutoML multi-agent pipeline on a CSV dataset.",
    )
    parser.add_argument(
        "--csv_path",
        type=str,
        required=True,
        help="Path to the raw dataset to analyze.",
    )
    parser.add_argument(
        "--target",
        type=str,
        required=True,
        help="Name of the target column to predict.",
    )
    parser.add_argument(
        "--type",
        type=str,
        required=True,
        choices=["classification", "regression"],
        help="Problem type: 'classification' or 'regression'.",
    )
    return parser.parse_args()


def build_initial_state(csv_path: str, target_column: str, problem_type: str) -> DataScientistState:
    """
    Construct the starting DataScientistState for a fresh pipeline run.

    Only csv_path, target_column, and problem_type come from the caller;
    every other field starts at its empty/default value and is populated
    by agent nodes as the graph executes. retry_count and error_traceback
    in particular must start at 0 / None so the first node's first
    attempt is never mistaken for a retry.

    Args:
        csv_path: Path to the raw dataset to analyze.
        target_column: Name of the target column to predict.
        problem_type: 'classification' or 'regression'.

    Returns:
        A fully-populated DataScientistState ready to pass to app.invoke().
    """
    initial_state: DataScientistState = {
        "csv_path": csv_path,
        "target_column": target_column,
        "problem_type": problem_type,
        "schema_summary": "",
        "cleaned_csv_path": None,
        "eda_plot_paths": [],
        "model_path": None,
        "shap_plot_path": None,
        "metrics": {},
        "code_history": [],
        "retry_count": 0,
        "error_traceback": None,
        "last_agent": None,
    }
    return initial_state


def report_result(final_state: DataScientistState) -> None:
    """
    Print a human-readable summary of a completed (or failed) run.

    A run that ended at system_failure_sink is distinguished from a
    successful run by the presence of error_traceback in final_state --
    the graph does not raise on failure, it returns a final state whose
    error_traceback/last_agent describe what went wrong.
    """
    if final_state.get("error_traceback") is not None:
        print(f"Pipeline FAILED at node '{final_state.get('last_agent')}' "
              f"after {final_state.get('retry_count')} retries.")
        print("Final traceback:")
        print(final_state["error_traceback"])
        return

    print("Pipeline completed successfully.")
    print(f"Last agent to run: {final_state.get('last_agent')}")

    print("\nMetrics:")
    pprint.pprint(final_state.get("metrics", {}))

    print("\nSaved artifacts:")
    pprint.pprint({
        "cleaned_csv_path": final_state.get("cleaned_csv_path"),
        "eda_plot_paths": final_state.get("eda_plot_paths"),
        "model_path": final_state.get("model_path"),
        "shap_plot_path": final_state.get("shap_plot_path"),
    })


def main() -> None:
    """Parse CLI args, run the pipeline, persist the result, and report the outcome."""
    args = parse_args()

    # Initialise the DB (idempotent — safe to call every time).
    database.init_db()

    # Assign a unique ID to this run before execution starts so the row
    # exists in the registry even if the pipeline crashes partway through.
    run_id = str(uuid.uuid4())
    csv_filename = args.csv_path.split("/")[-1].split("\\")[-1]

    database.create_run(
        run_id=run_id,
        csv_filename=csv_filename,
        target_column=args.target,
        problem_type=args.type,
    )
    database.update_run(run_id, status="running")

    initial_state = build_initial_state(
        csv_path=args.csv_path,
        target_column=args.target,
        problem_type=args.type,
    )

    final_state = app.invoke(initial_state)

    # Persist the outcome — success or failure — into the registry.
    failed = final_state.get("error_traceback") is not None
    database.update_run(
        run_id,
        status="failed" if failed else "done",
        last_agent=final_state.get("last_agent"),
        retry_count=final_state.get("retry_count", 0),
        metrics=final_state.get("metrics"),
        cleaned_csv_path=final_state.get("cleaned_csv_path"),
        eda_plot_paths=final_state.get("eda_plot_paths"),
        shap_plot_path=final_state.get("shap_plot_path"),
        model_path=final_state.get("model_path"),
        error_traceback=final_state.get("error_traceback"),
    )

    print(f"\n[DB] Run saved → run_id: {run_id}")
    report_result(final_state)


if __name__ == "__main__":
    main()