"""
api/views.py

Django views that expose the LangGraph AutoML pipeline over HTTP.
Preserves full endpoint and schema compatibility with the previous FastAPI server.
"""

from __future__ import annotations

import json
import os
import shutil
import threading
import uuid
from pathlib import Path
from typing import Any

from django.http import FileResponse, HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

import database
from graph import app as langgraph_app
from sandbox import execute_agent_code
from state_schema import DataScientistState

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
CUSTOM_CODE_ENABLED = os.getenv("ENABLE_CUSTOM_CODE_EXECUTION", "0") == "1"


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
    root_dir = Path(__file__).resolve().parent.parent

    # 1. EDA plot paths
    eda_paths = state.get("eda_plot_paths") or []
    if isinstance(eda_paths, list):
        for p in eda_paths:
            if not p:
                continue
            p_name = Path(p).name
            dest_file = run_dir / p_name
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
# Execution Controller for Pause / Resume / Rerun
# ---------------------------------------------------------------------------

class RunController:
    """Thread-safe execution controller for managing run lifecycle."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.pause_event = threading.Event()
        self.pause_event.set()  # Set means NOT paused (running)
        self.cancel_event = threading.Event()
        self.latest_state: dict[str, Any] = {}

    def pause(self) -> None:
        self.pause_event.clear()

    def resume(self) -> None:
        self.pause_event.set()

    def cancel(self) -> None:
        self.cancel_event.set()
        self.pause_event.set()  # Unblock if paused so the thread can terminate

    def is_paused(self) -> bool:
        return not self.pause_event.is_set()

    def is_cancelled(self) -> bool:
        return self.cancel_event.is_set()

    def wait_if_paused(self) -> bool:
        """
        Block while paused. Returns True if execution can continue,
        or False if the run was cancelled.
        """
        while not self.pause_event.is_set():
            if self.cancel_event.is_set():
                return False
            self.pause_event.wait(timeout=0.25)
        return not self.cancel_event.is_set()


_RUN_CONTROLLERS: dict[str, RunController] = {}
_CONTROLLERS_LOCK = threading.Lock()
_PIPELINE_EXECUTION_LOCK = threading.Lock()


def get_or_create_controller(run_id: str) -> RunController:
    with _CONTROLLERS_LOCK:
        if run_id not in _RUN_CONTROLLERS:
            _RUN_CONTROLLERS[run_id] = RunController(run_id)
        return _RUN_CONTROLLERS[run_id]


# ---------------------------------------------------------------------------
# Background pipeline runner
# ---------------------------------------------------------------------------

def _run_pipeline_exclusive(run_id: str, initial_state: DataScientistState) -> None:
    """
    Execute the LangGraph pipeline in a background thread with pause/resume support.
    """
    controller = get_or_create_controller(run_id)
    controller.resume()
    controller.cancel_event.clear()

    try:
        database.update_run(run_id, status="running", error_traceback=None)

        for node_output in langgraph_app.stream(initial_state):
            # Check pause / cancel before proceeding to process node output
            if not controller.wait_if_paused():
                database.update_run(run_id, status="failed", error_traceback="Run stopped by user.")
                return

            for node_name, state in node_output.items():
                if node_name == "__end__":
                    continue

                controller.latest_state = state
                _sync_artifacts_to_run_dir(run_id, state)

                failed = state.get("error_traceback") is not None
                curr_status = "failed" if failed else ("paused" if controller.is_paused() else "running")

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
                    code_history=state.get("code_history"),
                    status=curr_status,
                )

                if not controller.wait_if_paused():
                    database.update_run(run_id, status="failed", error_traceback="Run stopped by user.")
                    return

        if not controller.wait_if_paused():
            database.update_run(run_id, status="failed", error_traceback="Run stopped by user.")
            return

        final_row = database.get_run(run_id)
        if final_row:
            _sync_artifacts_to_run_dir(run_id, final_row)
            if final_row.get("status") not in ("failed", "cancelled"):
                database.update_run(run_id, status="done")

    except Exception as exc:  # pylint: disable=broad-except
        database.update_run(
            run_id,
            status="failed",
            error_traceback=str(exc),
        )


def _run_pipeline(run_id: str, initial_state: DataScientistState) -> None:
    """Run one pipeline at a time until agent artifact writes are fully isolated."""
    with _PIPELINE_EXECUTION_LOCK:
        controller = get_or_create_controller(run_id)
        if controller.is_cancelled():
            database.update_run(run_id, status="cancelled", error_traceback="Run cancelled before execution started.")
            return
        _run_pipeline_exclusive(run_id, initial_state)


# ---------------------------------------------------------------------------
# API Views
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def start_run(request: HttpRequest) -> JsonResponse:
    """
    Accept a CSV upload, create a run record, and start the pipeline in a background thread.
    Returns HTTP 202 Accepted with {"run_id": ..., "status": "pending"}.
    """
    problem_type = request.POST.get("problem_type", "").strip()
    target_column = request.POST.get("target_column", "").strip()
    uploaded_file = request.FILES.get("file")

    if problem_type not in ("classification", "regression"):
        return JsonResponse(
            {"detail": "problem_type must be 'classification' or 'regression'."},
            status=422,
        )

    if not target_column:
        return JsonResponse(
            {"detail": "target_column must not be empty."},
            status=422,
        )

    if not uploaded_file or not uploaded_file.name or Path(uploaded_file.name).suffix.lower() != ".csv":
        return JsonResponse(
            {"detail": "Only .csv uploads are supported."},
            status=415,
        )

    if uploaded_file.size > MAX_UPLOAD_BYTES:
        return JsonResponse(
            {"detail": f"Upload exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."},
            status=413,
        )

    run_id = str(uuid.uuid4())
    run_dir = database.get_run_dir(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    csv_path = run_dir / "upload.csv"

    try:
        with csv_path.open("wb") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
    except Exception as exc:
        csv_path.unlink(missing_ok=True)
        return JsonResponse({"detail": f"Failed to save file: {str(exc)}"}, status=500)

    # Register the run in SQLite DB
    database.create_run(
        run_id=run_id,
        csv_filename=uploaded_file.name or "upload.csv",
        target_column=target_column,
        problem_type=problem_type,
    )

    # Initial pipeline state
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

    # Fire background pipeline thread
    thread = threading.Thread(
        target=_run_pipeline,
        args=(run_id, initial_state),
        daemon=True,
        name=f"pipeline-{run_id[:8]}",
    )
    thread.start()

    return JsonResponse(
        {"run_id": run_id, "status": "pending"},
        status=202,
    )


@csrf_exempt
@require_http_methods(["GET", "DELETE"])
def runs_collection(request: HttpRequest) -> JsonResponse:
    """
    GET /runs: List all past runs (newest first).
    DELETE /runs: Delete all runs and wipe artifact directories.
    """
    if request.method == "GET":
        return JsonResponse(database.list_runs(), safe=False)

    # DELETE all runs
    with _CONTROLLERS_LOCK:
        for ctrl in _RUN_CONTROLLERS.values():
            ctrl.cancel()
        _RUN_CONTROLLERS.clear()

    count = database.delete_all_runs()
    return JsonResponse({
        "ok": True,
        "count": count,
        "message": f"Cleared all analysis history ({count} runs removed).",
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_status(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    GET /runs/{run_id}/status: Return the current DB row for one run.
    """
    row = database.get_run(run_id)
    if row is None:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)
    return JsonResponse(row)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_single_run(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    DELETE /runs/{run_id}: Delete a single run from the registry and remove its artifacts.
    """
    row = database.get_run(run_id)
    if not row:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    controller = get_or_create_controller(run_id)
    controller.cancel()

    with _CONTROLLERS_LOCK:
        _RUN_CONTROLLERS.pop(run_id, None)

    deleted = database.delete_run(run_id)
    return JsonResponse({
        "ok": deleted,
        "run_id": run_id,
        "message": f"Run '{run_id}' deleted successfully.",
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_artifact(request: HttpRequest, run_id: str, filename: str) -> HttpResponse:
    """
    GET /runs/{run_id}/artifacts/{filename}: Serve any file written to data/runs/{run_id}/ or fallback.
    """
    clean_name = Path(filename).name
    run_dir = database.get_run_dir(run_id)
    artifact_path = run_dir / clean_name
    content_type = "image/png" if clean_name.lower().endswith(".png") else "application/octet-stream"

    # 1. Direct run directory check
    if artifact_path.is_file():
        return FileResponse(open(artifact_path, "rb"), content_type=content_type, filename=clean_name)

    # 2. Project root directory check
    root_path = Path(__file__).resolve().parent.parent / clean_name
    if root_path.is_file():
        try:
            shutil.copy2(root_path, artifact_path)
        except Exception:
            pass
        return FileResponse(open(root_path, "rb"), content_type=content_type, filename=clean_name)

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
                    return FileResponse(open(cand_path, "rb"), content_type=content_type, filename=clean_name)

    return JsonResponse(
        {"detail": f"Artifact '{clean_name}' not found for run '{run_id}'."},
        status=404,
    )


@csrf_exempt
@require_http_methods(["GET"])
def get_model(request: HttpRequest, run_id: str) -> HttpResponse:
    """
    GET /runs/{run_id}/model: Binary download of champion .joblib model.
    """
    row = database.get_run(run_id)
    if row is None:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    run_dir = database.get_run_dir(run_id)
    root_dir = Path(__file__).resolve().parent.parent
    candidates: list[Path] = [
        run_dir / "champion_model.joblib",
    ]

    model_path = row.get("model_path")
    if model_path:
        candidates.append(Path(model_path))
        candidates.append(run_dir / Path(model_path).name)
        candidates.append(root_dir / Path(model_path).name)

    candidates.append(root_dir / "champion_model.joblib")

    for path in candidates:
        if path.is_file():
            return FileResponse(
                open(path, "rb"),
                filename="champion_model.joblib",
                content_type="application/octet-stream",
                as_attachment=True,
            )

    return JsonResponse(
        {"detail": "Model not available yet for this run."},
        status=404,
    )


@csrf_exempt
@require_http_methods(["POST"])
def pause_pipeline(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    POST /runs/{run_id}/pause: Pause an active pipeline run.
    """
    row = database.get_run(run_id)
    if not row:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    controller = get_or_create_controller(run_id)
    controller.pause()
    database.update_run(run_id, status="paused")
    return JsonResponse({"run_id": run_id, "status": "paused", "message": "Pipeline execution paused."})


@csrf_exempt
@require_http_methods(["POST"])
def resume_pipeline(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    POST /runs/{run_id}/resume: Resume a paused pipeline run.
    """
    row = database.get_run(run_id)
    if not row:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    controller = get_or_create_controller(run_id)
    controller.resume()
    database.update_run(run_id, status="running")
    return JsonResponse({"run_id": run_id, "status": "running", "message": "Pipeline execution resumed."})


@csrf_exempt
@require_http_methods(["POST"])
def stop_pipeline(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    POST /runs/{run_id}/stop: Stop/abort an active pipeline run.
    """
    row = database.get_run(run_id)
    if not row:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    controller = get_or_create_controller(run_id)
    controller.cancel()
    database.update_run(run_id, status="failed", error_traceback="Pipeline stopped by user request.")
    return JsonResponse({"run_id": run_id, "status": "failed", "message": "Pipeline execution cancelled."})


@csrf_exempt
@require_http_methods(["POST"])
def rerun_pipeline(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    POST /runs/{run_id}/rerun: Reset and re-execute the AutoML pipeline for this run.
    """
    row = database.get_run(run_id)
    if not row:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    if row["status"] in {"pending", "running", "paused"}:
        return JsonResponse(
            {"detail": "The run is still active. Stop it and wait for cancellation before starting a rerun."},
            status=409,
        )

    controller = get_or_create_controller(run_id)
    controller.cancel()

    with _CONTROLLERS_LOCK:
        fresh_ctrl = RunController(run_id)
        _RUN_CONTROLLERS[run_id] = fresh_ctrl

    run_dir = database.get_run_dir(run_id)
    csv_path = run_dir / "upload.csv"
    root_dir = Path(__file__).resolve().parent.parent

    if not csv_path.exists():
        root_csv = root_dir / "Titanic-Dataset.csv"
        if root_csv.exists():
            shutil.copy2(root_csv, csv_path)
        elif Path("Titanic-Dataset.csv").exists():
            shutil.copy2("Titanic-Dataset.csv", csv_path)

    # Reset DB state
    database.update_run(
        run_id,
        status="pending",
        last_agent=None,
        retry_count=0,
        metrics={},
        cleaned_csv_path=None,
        eda_plot_paths=[],
        shap_plot_path=None,
        model_path=None,
        error_traceback=None,
        code_history=[],
    )

    initial_state: DataScientistState = {
        "csv_path": str(csv_path),
        "target_column": row["target_column"],
        "problem_type": row["problem_type"],
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

    thread = threading.Thread(
        target=_run_pipeline,
        args=(run_id, initial_state),
        daemon=True,
        name=f"pipeline-rerun-{run_id[:8]}",
    )
    thread.start()

    return JsonResponse({
        "run_id": run_id,
        "status": "pending",
        "message": "Pipeline rerun triggered successfully.",
    })


@csrf_exempt
@require_http_methods(["POST"])
def execute_custom_code(request: HttpRequest, run_id: str) -> JsonResponse:
    """
    POST /runs/{run_id}/execute_code: Execute custom agent code in the sandbox.
    """
    if not CUSTOM_CODE_ENABLED:
        return JsonResponse(
            {"detail": "Custom code execution is disabled. Set ENABLE_CUSTOM_CODE_EXECUTION=1 only in a trusted local environment."},
            status=403,
        )

    row = database.get_run(run_id)
    if not row:
        return JsonResponse({"detail": f"Run '{run_id}' not found."}, status=404)

    try:
        body = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"detail": "Invalid JSON request body."}, status=400)

    code = body.get("code")
    agent_name = body.get("agent_name")

    if not code:
        return JsonResponse({"detail": "'code' field is required."}, status=400)

    run_dir = database.get_run_dir(run_id)
    csv_path = run_dir / "upload.csv"
    root_dir = Path(__file__).resolve().parent.parent
    if not csv_path.exists():
        csv_path = root_dir / "Titanic-Dataset.csv"

    current_state: DataScientistState = {
        "csv_path": str(csv_path),
        "target_column": row["target_column"],
        "problem_type": row["problem_type"],
        "schema_summary": "",
        "cleaned_csv_path": row.get("cleaned_csv_path"),
        "eda_plot_paths": row.get("eda_plot_paths") or [],
        "model_path": row.get("model_path"),
        "shap_plot_path": row.get("shap_plot_path"),
        "metrics": row.get("metrics") or {},
        "code_history": row.get("code_history") or [],
        "retry_count": row.get("retry_count", 0),
        "error_traceback": None,
        "last_agent": agent_name or row.get("last_agent"),
    }

    result = execute_agent_code(code=code, state=current_state)

    if result.get("ok"):
        new_state = result["state"]
        new_code_history = list(current_state["code_history"]) + [code]
        _sync_artifacts_to_run_dir(run_id, new_state)

        database.update_run(
            run_id,
            metrics=new_state.get("metrics"),
            cleaned_csv_path=new_state.get("cleaned_csv_path"),
            eda_plot_paths=new_state.get("eda_plot_paths"),
            shap_plot_path=new_state.get("shap_plot_path"),
            model_path=new_state.get("model_path"),
            error_traceback=None,
            code_history=new_code_history,
            last_agent=agent_name or row.get("last_agent"),
        )
        return JsonResponse({
            "ok": True,
            "stdout": result.get("stdout", ""),
            "updated_state": new_state,
            "message": "Custom code executed successfully in sandbox.",
        })
    else:
        return JsonResponse({
            "ok": False,
            "stdout": result.get("stdout", ""),
            "traceback": result.get("traceback", "Unknown error occurred"),
            "message": "Code execution failed in sandbox.",
        })
