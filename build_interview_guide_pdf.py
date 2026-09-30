import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print total page numbers (e.g. Page X of Y)
    along with running header and footer.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Skip header and footer on cover page if page 1
        if self._pageNumber > 1:
            # Running Header
            self.drawString(36, 11 * inch - 26, "Autonomous Multi-Agent Data Analyzer — Architecture & Interview Master Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)

            # Running Footer
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(8.5 * inch - 36, 20, page_text)
            self.drawString(36, 20, "Confidential & Comprehensive Backend Technical Reference — A to Z Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 28, 8.5 * inch - 36, 28)

        self.restoreState()


def create_callout(text, title="KEY ARCHITECTURAL PRINCIPLE", kind="primary", width=540, styles=None):
    """
    Helper to create a beautiful callout box with a colored left accent border.
    """
    color_map = {
        "primary": (colors.HexColor("#EEF2FF"), colors.HexColor("#4F46E5"), colors.HexColor("#312E81")),
        "success": (colors.HexColor("#ECFDF5"), colors.HexColor("#059669"), colors.HexColor("#065F46")),
        "warning": (colors.HexColor("#FFFBEB"), colors.HexColor("#D97706"), colors.HexColor("#92400E")),
        "danger":  (colors.HexColor("#FEF2F2"), colors.HexColor("#DC2626"), colors.HexColor("#991B1B")),
        "dark":    (colors.HexColor("#F8FAFC"), colors.HexColor("#0F172A"), colors.HexColor("#1E293B")),
    }
    bg_col, border_col, title_col = color_map.get(kind, color_map["primary"])

    title_p = Paragraph(f"<b><font color='{title_col.hexval()}'>{title}</font></b>", styles["CalloutTitle"])
    body_p = Paragraph(text, styles["CalloutBody"])

    content = [[title_p], [body_p]]
    t = Table(content, colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_col),
        ('LINELEFT', (0, 0), (0, -1), 3.5, border_col),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t


def create_qa_block(q_num, question, answer, takeaway=None, styles=None, width=540):
    """
    Helper to render an interview question and in-depth answer block.
    """
    q_p = Paragraph(f"<b>Q{q_num}: {question}</b>", styles["QuestionStyle"])
    a_p = Paragraph(answer, styles["AnswerStyle"])

    elements = [
        Table([[q_p]], colWidths=[width], style=[
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 7),
            ('RIGHTPADDING', (0, 0), (-1, -1), 7),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ]),
        Spacer(1, 4),
        a_p,
    ]

    if takeaway:
        t_box = create_callout(takeaway, title="INTERVIEWER TAKEAWAY / KEY METRIC", kind="success", width=width, styles=styles)
        elements.extend([Spacer(1, 4), t_box])

    elements.append(Spacer(1, 10))
    return KeepTogether(elements)


def build_pdf(filename="Autonomous_Multi_Agent_Data_Analyzer_Architecture_and_Interview_Master_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#475569"),
    ))
    styles.add(ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14.5,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        'SectionH3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=colors.HexColor("#4F46E5"),
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0F172A"),
    ))
    styles.add(ParagraphStyle(
        'CalloutTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
    ))
    styles.add(ParagraphStyle(
        'CalloutBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1E293B"),
    ))
    styles.add(ParagraphStyle(
        'QuestionStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F172A"),
    ))
    styles.add(ParagraphStyle(
        'AnswerStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B"),
    ))
    styles.add(ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
    ))
    styles.add(ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1E293B"),
    ))
    styles.add(ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0F172A"),
    ))

    story = []

    # =========================================================================
    # COVER / HEADER BLOCK
    # =========================================================================
    story.append(Paragraph("Autonomous Multi-Agent Data Analyzer", styles['CoverTitle']))
    story.append(Paragraph("End-to-End System Architecture, LangGraph Agents & Interview Master Guide (A to Z)", styles['CoverSubtitle']))

    meta_text = """
    <b>Domain:</b> Agentic AI / Autonomous Systems / AutoML Engineering &bull; 
    <b>Core Frameworks:</b> LangGraph, FastAPI, Optuna, Scikit-Learn, SHAP, SQLite, Streamlit &bull; 
    <b>LLM Runtime:</b> Groq (Llama-3.3 / Qwen / GPT-OSS) / Ollama Local Fallback &bull; 
    <b>Target Audience:</b> Senior AI Engineers, ML Platform Architects, Technical Interviewers & Candidates
    """
    story.append(Paragraph(meta_text, styles['CoverMeta']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4F46E5"), spaceBefore=8, spaceAfter=12))

    # Executive Overview
    story.append(Paragraph("Executive Summary & Architectural Paradigm", styles['SectionH1']))
    story.append(Paragraph(
        "The <b>Autonomous Multi-Agent Data Analyzer</b> is an enterprise-grade autonomous data science platform. "
        "Unlike traditional black-box AutoML frameworks (which rely on hardcoded heuristics) or naive conversational LLM wrappers "
        "(which attempt to perform statistical calculations or fit weights in prompt context), this system delegates every stage of the data "
        "science lifecycle to specialized LLM agents that write, execute, inspect, and self-heal production Python code inside an isolated sandbox.",
        styles['BodyDark']
    ))

    callout_paradigm = """
    <b>The 4 Foundational Pillars of this Architecture:</b><br/>
    1. <b>Code Synthesis over Natural Language:</b> Agents never return statistical summaries in prose; they generate executable Python code that creates real artifacts (.csv, .png, .joblib).<br/>
    2. <b>Immutable State Passing:</b> Agents pass paths and metadata in a TypedDict (<font name='Courier'>DataScientistState</font>) across nodes&mdash;never in-memory live objects (DataFrames or models) that bloat context and break pickling.<br/>
    3. <b>Sandboxed Self-Correction Loops:</b> Generated code executes against deep-copied state in a safe namespace. Execution failures trigger automated traceback feedback into the agent's prompt for up to 3 self-healing retries.<br/>
    4. <b>Asynchronous Decoupled Serving:</b> LangGraph execution runs in background threads governed by thread-safe <font name='Courier'>RunController</font> instances, communicating progress via SQLite to FastAPI and reactive frontends.
    """
    story.append(create_callout(callout_paradigm, title="CORE ARCHITECTURAL PILLARS", kind="primary", width=540, styles=styles))
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 1: END-TO-END SYSTEM ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("1. System Architecture & Workflow Topology", styles['SectionH1']))
    story.append(Paragraph(
        "The system follows a directed cyclic state-machine orchestrated by <b>LangGraph</b>. Below is the end-to-end component topology from user ingestion to model artifact serving:",
        styles['BodyDark']
    ))

    # Architecture Table
    arch_data = [
        [Paragraph("Pipeline Layer", styles['TableHead']), Paragraph("Core Technology", styles['TableHead']), Paragraph("Responsibilities & Design Constraints", styles['TableHead'])],
        [
            Paragraph("<b>Orchestration</b>", styles['TableCellBold']),
            Paragraph("LangGraph (StateGraph)", styles['TableCell']),
            Paragraph("Cyclic graph state machine with conditional retry edges, strict state schemas, and terminal failure routing.", styles['TableCell'])
        ],
        [
            Paragraph("<b>LLM Inference</b>", styles['TableCellBold']),
            Paragraph("Groq / Ollama (via LangChain)", styles['TableCell']),
            Paragraph("High-speed deterministic LLM generation (<font name='Courier'>temperature=0.0</font>) for fast Python code generation.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Execution Sandbox</b>", styles['TableCellBold']),
            Paragraph("Python <font name='Courier'>exec()</font> + AST / Regex", styles['TableCell']),
            Paragraph("Deep-copy state rollback, headless matplotlib trapping (<font name='Courier'>plt.show</font> override), restricted builtins denylist.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Persistence Layer</b>", styles['TableCellBold']),
            Paragraph("SQLite + File System", styles['TableCell']),
            Paragraph("Thread-safe run registry (<font name='Courier'>data/runs.db</font>) and isolated artifact directory (<font name='Courier'>data/runs/{run_id}/</font>).", styles['TableCell'])
        ],
        [
            Paragraph("<b>API Backend</b>", styles['TableCellBold']),
            Paragraph("FastAPI + Background Threads", styles['TableCell']),
            Paragraph("Non-blocking run dispatch, streaming status polling, artifact streaming, run cancellation/pause/resume/rerun.", styles['TableCell'])
        ],
        [
            Paragraph("<b>User Interface</b>", styles['TableCellBold']),
            Paragraph("Streamlit / Next.js", styles['TableCell']),
            Paragraph("Reactive 4-stage stepper, metric dashboards, EDA & SHAP visual galleries, one-click binary downloads.", styles['TableCell'])
        ],
    ]
    t_arch = Table(arch_data, colWidths=[90, 110, 340])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION 2: STATE SCHEMA & GRAPH TOPOLOGY
    # =========================================================================
    story.append(Paragraph("2. State Schema & Graph Topology Deep Dive", styles['SectionH1']))
    story.append(Paragraph(
        "<b>File: <font name='Courier'>state_schema.py</font></b><br/>"
        "The shared immutable state container is defined as a Python <font name='Courier'>TypedDict</font>. "
        "In LangGraph, <font name='Courier'>DataScientistState</font> is the single source of truth passed across all nodes.",
        styles['BodyDark']
    ))

    state_keys_data = [
        [Paragraph("Key Name", styles['TableHead']), Paragraph("Type", styles['TableHead']), Paragraph("Description & Lifecycle Usage", styles['TableHead'])],
        [
            Paragraph("<font name='Courier'>csv_path</font>", styles['TableCellBold']),
            Paragraph("str", styles['TableCell']),
            Paragraph("Absolute/relative path to the original raw uploaded CSV dataset.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>target_column</font>", styles['TableCellBold']),
            Paragraph("str", styles['TableCell']),
            Paragraph("Target variable column name the model is trained to predict.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>cleaned_csv_path</font>", styles['TableCellBold']),
            Paragraph("Optional[str]", styles['TableCell']),
            Paragraph("Path to cleaned & feature-engineered CSV written by Agent 1 & Agent 2.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>problem_type</font>", styles['TableCellBold']),
            Paragraph("str", styles['TableCell']),
            Paragraph("'classification' or 'regression'; dictates algorithm choice and metrics.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>schema_summary</font>", styles['TableCellBold']),
            Paragraph("str", styles['TableCell']),
            Paragraph("Lightweight 5-row schema profile string injected into agent prompts.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>eda_plot_paths</font>", styles['TableCellBold']),
            Paragraph("List[str]", styles['TableCell']),
            Paragraph("Array of file paths to generated EDA charts (target dist, correlation).", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>model_path</font>", styles['TableCellBold']),
            Paragraph("Optional[str]", styles['TableCell']),
            Paragraph("File path to the serialized champion scikit-learn model (<font name='Courier'>.joblib</font>).", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>shap_plot_path</font>", styles['TableCellBold']),
            Paragraph("Optional[str]", styles['TableCell']),
            Paragraph("Path to the generated global SHAP feature importance summary plot PNG.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>metrics</font>", styles['TableCellBold']),
            Paragraph("Dict[str, Any]", styles['TableCell']),
            Paragraph("Nested dictionary of baseline vs tuned scores and Optuna hyperparameters.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>code_history</font>", styles['TableCellBold']),
            Paragraph("List[str]", styles['TableCell']),
            Paragraph("Chronological audit log of every successfully executed Python snippet.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>retry_count</font>", styles['TableCellBold']),
            Paragraph("int", styles['TableCell']),
            Paragraph("Counter tracking consecutive failure attempts on the current node (0 to 3).", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>error_traceback</font>", styles['TableCellBold']),
            Paragraph("Optional[str]", styles['TableCell']),
            Paragraph("Full Python exception traceback from the last failed sandbox execution.", styles['TableCell'])
        ],
        [
            Paragraph("<font name='Courier'>last_agent</font>", styles['TableCellBold']),
            Paragraph("Optional[str]", styles['TableCell']),
            Paragraph("Name of the agent node that last executed ('loader_eda', 'tuner', etc.).", styles['TableCell'])
        ],
    ]
    t_state = Table(state_keys_data, colWidths=[95, 65, 380])
    t_state.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_state)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>File: <font name='Courier'>graph.py</font> &mdash; The Routing State Machine</b><br/>"
        "The graph is assembled with 5 distinct nodes: <font name='Courier'>loader</font>, <font name='Courier'>feature_engineer</font>, "
        "<font name='Courier'>tuner</font>, <font name='Courier'>explainer</font>, and <font name='Courier'>system_failure_sink</font>. "
        "After every agent execution, a universal conditional-edge function <font name='Courier'>check_execution_status(state)</font> evaluates the outcome:",
        styles['BodyDark']
    ))

    routing_rules = """
    <b>Conditional Edge Routing Logic (<font name='Courier'>check_execution_status</font>):</b><br/>
    &bull; <b>Outcome 1: <font name='Courier'>'next_stage'</font></b> &rarr; <font name='Courier'>error_traceback is None</font>. Proceeds to next sequential node (e.g. loader &rarr; feature_engineer).<br/>
    &bull; <b>Outcome 2: <font name='Courier'>'retry'</font></b> &rarr; <font name='Courier'>error_traceback is not None</font> and <font name='Courier'>retry_count &lt; 3</font>. Loops back to the SAME node with traceback in prompt context.<br/>
    &bull; <b>Outcome 3: <font name='Courier'>'system_failure_sink'</font></b> &rarr; <font name='Courier'>retry_count &gt;= 3</font>. Routes to the terminal failure sink with only an edge to <font name='Courier'>END</font>, preventing infinite loops.
    """
    story.append(create_callout(routing_rules, title="GRAPH ROUTING MECHANISM", kind="warning", width=540, styles=styles))
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION 3: EXPLANATION OF ALL 4 AGENTS & NODES
    # =========================================================================
    story.append(Paragraph("3. Detailed Breakdown of Every Agent & Node", styles['SectionH1']))
    story.append(Paragraph(
        "<b>The Shared Node Runner: <font name='Courier'>run_agent_node()</font> in <font name='Courier'>agents.py</font></b><br/>"
        "Every agent delegates to a common high-order execution pipeline that follows a strict 5-stage lifecycle:",
        styles['BodyDark']
    ))

    lifecycle_steps = """
    <b>The 5-Stage Agent Node Lifecycle:</b><br/>
    1. <b>Dynamic Prompt Assembly:</b> Merges static system prompt with dynamic state (schema, target, problem type). On retries, injects the previous attempt's failure traceback and explicit bug-fix instructions.<br/>
    2. <b>Deterministic LLM Call:</b> Invokes Groq/Llama with <font name='Courier'>temperature=0.0</font> for deterministic, syntactically correct code.<br/>
    3. <b>Parsing & Tag Extraction:</b> Extracts reasoning from <font name='Courier'>&lt;thought&gt;</font> tags (log-only) and Python from code blocks.<br/>
    4. <b>Sandboxed Execution:</b> Runs code against a deep-copied state in <font name='Courier'>sandbox.py</font>, isolating runtime side-effects.<br/>
    5. <b>State Reconciliation:</b> On success: merges updates into state, resets <font name='Courier'>retry_count=0</font>, clears error. On failure: preserves original state, increments <font name='Courier'>retry_count</font>, records traceback.
    """
    story.append(create_callout(lifecycle_steps, title="SHARED NODE EXECUTION LIFECYCLE", kind="dark", width=540, styles=styles))
    story.append(Spacer(1, 8))

    # Agent Table
    agents_spec_data = [
        [Paragraph("Agent / Node", styles['TableHead']), Paragraph("Allowed State Keys", styles['TableHead']), Paragraph("Core Responsibilities & Technical Implementation", styles['TableHead'])],
        [
            Paragraph("<b>1. Loader & EDA Agent</b><br/><font name='Courier'>loader_eda_node</font>", styles['TableCellBold']),
            Paragraph("<font name='Courier'>schema_summary<br/>cleaned_csv_path<br/>eda_plot_paths</font>", styles['TableCell']),
            Paragraph(
                "&bull; Reads raw dataset using <font name='Courier'>pd.read_csv(csv_path)</font>.<br/>"
                "&bull; Performs conservative cleaning: removes duplicate rows (<font name='Courier'>drop_duplicates()</font>), fills numeric nulls with median, categorical nulls with mode.<br/>"
                "&bull; Generates 2 essential matplotlib plots: Target distribution (bar/hist) and Numeric correlation heatmap.<br/>"
                "&bull; Saves plots to disk with <font name='Courier'>plt.savefig(..., dpi=120)</font> and closes figures with <font name='Courier'>plt.close('all')</font> to avoid memory leaks.<br/>"
                "&bull; Writes <font name='Courier'>cleaned_dataset.csv</font> and updates schema summary via <font name='Courier'>profile_csv_schema()</font>.",
                styles['TableCell']
            )
        ],
        [
            Paragraph("<b>2. Feature Engineer</b><br/><font name='Courier'>feature_engineer_node</font>", styles['TableCellBold']),
            Paragraph("<font name='Courier'>cleaned_csv_path<br/>schema_summary</font>", styles['TableCell']),
            Paragraph(
                "&bull; Ingests <font name='Courier'>cleaned_csv_path</font> and inspects column types.<br/>"
                "&bull; Drops uninformative ID, text, or high-cardinality columns using <font name='Courier'>errors='ignore'</font> to prevent KeyErrors.<br/>"
                "&bull; Applies one-hot encoding to low-cardinality categoricals, handles numeric skewness, and derives domain interactions.<br/>"
                "&bull; Enforces strict target isolation: never derives features that leak <font name='Courier'>target_column</font>.<br/>"
                "&bull; Overwrites/saves feature-engineered dataset and refreshes <font name='Courier'>schema_summary</font>.",
                styles['TableCell']
            )
        ],
        [
            Paragraph("<b>3. Tuner Agent</b><br/><font name='Courier'>tuner_node</font>", styles['TableCellBold']),
            Paragraph("<font name='Courier'>model_path<br/>metrics</font>", styles['TableCell']),
            Paragraph(
                "&bull; Splits clean dataset into train/validation sets (80/20 train-val split).<br/>"
                "&bull; Trains a baseline RandomForest (Classifier or Regressor) and computes holdout validation metrics (Accuracy/F1 or RMSE/R&sup2;).<br/>"
                "&bull; Executes Bayesian Hyperparameter Optimization with Optuna (<font name='Courier'>n_trials=3</font> hard constraint for high throughput).<br/>"
                "&bull; Speed optimizations: forces <font name='Courier'>n_jobs=-1</font> (parallel CPU cores) and subsamples datasets &gt;5,000 rows during search.<br/>"
                "&bull; Refits champion model on full training set, serializes to <font name='Courier'>champion_model.joblib</font>, and outputs structured metric comparisons.",
                styles['TableCell']
            )
        ],
        [
            Paragraph("<b>4. Explainer Agent</b><br/><font name='Courier'>explainer_node</font>", styles['TableCellBold']),
            Paragraph("<font name='Courier'>shap_plot_path</font>", styles['TableCell']),
            Paragraph(
                "&bull; Deserializes model from <font name='Courier'>model_path</font> via <font name='Courier'>joblib.load()</font>.<br/>"
                "&bull; Extracts numeric feature matrix and takes a fast representative sample (max 50 rows) for near-instant SHAP computation.<br/>"
                "&bull; Uses optimized <font name='Courier'>shap.TreeExplainer</font> with automatic fallback to <font name='Courier'>shap.Explainer</font> with k-means clustering.<br/>"
                "&bull; Handles binary classification slice selection (<font name='Courier'>shap_values[1]</font>) and explanation object parsing.<br/>"
                "&bull; Renders global summary plot (<font name='Courier'>max_display=15, show=False</font>) and saves to <font name='Courier'>shap_summary_plot.png</font>.",
                styles['TableCell']
            )
        ],
    ]
    t_agents = Table(agents_spec_data, colWidths=[105, 100, 335])
    t_agents.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_agents)
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION 4: EXPLANATION OF EVERY BACKEND FILE & MODULE
    # =========================================================================
    story.append(Paragraph("4. Backend Modules & Infrastructure Breakdown", styles['SectionH1']))

    files_info = [
        ("state_schema.py", "TypedDict State Schema",
         "Defines <font name='Courier'>DataScientistState</font> and constant <font name='Courier'>MAX_RETRIES = 3</font>. Ensures type safety across all graph nodes, prevents namespace pollution, and guarantees immutable state contracts between agent invocations."),
        ("llm_provider.py", "Multi-Provider LLM Factory",
         "Implements <font name='Courier'>get_llm(provider, model_name)</font>. Wraps <font name='Courier'>ChatGroq</font> (default: <font name='Courier'>openai/gpt-oss-120b</font> or <font name='Courier'>llama-3.3-70b-versatile</font>) and <font name='Courier'>ChatOllama</font>. Sets <font name='Courier'>temperature=0.0</font> to enforce deterministic Python code output and reads <font name='Courier'>GROQ_API_KEY</font> via <font name='Courier'>python-dotenv</font>."),
        ("parsing.py", "Robust Output Parsing Engine",
         "Extracts <font name='Courier'>&lt;thought&gt;</font> reasoning and executable code using 4-tier fallback strategies: (1) Markdown fences (<font name='Courier'>```python ... ```</font>), (2) XML tags (<font name='Courier'>&lt;code&gt;...&lt;/code&gt;</font>), (3) Unclosed markdown blocks, and (4) Python keyword scanning (<font name='Courier'>import</font>, <font name='Courier'>state_updates</font>, <font name='Courier'>def</font>). Automatically dedents code to prevent IndentationErrors."),
        ("sandbox.py", "Isolated Execution Runtime",
         "The single security and execution boundary where agent code is <font name='Courier'>exec()'d</font>. Deep-copies state before running; rolls back to untouched original state on failure. Monkey-patches <font name='Courier'>plt.show()</font> to a safe headless no-op, injects pre-imported data science libraries (<font name='Courier'>pd</font>, <font name='Courier'>np</font>, <font name='Courier'>plt</font>, <font name='Courier'>joblib</font>, <font name='Courier'>optuna</font>, <font name='Courier'>shap</font>), strips dangerous builtins (<font name='Courier'>eval</font>, <font name='Courier'>open</font>, <font name='Courier'>input</font>, <font name='Courier'>exit</font>), and syncs generated artifacts to run directories."),
        ("database.py", "SQLite Run Registry & Persistence",
         "Thread-safe persistence layer managing <font name='Courier'>data/runs.db</font> and artifact folders at <font name='Courier'>data/runs/{run_id}/</font>. Uses a module-level <font name='Courier'>threading.Lock</font> to serialize SQLite writes. Stores run metadata, execution status, serialized JSON metrics, artifact paths, error tracebacks, and code histories."),
        ("api_server.py", "FastAPI Asynchronous HTTP Bridge",
         "Production REST API exposing endpoints for run creation (<font name='Courier'>POST /run</font>), streaming status polling (<font name='Courier'>GET /runs/{id}/status</font>), artifact file streaming, model binary downloads, and interactive lifecycle controls (Pause, Resume, Stop, Rerun, Custom Code Execution). Implements thread-safe <font name='Courier'>RunController</font> and background execution workers."),
        ("main.py", "CLI Headless Execution Entry Point",
         "Command-line interface using <font name='Courier'>argparse</font>. Builds initial state, creates a registry entry in SQLite, executes the compiled LangGraph pipeline via <font name='Courier'>app.invoke()</font>, updates run status upon completion, and prints a formatted terminal summary."),
        ("streamlit_app.py", "Interactive Reactive Dashboard",
         "Streamlit frontend providing a 4-column live stepper visualizer, past runs history sidebar, metric score cards, tabbed EDA & SHAP visual galleries, one-click download buttons for cleaned data and models, and collapsible traceback error accordions."),
    ]

    for fname, subtitle, desc in files_info:
        story.append(Paragraph(f"<b><font name='Courier'>{fname}</font></b> &mdash; <i>{subtitle}</i>", styles['SectionH2']))
        story.append(Paragraph(desc, styles['BodyDark']))
        story.append(Spacer(1, 3))

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 5: INTERVIEW MASTER GUIDE (A TO Z)
    # =========================================================================
    story.append(Paragraph("5. The Interview Master Guide: A to Z Comprehensive Q&A", styles['SectionH1']))
    story.append(Paragraph(
        "This section covers every deep technical question an interviewer&mdash;ranging from a Staff ML Engineer to a Principal AI Systems Architect&mdash;might "
        "ask about this project, categorized by technical domain.",
        styles['BodyDark']
    ))
    story.append(Spacer(1, 6))

    # --- CATEGORY A: SYSTEM ARCHITECTURE & ORCHESTRATION ---
    story.append(Paragraph("Category A: Architecture & Orchestration (LangGraph, State, Concurrency)", styles['SectionH2']))

    story.append(create_qa_block(
        q_num=1,
        question="Why choose LangGraph for this project over linear chain frameworks (LangChain / LlamaIndex) or actor-based multi-agent frameworks (AutoGen / CrewAI)?",
        answer="""
        <b>Linear chains</b> (like standard LangChain Runnables or LlamaIndex workflows) assume a strictly unidirectional, acyclic execution path. However, real-world data science requires <b>cyclic state machines</b>: if an agent writes code that throws a SyntaxError, KeyError, or convergence warning, the pipeline must loop back to the same node for self-correction without losing prior context.<br/><br/>
        <b>AutoGen and CrewAI</b> rely on conversational turn-taking where agents exchange natural-language messages. In an AutoML pipeline, unstructured agent chatter is wasteful, non-deterministic, and costly. <b>LangGraph</b> treats agents as deterministic state-transformation functions (<font name='Courier'>State &rarr; State</font>) operating over a strictly typed, centralized schema (<font name='Courier'>DataScientistState</font>). LangGraph allows us to define fine-grained conditional edges (<font name='Courier'>check_execution_status</font>), retry bounds, and deterministic routing to a terminal failure sink.
        """,
        takeaway="LangGraph provides cyclic state transitions, exact state schema enforcement, and deterministic routing control that conversational agent frameworks lack.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=2,
        question="Why does DataScientistState pass file paths and metadata instead of in-memory pandas DataFrames or fitted scikit-learn models?",
        answer="""
        Passing raw Python objects (like a 2GB DataFrame or a fitted Random Forest) directly inside the graph state introduces critical architectural flaws:<br/>
        1. <b>Memory Bloat & Leaks:</b> In multi-agent pipelines with multiple retries, retaining multiple mutated DataFrames in memory causes rapid Out-of-Memory (OOM) crashes.<br/>
        2. <b>Process Serialization / Pickling Failures:</b> If the state needs to be checkpointed, serialized to Redis/SQLite, or transferred across processes/workers (e.g. Celery or Ray), live C-extension objects (like fitted LightGBM/XGBoost pointers or open Matplotlib figure buffers) fail to pickle.<br/>
        3. <b>LLM Context Limits:</b> The state schema is injected into agent prompts to provide context. Passing metadata and lightweight 5-row schema summaries keeps token usage negligible (~300 tokens) while preserving 100% schema clarity.<br/>
        4. <b>Auditability & Reproducibility:</b> Writing intermediate artifacts to disk (<font name='Courier'>cleaned_dataset.csv</font>, <font name='Courier'>champion_model.joblib</font>) creates a durable, inspectable artifact trail on the filesystem.
        """,
        takeaway="Path-based state guarantees zero memory bloat, trivial serialization, minimal LLM prompt token overhead, and persistent auditability.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=3,
        question="Explain the Self-Healing / Self-Correction mechanism in detail. How does the graph avoid infinite loops?",
        answer="""
        When an agent's code fails during sandbox execution or parsing:<br/>
        1. <font name='Courier'>execute_agent_code()</font> catches the exception via <font name='Courier'>traceback.format_exc()</font> and returns <font name='Courier'>{ok: False, state: original_state, traceback: ...}</font>.<br/>
        2. <font name='Courier'>run_agent_node()</font> keeps the original state untouched, increments <font name='Courier'>state['retry_count'] += 1</font>, sets <font name='Courier'>state['error_traceback'] = traceback</font>, and marks <font name='Courier'>last_agent</font>.<br/>
        3. The conditional edge <font name='Courier'>check_execution_status(state)</font> evaluates the state. If <font name='Courier'>retry_count &lt; 3</font>, it routes to <font name='Courier'>'retry'</font>, looping back to the <i>same</i> agent node.<br/>
        4. In the next turn, <font name='Courier'>_build_full_prompt()</font> detects <font name='Courier'>error_traceback</font> and injects a dedicated section: <font name='Courier'>'--- PREVIOUS ATTEMPT FAILED with: {traceback}. Fix the bug that caused this...'</font>.<br/>
        5. <b>Infinite Loop Prevention:</b> If the agent fails 3 consecutive times (<font name='Courier'>retry_count &gt;= 3</font>), <font name='Courier'>check_execution_status</font> routes directly to <font name='Courier'>system_failure_sink</font>. This node has no outgoing edges except to <font name='Courier'>END</font>, structurally guaranteeing termination.
        """,
        takeaway="Self-healing uses error feedback prompts with a hard structural circuit breaker (MAX_RETRIES = 3) terminating at a sink node.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=4,
        question="How is execution decoupled between the FastAPI backend and the Streamlit frontend? Why not run LangGraph inside Streamlit?",
        answer="""
        Streamlit follows an immediate-mode execution model: every time a user interacts with a widget (clicks a button, types in an input, toggles a tab), Streamlit re-executes the <b>entire Python script from line 1 to the end</b>.<br/><br/>
        If LangGraph were executed directly inside Streamlit, any UI re-render would either restart the entire 5-minute pipeline from scratch or require fragile global caching hacks. Furthermore, long-running agent execution would block Streamlit's WebSocket thread, freezing the UI.<br/><br/>
        <b>Our Solution:</b><br/>
        &bull; <b>FastAPI API Server:</b> Accepts the job via <font name='Courier'>POST /run</font>, generates a UUID <font name='Courier'>run_id</font>, creates a pending row in SQLite, and launches <font name='Courier'>_run_pipeline</font> in a detached background daemon thread.<br/>
        &bull; <b>Streamlit Client:</b> Receives the <font name='Courier'>run_id</font> immediately (HTTP 202 Accepted) and polls <font name='Courier'>GET /runs/{run_id}/status</font> every 2 seconds via <font name='Courier'>st.rerun()</font>. This guarantees a responsive UI, live progress updates, and multi-user isolation.
        """,
        takeaway="FastAPI background threading + SQLite polling decouples execution from frontend re-renders, preventing UI freeze and duplicate pipeline runs.",
        styles=styles
    ))

    # --- CATEGORY B: SANDBOX SECURITY, PARSING & CODE SYNTHESIS ---
    story.append(Paragraph("Category B: Sandbox Security, Parsing & Code Execution", styles['SectionH2']))

    story.append(create_qa_block(
        q_num=5,
        question="What are the security implications of executing LLM-generated code with exec()? How does sandbox.py mitigate risks, and what are the production hardening steps?",
        answer="""
        <b>The Threat:</b> Unchecked <font name='Courier'>exec()</font> can lead to Remote Code Execution (RCE), arbitrary file system deletion, network exfiltration, or infinite resource consumption (fork bombs).<br/><br/>
        <b>Implemented Mitigations in <font name='Courier'>sandbox.py</font>:</b><br/>
        1. <b>Restricted Builtins Namespace:</b> <font name='Courier'>_build_safe_builtins()</font> explicitly strips dangerous builtins (<font name='Courier'>eval</font>, <font name='Courier'>exec</font>, <font name='Courier'>compile</font>, <font name='Courier'>open</font>, <font name='Courier'>input</font>, <font name='Courier'>exit</font>, <font name='Courier'>breakpoint</font>).<br/>
        2. <b>Safe Global Injection:</b> Agents only receive a restricted dictionary containing pre-imported data science modules (<font name='Courier'>pd</font>, <font name='Courier'>np</font>, <font name='Courier'>plt</font>, <font name='Courier'>joblib</font>, <font name='Courier'>optuna</font>, <font name='Courier'>shap</font>) and primitive state variables.<br/>
        3. <b>State Isolation & Rollback:</b> Incoming state is deep-copied; crashes never corrupt caller state.<br/>
        4. <b>Headless Trapping:</b> <font name='Courier'>plt.show</font> is monkey-patched to prevent GUI blocking.<br/><br/>
        <b>Production Enterprise Hardening (Next Steps):</b><br/>
        In untrusted multi-tenant cloud deployments, in-process <font name='Courier'>exec()</font> should be replaced with containerized sandboxes such as <b>Docker containers with gVisor / nsjail runtime</b>, <b>AWS Lambda / Firecracker microVMs</b>, or <b>E2B / Modal sandboxes</b> with strict CPU/memory limits and zero egress networking.
        """,
        takeaway="Current mitigation: builtins stripping + deep-copy isolation + safe namespaces. Production standard: gVisor/Firecracker containerized sandboxes.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=6,
        question="Explain how parsing.py extracts code reliably despite LLM formatting variability (markdown fences, XML tags, raw text, unclosed tags).",
        answer="""
        LLMs frequently deviate from prompt formatting rules depending on model size and quantization. <font name='Courier'>parse_agent_response()</font> employs a robust 4-strategy cascade:<br/>
        1. <b>Thought Isolation:</b> Extracts reasoning via regex <font name='Courier'>&lt;thought&gt;(.*?)&lt;/thought&gt;</font> or <font name='Courier'>&lt;think&gt;...&lt;/think&gt;</font>, stripping it so reasoning text is never confused for code.<br/>
        2. <b>Strategy 1 (Markdown Fences):</b> Scans for <font name='Courier'>```python ... ```</font> or <font name='Courier'>``` ... ```</font> and selects the fence containing the longest substantive block.<br/>
        3. <b>Strategy 2 (XML Tags):</b> Scans for <font name='Courier'>&lt;code&gt;...&lt;/code&gt;</font> and extracts inner contents.<br/>
        4. <b>Strategy 3 (Unclosed Fences):</b> Handles truncated streaming outputs by matching from <font name='Courier'>```python</font> to the end of string.<br/>
        5. <b>Strategy 4 (Keyword Heuristic):</b> Identifies the first occurrence of standard Python keywords (<font name='Courier'>import</font>, <font name='Courier'>from</font>, <font name='Courier'>state_updates</font>, <font name='Courier'>def</font>, <font name='Courier'>df =</font>, <font name='Courier'>model =</font>) and extracts subsequent lines.<br/>
        6. <b>Indentation Sanitization:</b> Runs <font name='Courier'>textwrap.dedent()</font> to prevent fatal <font name='Courier'>IndentationError</font>.
        """,
        takeaway="Multi-tier regex fallback + AST dedenting guarantees high parsing resilience across diverse LLM families (Groq, LLaMA, GPT, Qwen).",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=7,
        question="Why is plt.show() monkey-patched in sandbox.py? What happens if an agent or library calls it?",
        answer="""
        In a headless server environment (such as FastAPI running on Linux or inside Docker), calling <font name='Courier'>plt.show()</font> causes one of two catastrophic failures:<br/>
        1. It attempts to open an interactive GUI window (Tkinter/Qt) and crashes with <font name='Courier'>TclError: no display name and no $DISPLAY environment variable</font>.<br/>
        2. It hangs the execution thread indefinitely waiting for a user to close the GUI window.<br/><br/>
        <b>Implementation:</b><br/>
        In <font name='Courier'>sandbox.py</font>, <font name='Courier'>matplotlib.use('Agg')</font> is invoked (selecting the non-interactive Anti-Grain Geometry backend), and <font name='Courier'>plt.show</font> is replaced with a harmless no-op lambda (<font name='Courier'>def _safe_show(*args, **kwargs): pass</font>). 
        This ensures that external libraries like SHAP (which often execute <font name='Courier'>plt.show()</font> internally) complete without error, while agent code is instructed to save plots using <font name='Courier'>plt.savefig()</font>. The original function is restored in a <font name='Courier'>finally</font> block.
        """,
        takeaway="Headless Agg backend + safe no-op monkey-patching prevents GUI hangs and crashes while preserving figure disk export.",
        styles=styles
    ))

    # --- CATEGORY C: MACHINE LEARNING & DATA SCIENCE ENGINEERING ---
    story.append(Paragraph("Category C: Machine Learning & Data Science Engineering", styles['SectionH2']))

    story.append(create_qa_block(
        q_num=8,
        question="Why does profile_csv_schema only read the first 5 rows (nrows=5)? How does the pipeline handle 5GB datasets without running out of RAM?",
        answer="""
        1. <b>Token Economy & Latency:</b> LLM prompt context is limited and expensive. Injecting millions of rows or comprehensive full-table statistics into the prompt costs thousands of tokens and increases LLM generation latency.<br/>
        2. <b>Schema Context Sufficiency:</b> An LLM data scientist only needs column names, inferred data types, and a representative 5-row sample to understand the schema structure and write correct cleaning and feature engineering transformations.<br/>
        3. <b>Zero Ingestion Memory Footprint:</b> By using <font name='Courier'>pd.read_csv(csv_path, nrows=5)</font>, profiling consumes negligible memory (&lt;100KB) regardless of whether the dataset is 1MB or 50GB.<br/>
        4. <b>Delegated Execution:</b> The actual full-table transformations (deduplication, imputation, encoding) are performed during sandboxed code execution in C-optimized Pandas/NumPy routines, keeping LLM prompts lean.
        """,
        takeaway="nrows=5 provides 100% of required schema intelligence at constant O(1) memory and minimal token overhead.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=9,
        question="Why use Optuna with exactly 3 trials (n_trials=3)? How does Optuna's Tree-structured Parzen Estimator (TPE) compare to Grid and Random Search?",
        answer="""
        <b>Why Optuna (Bayesian Optimization / TPE):</b><br/>
        &bull; <b>Grid Search</b> suffers from combinatorial explosion; evaluating 5 hyperparameters with 4 values each requires 4<sup>5</sup> = 1,024 model fits, taking hours.<br/>
        &bull; <b>Random Search</b> samples blindly without learning from previous evaluation history.<br/>
        &bull; <b>Optuna's TPE</b> fits a Gaussian Mixture Model to historical evaluations, balancing exploration (uncertain areas) and exploitation (promising areas) to find optimal hyperparameters in orders of magnitude fewer iterations.<br/><br/>
        <b>Why <font name='Courier'>n_trials=3</font> as a Hard Constraint:</b><br/>
        In an interactive AutoML system, user responsiveness is critical. Running 50-100 trials per agent execution would cause the pipeline to take 10-20 minutes, leading to HTTP request timeouts and degraded user experience. 3 trials demonstrate hyperparameter optimization principles within a strict 15-30 second execution window. In production batch mode, <font name='Courier'>n_trials</font> can be parameterized to 50+.
        """,
        takeaway="Optuna TPE learns parameter response surfaces efficiently; n_trials=3 balances optimization demonstration with real-time throughput.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=10,
        question="How does the Explainability Agent compute SHAP values efficiently? Why subsample to 50 rows, and how are multiclass outputs handled?",
        answer="""
        <b>The Challenge:</b> Computing exact Shapley values across M features for N rows has exponential complexity O(N &middot; 2<sup>M</sup>). For a 100,000-row dataset, calculating SHAP values on CPU can take hours.<br/><br/>
        <b>Optimizations Implemented in <font name='Courier'>explainer_node</font>:</b><br/>
        1. <b>Subsampling:</b> Extracts a 50-row representative random sample (<font name='Courier'>X.sample(n=min(50, len(X)))</font>). In statistical explainability, a 50-100 sample is sufficient to capture global feature attribution rankings.<br/>
        2. <b>TreeExplainer Specialization:</b> Uses <font name='Courier'>shap.TreeExplainer</font> which leverages tree structure to compute exact polynomial-time SHAP values in O(T &middot; L &middot; D<sup>2</sup>) (where T is trees, L is leaves, D is depth).<br/>
        3. <b>Automatic Fallback:</b> If the model is not tree-based (e.g. SVM or Neural Net), it catches the exception and falls back to <font name='Courier'>shap.Explainer</font> with k-means summary backgrounds (<font name='Courier'>shap.kmeans(X, 10)</font>).<br/>
        4. <b>Binary / Multiclass Normalization:</b> For binary classifiers where SHAP returns a 2-element list of arrays, it automatically selects index 1 (<font name='Courier'>shap_values[1]</font>) representing positive class log-odds impact.
        """,
        takeaway="TreeExplainer + 50-row subsampling + positive class slice normalization reduces SHAP computation from 30 minutes to &lt;2 seconds.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=11,
        question="How is Target Leakage prevented across the Feature Engineering and Modeling agents?",
        answer="""
        Target leakage occurs when information from the target variable is inadvertently incorporated into feature creation or preprocessing before model training.<br/><br/>
        <b>Systemic Safeguards:</b><br/>
        1. <b>Prompt System Constraints:</b> The Feature Engineer agent's prompt explicitly forbids deriving features from <font name='Courier'>target_column</font>.<br/>
        2. <b>Separate Train/Validation Splitting:</b> The Tuner agent enforces an 80/20 train/validation split before fitting estimators or computing evaluation metrics.<br/>
        3. <b>Categorical Target Isolation:</b> Features are separated into X and y (<font name='Courier'>X = df.drop(columns=[target_column])</font>) before one-hot encoding (<font name='Courier'>pd.get_dummies</font>) and imputation, ensuring target distribution signals do not contaminate feature matrices.
        """,
        takeaway="Explicit prompt rules, immediate X/y separation, and holdout validation splits prevent data leakage.",
        styles=styles
    ))

    # --- CATEGORY D: BACKEND CONCURRENCY, DATABASE & LIFECYCLE ---
    story.append(Paragraph("Category D: API, Database & Run Lifecycle Controls", styles['SectionH2']))

    story.append(create_qa_block(
        q_num=12,
        question="How does RunController implement Pause, Resume, and Cancellation without terminating threads abruptly with unsafe OS signals?",
        answer="""
        Abruptly terminating Python threads using C-extensions (<font name='Courier'>PyThreadState_SetAsyncExc</font>) or OS signals risks leaving file handles open, corrupting SQLite database writes, or leaving orphan temporary files.<br/><br/>
        <b>Thread-Safe Cooperative Control in <font name='Courier'>api_server.py</font>:</b><br/>
        1. <font name='Courier'>RunController</font> encapsulates two standard primitives: <font name='Courier'>pause_event = threading.Event()</font> and <font name='Courier'>cancel_event = threading.Event()</font>.<br/>
        2. When running normally, <font name='Courier'>pause_event.is_set() == True</font>.<br/>
        3. <b>Pause:</b> Calling <font name='Courier'>POST /runs/{id}/pause</font> clears the event (<font name='Courier'>pause_event.clear()</font>). The pipeline loop checks <font name='Courier'>controller.wait_if_paused()</font> at node boundaries and blocks until resumed.<br/>
        4. <b>Resume:</b> Calling <font name='Courier'>POST /runs/{id}/resume</font> sets <font name='Courier'>pause_event.set()</font>, unblocking the worker thread.<br/>
        5. <b>Cancellation:</b> Calling <font name='Courier'>POST /runs/{id}/stop</font> sets <font name='Courier'>cancel_event.set()</font> and unblocks pauses. The loop detects the cancellation flag, terminates gracefully, and sets <font name='Courier'>status='failed'</font> with <font name='Courier'>'Run stopped by user'</font>.
        """,
        takeaway="Cooperative event synchronization (threading.Event) ensures zero file or database corruption during pause/cancel operations.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=13,
        question="How does database.py ensure thread safety with SQLite across concurrent requests?",
        answer="""
        By default, SQLite in Python enforces thread ownership (<font name='Courier'>check_same_thread=True</font>) and throws exceptions if a connection created in thread A is accessed by thread B. Multiple concurrent writes can also trigger <font name='Courier'>sqlite3.OperationalError: database is locked</font>.<br/><br/>
        <b>Implementation in <font name='Courier'>database.py</font>:</b><br/>
        1. <b>Thread-Independent Connections:</b> <font name='Courier'>_connect()</font> sets <font name='Courier'>check_same_thread=False</font>, allowing safe connection reuse across thread pools.<br/>
        2. <b>Global Write Mutex:</b> A module-level mutex lock (<font name='Courier'>_LOCK = threading.Lock()</font>) wraps all database mutating functions (<font name='Courier'>create_run</font>, <font name='Courier'>update_run</font>, <font name='Courier'>delete_run</font>, <font name='Courier'>delete_all_runs</font>).<br/>
        3. <b>Connection Scoping:</b> Connections are opened and explicitly closed within <font name='Courier'>try...finally</font> blocks inside the mutex context manager, guaranteeing zero connection leaks.
        """,
        takeaway="Module-level write mutex + scoped connections guarantee zero database lock collisions and 100% ACID compliance.",
        styles=styles
    ))

    # --- CATEGORY E: PRODUCTION SCALING & SYSTEM DESIGN TRADE-OFFS ---
    story.append(Paragraph("Category E: Production Scaling, Failure Scenarios & Enterprise Trade-offs", styles['SectionH2']))

    story.append(create_qa_block(
        q_num=14,
        question="How would you scale this system from a single-machine prototype to an enterprise platform processing 100,000 datasets daily?",
        answer="""
        <b>Target Architecture for 100k Daily Jobs:</b><br/>
        1. <b>Distributed Task Queue:</b> Replace in-memory <font name='Courier'>threading.Thread</font> with <b>Celery / Temporal / Argo Workflows</b> backed by <b>RabbitMQ / Redis</b> or Apache Kafka for reliable job queuing and distributed scheduling.<br/>
        2. <b>MicroVM / Container Execution:</b> Run agent code inside ephemeral, isolated <b>Firecracker MicroVMs</b> or <b>Docker containers with gVisor</b> (managed via Kubernetes KEDA autoscaling) with 100% egress network isolation and strict memory quotas.<br/>
        3. <b>Object Storage:</b> Replace local filesystem paths (<font name='Courier'>data/runs/</font>) with <b>Amazon S3 / Google Cloud Storage</b> for dataset uploads, plot images, and serialized model binaries.<br/>
        4. <b>Enterprise Database:</b> Migrate SQLite to a high-availability <b>PostgreSQL</b> cluster with connection pooling (PgBouncer) and read replicas.<br/>
        5. <b>LLM Gateway & Caching:</b> Introduce an enterprise LLM proxy (LiteLLM / Portkey) with token rate limiting, fallback routing across providers (Groq &rarr; Azure OpenAI &rarr; AWS Bedrock), and semantic prompt caching.
        """,
        takeaway="Evolution path: Celery + Kubernetes/gVisor sandboxes + S3 object storage + PostgreSQL + LiteLLM gateway.",
        styles=styles
    ))

    story.append(create_qa_block(
        q_num=15,
        question="What are the primary trade-offs made in this architecture, and what would you improve with more time?",
        answer="""
        <b>Key Architectural Trade-offs:</b><br/>
        1. <b>Latency vs. Exhaustive Search:</b> Capped Optuna at 3 trials and SHAP at 50 rows. <i>Trade-off:</i> Produces near-instant results (30s pipeline) rather than theoretically optimal models (which could take hours).<br/>
        2. <b>In-Process exec() vs. Containerized Isolation:</b> Used in-process Python execution with builtins filtering for simplicity and zero external dependencies. <i>Trade-off:</i> Requires trusted environments; needs gVisor containers for public multi-tenant SaaS.<br/>
        3. <b>Groq Llama vs. Frontier Reasoning Models:</b> Chose Groq for ultra-low inference latency (~200 tokens/sec). <i>Trade-off:</i> Fast code generation, but occasionally requires 1 retry loop for complex feature engineering compared to GPT-4o / Claude 3.5 Sonnet.<br/><br/>
        <b>Future Enhancements:</b><br/>
        &bull; Multi-model ensemble generation (combining LightGBM, CatBoost, and XGBoost with stacking).<br/>
        &bull; Continuous learning memory bank (RAG over successful historical feature transformations).<br/>
        &bull; Automated Model Card & PDF Governance Report generation with compliance auditing.
        """,
        takeaway="The system prioritizes low-latency execution and inspectable code artifacts, with clear modular paths to enterprise containerization.",
        styles=styles
    ))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    build_pdf()
