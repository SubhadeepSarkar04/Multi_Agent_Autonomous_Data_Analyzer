"""
database.py

SQLite-backed run registry for the AutoML multi-agent pipeline.

Every pipeline run -- whether triggered via the CLI (main.py) or later via
the API server -- gets a unique UUID run_id, an isolated artifact folder at
data/runs/{run_id}/, and a persistent row in data/runs.db.

Public API
----------
    init_db()                                      -> None
    create_run(run_id, csv_filename,
               target_column, problem_type)        -> None
    update_run(run_id, **fields)                   -> None
    get_run(run_id)                                -> dict | None
    list_runs()                                    -> list[dict]
    get_run_dir(run_id)                            -> Path

All write functions are thread-safe: a module-level threading.Lock
serialises every write so concurrent requests never corrupt the database.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# All runtime data lives under data/ so the project root stays clean.
DATA_DIR = Path(__file__).parent / "data"
DB_PATH = DATA_DIR / "runs.db"
RUNS_DIR = DATA_DIR / "runs"

# ---------------------------------------------------------------------------
# Thread safety
# ---------------------------------------------------------------------------

_LOCK = threading.Lock()

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS runs (
    run_id            TEXT PRIMARY KEY,
    created_at        TEXT NOT NULL,
    csv_filename      TEXT NOT NULL,
    target_column     TEXT NOT NULL,
    problem_type      TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending',
    last_agent        TEXT,
    retry_count       INTEGER NOT NULL DEFAULT 0,
    metrics           TEXT,
    cleaned_csv_path  TEXT,
    eda_plot_paths    TEXT,
    shap_plot_path    TEXT,
    model_path        TEXT,
    error_traceback   TEXT
);
"""

# Columns whose values are JSON-serialised Python objects (list / dict).
_JSON_COLUMNS = {"metrics", "eda_plot_paths"}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _connect() -> sqlite3.Connection:
    """
    Open a connection to the SQLite database.

    Uses check_same_thread=False so the same DB file can be accessed from
    multiple threads (writes are still serialised by _LOCK).
    """
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    """
    Convert a sqlite3.Row to a plain dict, deserialising JSON columns.
    """
    d = dict(row)
    for col in _JSON_COLUMNS:
        if d.get(col) is not None:
            try:
                d[col] = json.loads(d[col])
            except (json.JSONDecodeError, TypeError):
                pass  # Leave as-is if parsing fails.
    return d


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def init_db() -> None:
    """
    Create the data/ directory, the runs/ subfolder, and the SQLite database
    (including the runs table) if they do not already exist.

    Safe to call multiple times -- all operations are idempotent.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)

    with _LOCK:
        conn = _connect()
        try:
            conn.execute(_CREATE_TABLE_SQL)
            conn.commit()
        finally:
            conn.close()


def create_run(
    run_id: str,
    csv_filename: str,
    target_column: str,
    problem_type: str,
) -> None:
    """
    Insert a new run row with status='pending'.

    Also creates the run's isolated artifact directory at
    data/runs/{run_id}/ so agents can write output files directly to it.

    Args:
        run_id:        UUID string uniquely identifying this run.
        csv_filename:  Original filename of the uploaded CSV (display only).
        target_column: Name of the column the model should predict.
        problem_type:  'classification' or 'regression'.
    """
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    created_at = datetime.now(timezone.utc).isoformat()

    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO runs
                    (run_id, created_at, csv_filename, target_column, problem_type, status)
                VALUES
                    (?, ?, ?, ?, ?, 'pending')
                """,
                (run_id, created_at, csv_filename, target_column, problem_type),
            )
            conn.commit()
        finally:
            conn.close()


def update_run(run_id: str, **fields: Any) -> None:
    """
    Partially update any columns of an existing run row.

    Only the keyword arguments supplied are updated; all other columns
    remain unchanged. JSON-serialisable columns (metrics, eda_plot_paths)
    are automatically serialised to text before writing.

    Args:
        run_id:   UUID of the run to update.
        **fields: Any subset of the runs table columns and their new values.

    Examples:
        update_run(run_id, status="running", last_agent="loader_eda")
        update_run(run_id, status="done", metrics={"baseline": {}, "tuned": {}})
    """
    if not fields:
        return

    serialised: dict[str, Any] = {}
    for key, value in fields.items():
        if key in _JSON_COLUMNS and value is not None:
            serialised[key] = json.dumps(value)
        else:
            serialised[key] = value

    set_clause = ", ".join(f"{col} = ?" for col in serialised)
    values = list(serialised.values()) + [run_id]

    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                f"UPDATE runs SET {set_clause} WHERE run_id = ?",
                values,
            )
            conn.commit()
        finally:
            conn.close()


def get_run(run_id: str) -> dict[str, Any] | None:
    """
    Retrieve a single run row by run_id.

    Returns:
        A dict with all column values (JSON columns deserialised), or
        None if no row with that run_id exists.
    """
    with _LOCK:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute(
                "SELECT * FROM runs WHERE run_id = ?", (run_id,)
            )
            row = cursor.fetchone()
            return _row_to_dict(row) if row else None
        finally:
            conn.close()


def list_runs() -> list[dict[str, Any]]:
    """
    Return all run rows ordered by created_at descending (newest first).

    Used by the Streamlit Past Runs sidebar and the /runs API endpoint.

    Returns:
        A list of dicts, one per run, with JSON columns deserialised.
        Returns an empty list if no runs exist yet.
    """
    with _LOCK:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute(
                "SELECT * FROM runs ORDER BY created_at DESC"
            )
            return [_row_to_dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()


def get_run_dir(run_id: str) -> Path:
    """
    Return the Path to a run's isolated artifact directory.

    The directory is guaranteed to exist after create_run() has been called.
    Agents should write all output files (cleaned CSV, PNGs, joblib) here.

    Args:
        run_id: UUID of the run.

    Returns:
        Path object pointing to data/runs/{run_id}/.
    """
    return RUNS_DIR / run_id
