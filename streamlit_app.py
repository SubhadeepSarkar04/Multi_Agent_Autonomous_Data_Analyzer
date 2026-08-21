"""
streamlit_app.py

Streamlit dashboard for the Autonomous Data Scientist pipeline.

Layout
------
Sidebar  — New Run (upload + config + Run button)
         — Past Runs (history from DB, click to reload)
Main     — Pipeline Tracker (4-step stepper, live status badges)
         — Results Dashboard (metrics, EDA plots, SHAP, downloads)  [on success]
         — Error Panel (traceback accordion)                         [on failure]

The app never imports the backend directly. It communicates exclusively
with api_server.py over HTTP (POST /run, GET /runs/{id}/status, etc.)
and polls every 2 seconds via st.rerun() while the pipeline is running.
"""

import time
from pathlib import Path

import requests
import streamlit as st

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_BASE = "http://127.0.0.1:8000"

AGENTS_ORDER = ["loader_eda", "feature_engineer", "tuner", "explainer"]
AGENT_LABELS = {
    "loader_eda":        "Loader & EDA",
    "feature_engineer":  "Feature Engineer",
    "tuner":             "Tuner",
    "explainer":         "Explainer",
}

st.set_page_config(
    page_title="Autonomous Data Scientist",
    page_icon="🤖",
    layout="wide",
)

# ---------------------------------------------------------------------------
# Session state defaults
# ---------------------------------------------------------------------------

for key, default in {
    "viewing_run_id": None,   # run currently shown in main panel
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def api_start_run(file_bytes: bytes, filename: str, target_column: str, problem_type: str) -> str | None:
    """POST /run — returns run_id on success, None on failure."""
    try:
        r = requests.post(
            f"{API_BASE}/run",
            files={"file": (filename, file_bytes, "text/csv")},
            data={"target_column": target_column, "problem_type": problem_type},
            timeout=20,
        )
        r.raise_for_status()
        return r.json()["run_id"]
    except Exception as e:
        st.session_state.api_error = str(e)
        return None


def api_get_status(run_id: str) -> dict | None:
    """GET /runs/{run_id}/status — returns the run row dict or None."""
    try:
        r = requests.get(f"{API_BASE}/runs/{run_id}/status", timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def api_list_runs() -> list[dict]:
    """GET /runs — returns all past runs newest-first, or [] on failure."""
    try:
        r = requests.get(f"{API_BASE}/runs", timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception:
        return []

# ---------------------------------------------------------------------------
# Agent status helper
# ---------------------------------------------------------------------------


def agent_display_status(agent: str, last_agent: str | None, overall_status: str) -> str:
    """
    Return one of: 'done' | 'running' | 'failed' | 'waiting'
    for a given agent given the pipeline's current last_agent + overall_status.
    """
    if last_agent is None:
        # No node has completed yet — only the first node is 'running'.
        if agent == AGENTS_ORDER[0] and overall_status == "running":
            return "running"
        return "waiting"

    try:
        last_idx = AGENTS_ORDER.index(last_agent)
    except ValueError:
        last_idx = -1

    agent_idx = AGENTS_ORDER.index(agent)

    if overall_status == "failed":
        if agent_idx < last_idx:
            return "done"
        if agent_idx == last_idx:
            return "failed"
        return "waiting"

    # status is 'running' or 'done'
    if agent_idx <= last_idx:
        return "done"
    if agent_idx == last_idx + 1 and overall_status == "running":
        return "running"
    return "waiting"

# ---------------------------------------------------------------------------
# Sub-components
# ---------------------------------------------------------------------------


def render_pipeline_tracker(last_agent: str | None, overall_status: str) -> None:
    """Four-column stepper showing live status of each agent node."""
    st.subheader("Pipeline Progress")
    cols = st.columns(4)
    for agent, col in zip(AGENTS_ORDER, cols):
        disp = agent_display_status(agent, last_agent, overall_status)
        label = AGENT_LABELS[agent]
        with col:
            if disp == "done":
                st.success(f"✅ {label}")
            elif disp == "running":
                st.warning(f"⏳ {label}")
            elif disp == "failed":
                st.error(f"❌ {label}")
            else:
                st.info(f"⬜ {label}")


def render_metrics(metrics: dict) -> None:
    """Baseline vs tuned score cards + best hyperparameters table."""
    if not metrics:
        st.caption("No metrics available yet.")
        return

    baseline = metrics.get("baseline") if isinstance(metrics.get("baseline"), dict) else {}
    tuned = metrics.get("tuned") if isinstance(metrics.get("tuned"), dict) else {}
    best_params = metrics.get("best_params", metrics.get("best_parameters", {}))

    all_entries = []
    if baseline or tuned:
        for k, v in baseline.items():
            all_entries.append(("Baseline", k, v))
        for k, v in tuned.items():
            all_entries.append(("Tuned", k, v))
    else:
        for k, v in metrics.items():
            if k not in ("best_params", "best_parameters") and not isinstance(v, (dict, list)):
                all_entries.append(("", k, v))

    if all_entries:
        cols = st.columns(min(len(all_entries), 4))
        for i, (prefix, key, val) in enumerate(all_entries):
            label_text = f"{prefix} {key}".strip()
            with cols[i % len(cols)]:
                try:
                    st.metric(label=label_text, value=round(float(val), 4))
                except (TypeError, ValueError):
                    st.metric(label=label_text, value=str(val))

    if isinstance(best_params, dict) and best_params:
        st.markdown("**Best Hyperparameters**")
        st.dataframe(
            {
                "Parameter": list(best_params.keys()),
                "Value":     [str(v) for v in best_params.values()],
            },
            use_container_width=True,
            hide_index=True,
        )


def render_eda_gallery(eda_plot_paths: list[str]) -> None:
    """Responsive 2-column grid of EDA plot images."""
    valid_paths = [p for p in eda_plot_paths if Path(p).exists()]
    if not valid_paths:
        # Check standard default names if path list was not passed
        default_plots = ["eda_target_dist.png", "eda_correlation.png", "eda_missingness.png"]
        valid_paths = [p for p in default_plots if Path(p).exists()]

    if not valid_paths:
        st.caption("EDA plots not available.")
        return

    cols = st.columns(min(len(valid_paths), 2))
    for i, plot_path in enumerate(valid_paths):
        path = Path(plot_path)
        with cols[i % len(cols)]:
            st.image(
                str(path),
                caption=path.stem.replace("_", " ").title(),
                use_container_width=True,
            )


def render_shap(shap_plot_path: str | None) -> None:
    """SHAP global summary plot + caption."""
    # Check provided path or standard default
    target_path = None
    if shap_plot_path and Path(shap_plot_path).exists():
        target_path = Path(shap_plot_path)
    elif Path("shap_summary_plot.png").exists():
        target_path = Path("shap_summary_plot.png")

    if not target_path:
        st.caption("SHAP plot not available.")
        return

    col1, col2, col3 = st.columns([1, 6, 1])
    with col2:
        st.image(
            str(target_path),
            caption="Global SHAP Feature Importance",
            use_container_width=True,
        )
    st.caption(
        "Each bar shows how strongly a feature influences predictions. "
        "Colour indicates feature value (red = high, blue = low)."
    )


def render_downloads(cleaned_csv_path: str | None, model_path: str | None) -> None:
    """Download buttons for cleaned CSV and champion model."""
    col1, col2 = st.columns(2)
    with col1:
        if cleaned_csv_path and Path(cleaned_csv_path).exists():
            st.download_button(
                label="📥 Download Cleaned CSV",
                data=Path(cleaned_csv_path).read_bytes(),
                file_name="cleaned_data.csv",
                mime="text/csv",
                use_container_width=True,
            )
        else:
            st.button("📥 Cleaned CSV (unavailable)", disabled=True, use_container_width=True)

    with col2:
        if model_path and Path(model_path).exists():
            st.download_button(
                label="🤖 Download Model (.joblib)",
                data=Path(model_path).read_bytes(),
                file_name="champion_model.joblib",
                mime="application/octet-stream",
                use_container_width=True,
            )
        else:
            st.button("🤖 Model (unavailable)", disabled=True, use_container_width=True)


def render_results_dashboard(run_data: dict) -> None:
    """Full results view: metrics → EDA plots → SHAP → downloads."""
    metrics         = run_data.get("metrics") or {}
    eda_plot_paths  = run_data.get("eda_plot_paths") or []
    shap_plot_path  = run_data.get("shap_plot_path")
    cleaned_csv_path = run_data.get("cleaned_csv_path")
    model_path      = run_data.get("model_path")

    st.subheader("📊 Model Performance")
    render_metrics(metrics)
    st.divider()

    st.subheader("📈 EDA Plots")
    render_eda_gallery(eda_plot_paths)
    st.divider()

    st.subheader("💡 Feature Importance (SHAP)")
    render_shap(shap_plot_path)
    st.divider()

    st.subheader("⬇️ Downloads")
    render_downloads(cleaned_csv_path, model_path)


def render_error_panel(run_data: dict) -> None:
    """Error banner + collapsible traceback accordion."""
    last_agent   = run_data.get("last_agent", "unknown")
    retry_count  = run_data.get("retry_count", 0)
    traceback    = run_data.get("error_traceback", "No traceback available.")

    st.error(
        f"❌ Pipeline failed at agent **{last_agent}** "
        f"after {retry_count} retries (max 3)."
    )
    with st.expander("🔍 Show error traceback"):
        st.code(traceback, language="python")

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

with st.sidebar:
    st.title("🤖 Autonomous Data Scientist")
    st.divider()

    # ── New Run ──────────────────────────────────────────────────────────────
    st.subheader("▶ New Run")
    uploaded_file = st.file_uploader("Upload CSV", type="csv")
    target_column = st.text_input("Target column", placeholder="e.g. Survived")
    problem_type  = st.selectbox("Problem type", ["classification", "regression"])

    run_disabled = not (uploaded_file and target_column.strip())
    if st.button("▶ Run Pipeline", type="primary", use_container_width=True, disabled=run_disabled):
        run_id = api_start_run(
            file_bytes=uploaded_file.read(),
            filename=uploaded_file.name,
            target_column=target_column.strip(),
            problem_type=problem_type,
        )
        if run_id:
            st.session_state.viewing_run_id = run_id
            st.rerun()
        else:
            st.error("Could not start run. Is the API server running at port 8000?")

    st.divider()

    # ── Past Runs ─────────────────────────────────────────────────────────────
    st.subheader("📂 Past Runs")
    all_runs = api_list_runs()

    if not all_runs:
        st.caption("No runs yet — upload a CSV to get started.")
    else:
        for run in all_runs:
            icon  = {"done": "✅", "failed": "❌", "running": "⏳", "pending": "⏳"}.get(run["status"], "⬜")
            label = f"{icon} {run['csv_filename']}"
            if st.button(label, key=f"past_{run['run_id']}", use_container_width=True):
                st.session_state.viewing_run_id = run["run_id"]
                st.rerun()

# ---------------------------------------------------------------------------
# Main panel
# ---------------------------------------------------------------------------

viewing_run_id = st.session_state.viewing_run_id

if not viewing_run_id:
    st.title("🤖 Autonomous Data Scientist")
    st.markdown(
        "Upload a CSV file in the sidebar, set your **target column** and "
        "**problem type**, then click **▶ Run Pipeline** to start."
    )
    st.stop()

# Fetch latest run state from API.
run_data = api_get_status(viewing_run_id)

if run_data is None:
    st.error(
        "⚠️ Cannot reach the API server at **http://127.0.0.1:8000** or selected run not found. "
        "Ensure the backend is running:  \n`python -m uvicorn api_server:api --reload --port 8000`"
    )
    if st.button("⬅ Back to New Run", type="secondary"):
        st.session_state.viewing_run_id = None
        st.rerun()
    st.stop()

if run_data is not None:
    status     = run_data.get("status", "pending")
    last_agent = run_data.get("last_agent")

    # Header
    st.title(f"🤖 {run_data.get('csv_filename', 'Run')}")
    st.caption(
        f"Target: `{run_data.get('target_column', '')}` · "
        f"Type: `{run_data.get('problem_type', '')}` · "
        f"Run ID: `{viewing_run_id}`"
    )
    st.divider()

    # Pipeline stepper (always visible).
    render_pipeline_tracker(last_agent, status)
    st.divider()

    # ── Running / pending ────────────────────────────────────────────────────────
    if status in ("pending", "running"):
        agent_label = AGENT_LABELS.get(last_agent, "starting...") if last_agent else "starting..."
        st.info(f"⏳ Pipeline is running...  Current agent: **{agent_label}**")
        time.sleep(1)
        st.rerun()

    # ── Failed ───────────────────────────────────────────────────────────────────
    elif status == "failed":
        render_error_panel(run_data)

    # ── Done ─────────────────────────────────────────────────────────────────────
    elif status == "done":
        st.success("✅ Pipeline completed successfully!")
        render_results_dashboard(run_data)

    else:
        st.warning(f"Unknown status: `{status}`")
