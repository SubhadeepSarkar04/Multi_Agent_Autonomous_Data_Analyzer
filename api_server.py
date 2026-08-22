"""
api_server.py

FastAPI bridge that exposes the LangGraph AutoML pipeline over HTTP.

Streamlit cannot run the pipeline directly inside its script because
Streamlit re-executes the entire script on every user interaction.
This server runs the pipeline in a background thread, persists live
progress to the SQLite registry (via database.py), and lets Streamlit
poll for updates every 2 seconds via GET /runs/{run_id}/status.

Endpoints
---------
    POST /run                               Upload CSV + config; create DB row;
                                            start pipeline in background thread;
                                            return run_id immediately.

    GET  /runs                              List all past runs (newest first).
                                            Powers the Streamlit Past Runs sidebar.

    GET  /runs/{run_id}/status              Return the current DB row for one run.
                                            Streamlit polls this every 2 s.

    GET  /runs/{run_id}/artifacts/{filename} Serve any file written to
                                            data/runs/{run_id}/ (PNGs, CSVs).

    GET  /runs/{run_id}/model               Binary download of the .joblib model.
"""

from __future__ import annotations

import threading
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

import database
from graph import app as langgraph_app
from state_schema import DataScientistState

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

api = FastAPI(
    title="Autonomous Data Scientist API",
    description="HTTP bridge for the LangGraph AutoML multi-agent pipeline.",
    version="1.0.0",
)

# Allow the Streamlit dev server (localhost:8501) to call the API.
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB and data/ directories on startup.
database.init_db()


import shutil

# ---------------------------------------------------------------------------
# Artifact Isolation & Sync Helper
# ---------------------------------------------------------------------------

def _sync_artifacts_to_run_dir(run_id: str, state: dict[str, Any]) -> None:
    """
    Ensure all artifact files generated or referenced in state are synced
    to the run's isolated folder at data/runs/{run_id}/.
    """
    run_dir = database.get_run_dir(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    root_dir = Path(__file__).parent

    # 1. EDA plot paths
    eda_paths = state.get("eda_plot_paths") or []
    if isinstance(eda_paths, list):
        for p in eda_paths:
            if not p:
                continue
            p_name = Path(p).name
            dest_file = run_dir / p_name
            # Check source at given path or in root directory
            if Path(p).is_file() and Path(p).resolve() != dest_file.resolve():
                try:
                    shutil.copy2(Path(p), dest_file)
                except Exception:
                    pass
            elif (root_dir / p_name).is_file() and not dest_file.exists():
                try:
                    shutil.copy2(root_dir / p_name, dest_file)
                except Exception:
                    pass

    # Check common default EDA filenames in root if not present
    for default_eda in ("eda_target_dist.png", "eda_correlation.png", "eda_missingness.png", "eda_feature_dist.png"):
        dest_file = run_dir / default_eda
        if not dest_file.exists() and (root_dir / default_eda).is_file():
            try:
                shutil.copy2(root_dir / default_eda, dest_file)
            except Exception:
                pass

    # 2. SHAP plot path
    shap_path = state.get("shap_plot_path")
    if shap_path:
        s_name = Path(shap_path).name
        dest_file = run_dir / s_name
        if Path(shap_path).is_file() and Path(shap_path).resolve() != dest_file.resolve():
            try:
                shutil.copy2(Path(shap_path), dest_file)
            except Exception:
                pass
        elif (root_dir / s_name).is_file() and not dest_file.exists():
            try:
                shutil.copy2(root_dir / s_name, dest_file)
            except Exception:
                pass
    elif (root_dir / "shap_summary_plot.png").is_file() and not (run_dir / "shap_summary_plot.png").exists():
        try:
            shutil.copy2(root_dir / "shap_summary_plot.png", run_dir / "shap_summary_plot.png")
        except Exception:
            pass

    # 3. Cleaned CSV path
    cleaned_csv = state.get("cleaned_csv_path")
    if cleaned_csv:
        c_name = Path(cleaned_csv).name
        dest_file = run_dir / c_name
        if Path(cleaned_csv).is_file() and Path(cleaned_csv).resolve() != dest_file.resolve():
            try:
                shutil.copy2(Path(cleaned_csv), dest_file)
            except Exception:
                pass
        elif (root_dir / c_name).is_file() and not dest_file.exists():
            try:
                shutil.copy2(root_dir / c_name, dest_file)
            except Exception:
                pass

    # 4. Model path
    model_p = state.get("model_path")
    if model_p:
        m_name = Path(model_p).name
        dest_file = run_dir / m_name
        if Path(model_p).is_file() and Path(model_p).resolve() != dest_file.resolve():
            try:
                shutil.copy2(Path(model_p), dest_file)
            except Exception:
                pass
        elif (root_dir / m_name).is_file() and not dest_file.exists():
            try:
                shutil.copy2(root_dir / m_name, dest_file)
            except Exception:
                pass
    elif (root_dir / "champion_model.joblib").is_file() and not (run_dir / "champion_model.joblib").exists():
        try:
            shutil.copy2(root_dir / "champion_model.joblib", run_dir / "champion_model.joblib")
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Background pipeline runner
# ---------------------------------------------------------------------------

def _run_pipeline(run_id: str, initial_state: DataScientistState) -> None:
    """
    Execute the LangGraph pipeline in a background thread.

    Uses app.stream() so the DB is updated after each node completes,
    giving Streamlit / React UI a live view of which agent is currently running.

    On any unhandled exception the run is marked 'failed' in the DB so
    the UI does not get stuck in a perpetual 'running' state.
    """
    try:
        database.update_run(run_id, status="running")

        for node_output in langgraph_app.stream(initial_state):
            # node_output is {node_name: state_dict} for each completed node.
            for node_name, state in node_output.items():
                if node_name == "__end__":
                    continue

                # Sync any newly produced files to run directory
                _sync_artifacts_to_run_dir(run_id, state)

                failed = state.get("error_traceback") is not None
                database.update_run(
                    run_id,
                    last_agent=state.get("last_agent", node_name),
                    retry_count=state.get("retry_count", 0),
                    metrics=state.get("metrics"),
                    cleaned_csv_path=state.get("cleaned_csv_path"),
                    eda_plot_paths=state.get("eda_plot_paths"),
                    shap_plot_path=state.get("shap_plot_path"),
                    model_path=state.get("model_path"),
                    error_traceback=state.get("error_traceback"),
                    # Mark as failed immediately if this node exhausted retries;
                    # the graph will route to system_failure_sink next.
                    status="failed" if failed else "running",
                )

        # Final state after the stream ends.
        final_row = database.get_run(run_id)
        if final_row:
            _sync_artifacts_to_run_dir(run_id, final_row)
            if final_row.get("status") != "failed":
                database.update_run(run_id, status="done")

    except Exception as exc:  # pylint: disable=broad-except
        database.update_run(
            run_id,
            status="failed",
            error_traceback=str(exc),
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@api.post("/run", summary="Upload a CSV and start the pipeline")
async def start_run(
    file: UploadFile = File(..., description="Raw CSV dataset"),
    target_column: str = Form(..., description="Name of the target column"),
    problem_type: str = Form(..., description="'classification' or 'regression'"),
) -> JSONResponse:
    """
    Accept a CSV upload, create a run record, and start the pipeline.

    Returns immediately with the run_id so the client can begin polling
    /runs/{run_id}/status without waiting for the pipeline to finish.
    """
    if problem_type not in ("classification", "regression"):
        raise HTTPException(
            status_code=422,
            detail="problem_type must be 'classification' or 'regression'.",
        )

    run_id = str(uuid.uuid4())

    # Save the uploaded CSV into the run's isolated artifact directory.
    run_dir: Path = database.get_run_dir(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    csv_path = run_dir / "upload.csv"
    csv_path.write_bytes(await file.read())

    # Register the run in the DB.
    database.create_run(
        run_id=run_id,
        csv_filename=file.filename or "upload.csv",
        target_column=target_column,
        problem_type=problem_type,
    )

    # Build the initial pipeline state.
    initial_state: DataScientistState = {
        "csv_path": str(csv_path),
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

    # Fire and forget — pipeline runs in the background.
    thread = threading.Thread(
        target=_run_pipeline,
        args=(run_id, initial_state),
        daemon=True,
        name=f"pipeline-{run_id[:8]}",
    )
    thread.start()

    return JSONResponse(
        status_code=202,
        content={"run_id": run_id, "status": "pending"},
    )


@api.get("/runs", summary="List all past runs")
def list_runs() -> list[dict[str, Any]]:
    """
    Return all run rows from the DB, newest first.

    Used by the Streamlit Past Runs sidebar to show run history.
    """
    return database.list_runs()


@api.get("/runs/{run_id}/status", summary="Get the current status of a run")
def get_status(run_id: str) -> dict[str, Any]:
    """
    Return the current DB row for a run.

    Streamlit calls this endpoint every 2 seconds while the pipeline is
    running to update the progress stepper and live log.
    """
    row = database.get_run(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return row


@api.get(
    "/runs/{run_id}/artifacts/{filename}",
    summary="Serve a run artifact (PNG, CSV, etc.)",
)
def get_artifact(run_id: str, filename: str) -> FileResponse:
    """
    Serve any file written to data/runs/{run_id}/ or fallback locations.
    """
    clean_name = Path(filename).name
    run_dir = database.get_run_dir(run_id)
    artifact_path = run_dir / clean_name
    media_type = "image/png" if clean_name.lower().endswith(".png") else None

    # 1. Check directly in run directory
    if artifact_path.is_file():
        return FileResponse(path=str(artifact_path), filename=clean_name, media_type=media_type)

    # 2. Check project root directory fallback
    root_path = Path(__file__).parent / clean_name
    if root_path.is_file():
        try:
            shutil.copy2(root_path, artifact_path)
        except Exception:
            pass
        return FileResponse(path=str(root_path), filename=clean_name, media_type=media_type)

    # 3. Check DB row for matching file references
    row = database.get_run(run_id)
    if row:
        for key in ("eda_plot_paths", "shap_plot_path", "cleaned_csv_path", "model_path"):
            val = row.get(key)
            candidates: list[str] = []
            if isinstance(val, list):
                candidates.extend(val)
            elif isinstance(val, str):
                candidates.append(val)

            for cand in candidates:
                cand_path = Path(cand)
                if cand_path.name == clean_name and cand_path.is_file():
                    try:
                        shutil.copy2(cand_path, artifact_path)
                    except Exception:
                        pass
                    return FileResponse(path=str(cand_path), filename=clean_name, media_type=media_type)

    raise HTTPException(
        status_code=404,
        detail=f"Artifact '{clean_name}' not found for run '{run_id}'.",
    )


@api.get("/runs/{run_id}/model", summary="Download the champion .joblib model")
def get_model(run_id: str) -> FileResponse:
    """
    Binary download of the serialised champion model.
    """
    row = database.get_run(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    run_dir = database.get_run_dir(run_id)
    candidates: list[Path] = [
        run_dir / "champion_model.joblib",
    ]

    model_path = row.get("model_path")
    if model_path:
        candidates.append(Path(model_path))
        candidates.append(run_dir / Path(model_path).name)
        candidates.append(Path(__file__).parent / Path(model_path).name)

    candidates.append(Path(__file__).parent / "champion_model.joblib")

    for path in candidates:
        if path.is_file():
            return FileResponse(
                path=str(path),
                filename="champion_model.joblib",
                media_type="application/octet-stream",
            )

    raise HTTPException(
        status_code=404,
        detail="Model not available yet for this run.",
    )

