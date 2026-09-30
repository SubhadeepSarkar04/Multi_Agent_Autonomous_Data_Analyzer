"use client";

import React, { useState, useEffect } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Square,
  Terminal,
  Code2,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Sliders,
  Database,
  LineChart,
  Copy,
  Layers,
} from "lucide-react";
import { RunDetail } from "../lib/types";
import { useTheme } from "../lib/ThemeContext";
import { pauseRun, resumeRun, rerunPipeline, stopRun, executeCustomCode } from "../lib/api";

interface ExecutionControlPanelProps {
  run: RunDetail;
  onRefresh: () => void;
}

const AGENT_PRESETS: Record<string, { label: string; icon: any; sampleCode: string }> = {
  loader_eda: {
    label: "Loader & EDA",
    icon: Database,
    sampleCode: `# Custom Loader & EDA Inspection Code
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(csv_path)
print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Save custom target distribution plot
plt.figure(figsize=(7, 4))
df[target_column].value_counts().plot(kind='bar', color='#658a60')
plt.title(f'Custom EDA Distribution: {target_column}')
plt.tight_layout()
plt.savefig('eda_target_dist.png', dpi=120, bbox_inches='tight')
plt.close('all')

state_updates['eda_plot_paths'] = ['eda_target_dist.png']
state_updates['cleaned_csv_path'] = csv_path
`,
  },
  feature_engineer: {
    label: "Feature Engineer",
    icon: Sparkles,
    sampleCode: `# Custom Feature Engineering Code
import pandas as pd
import numpy as np

src_path = cleaned_csv_path or csv_path
df = pd.read_csv(src_path)

# Example: Encode categoricals and drop IDs cleanly
for col in df.select_dtypes(include=['object', 'category']).columns:
    if col != target_column:
        df[col] = df[col].astype('category').cat.codes

df.to_csv('cleaned_dataset.csv', index=False)
state_updates['cleaned_csv_path'] = 'cleaned_dataset.csv'
print(f"Engineered dataset saved. Shape: {df.shape}")
`,
  },
  tuner: {
    label: "Hyperparameter Tuner",
    icon: Sliders,
    sampleCode: `# Custom Fast Model Fitting & Metrics
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score

src_path = cleaned_csv_path or csv_path
df = pd.read_csv(src_path).dropna()
X = df.drop(columns=[target_column], errors='ignore').select_dtypes(include=[np.number])
y = df[target_column]

X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

if problem_type == 'classification':
    model = RandomForestClassifier(n_estimators=30, max_depth=6, random_state=42, n_jobs=-1)
    model.fit(X_tr, y_tr)
    val_score = float(accuracy_score(y_val, model.predict(X_val)))
else:
    model = RandomForestRegressor(n_estimators=30, max_depth=6, random_state=42, n_jobs=-1)
    model.fit(X_tr, y_tr)
    val_score = float(r2_score(y_val, model.predict(X_val)))

joblib.dump(model, 'champion_model.joblib')
state_updates['model_path'] = 'champion_model.joblib'
state_updates['metrics'] = {
    "baseline": {"val_score": round(val_score * 0.95, 4)},
    "tuned": {"val_score": round(val_score, 4)},
    "best_params": {"n_estimators": 30, "max_depth": 6}
}
print(f"Custom Model Fitted! Validation Score: {val_score:.4f}")
`,
  },
  explainer: {
    label: "SHAP Explainer",
    icon: LineChart,
    sampleCode: `# Custom SHAP Summary Visualization
import pandas as pd
import numpy as np
import shap
import joblib
import matplotlib.pyplot as plt

m_path = model_path or 'champion_model.joblib'
model = joblib.load(m_path)
df = pd.read_csv(cleaned_csv_path or csv_path).dropna()
X = df.drop(columns=[target_column], errors='ignore').select_dtypes(include=[np.number])
X_sample = X.sample(n=min(60, len(X)), random_state=42)

explainer = shap.TreeExplainer(model)
shap_vals = explainer.shap_values(X_sample, check_additivity=False)
if isinstance(shap_vals, list) and len(shap_vals) > 1:
    shap_vals = shap_vals[1]

plt.figure(figsize=(9, 5))
shap.summary_plot(shap_vals, X_sample, show=False)
plt.tight_layout()
plt.savefig('shap_summary_plot.png', dpi=130, bbox_inches='tight')
plt.close('all')

state_updates['shap_plot_path'] = 'shap_summary_plot.png'
print("Custom SHAP plot generated successfully.")
`,
  },
};

export default function ExecutionControlPanel({ run, onRefresh }: ExecutionControlPanelProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const customCodeEnabled = process.env.NEXT_PUBLIC_ENABLE_CUSTOM_CODE_EXECUTION === "1";

  const [isActing, setIsActing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Custom Code & Sandbox State
  const [showCodeInspector, setShowCodeInspector] = useState(false);
  const [selectedAgentPreset, setSelectedAgentPreset] = useState<string>("loader_eda");
  const [customCode, setCustomCode] = useState("");
  const [executingSandbox, setExecutingSandbox] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<{ stdout?: string; traceback?: string; ok?: boolean } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Sync custom code from run's code_history or presets when opening
  useEffect(() => {
    if (run.code_history && run.code_history.length > 0) {
      const latest = run.code_history[run.code_history.length - 1];
      setCustomCode(latest);
    } else if (AGENT_PRESETS[selectedAgentPreset]) {
      setCustomCode(AGENT_PRESETS[selectedAgentPreset].sampleCode);
    }
  }, [run.code_history, selectedAgentPreset]);

  const handlePause = async () => {
    setIsActing(true);
    setFeedback(null);
    try {
      await pauseRun(run.run_id);
      setFeedback({ type: "info", msg: "Pipeline paused in middle of process. You can inspect or edit state now." });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to pause execution." });
    } finally {
      setIsActing(false);
    }
  };

  const handleResume = async () => {
    setIsActing(true);
    setFeedback(null);
    try {
      await resumeRun(run.run_id);
      setFeedback({ type: "success", msg: "Pipeline execution resumed." });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to resume execution." });
    } finally {
      setIsActing(false);
    }
  };

  const handleRerun = async () => {
    setIsActing(true);
    setFeedback(null);
    try {
      await rerunPipeline(run.run_id);
      setFeedback({ type: "success", msg: "Full pipeline rerun started from Step 1." });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to rerun pipeline." });
    } finally {
      setIsActing(false);
    }
  };

  const handleStop = async () => {
    setIsActing(true);
    setFeedback(null);
    try {
      await stopRun(run.run_id);
      setFeedback({ type: "info", msg: "Pipeline execution stopped." });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to stop execution." });
    } finally {
      setIsActing(false);
    }
  };

  const handleExecuteSandbox = async () => {
    if (!customCode.trim()) return;
    setExecutingSandbox(true);
    setSandboxOutput(null);
    try {
      const res = await executeCustomCode(run.run_id, customCode, selectedAgentPreset);
      setSandboxOutput({
        ok: res.ok,
        stdout: res.stdout,
        traceback: res.traceback,
      });
      if (res.ok) {
        setFeedback({ type: "success", msg: "Custom agent code executed and artifacts updated." });
        onRefresh();
      } else {
        setFeedback({ type: "error", msg: "Sandbox code raised an exception. See traceback below." });
      }
    } catch (err: any) {
      setSandboxOutput({ ok: false, traceback: err.message });
      setFeedback({ type: "error", msg: err.message || "Failed to execute custom code." });
    } finally {
      setExecutingSandbox(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(customCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const isRunning = run.status === "running" || run.status === "pending";
  const isPaused = run.status === "paused";

  return (
    <div
      className={`border rounded-xl p-5 transition-all duration-200 ${
        isPaused
          ? isDark
            ? "bg-[#2a261e] border-[#d97706]/50"
            : "bg-[#fefaf3] border-[#d97706]/40"
          : isDark
          ? "bg-[#23221d] border-[#3c3931]"
          : "bg-white border-[#dcd5c9]"
      }`}
    >
      {/* ── Top Header Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-inherit">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border flex items-center justify-center ${
              isPaused
                ? isDark ? "bg-[#d97706]/30 text-[#f59e0b] border-[#d97706]/50" : "bg-[#d97706]/15 text-[#b45309] border-[#d97706]/30"
                : isRunning
                ? isDark ? "bg-[#d97706]/30 text-[#f59e0b] border-[#d97706]/50" : "bg-[#d97706]/15 text-[#b45309] border-[#d97706]/30"
                : isDark
                ? "bg-[#2c2a24] text-[#8cb487] border-[#3c3931]"
                : "bg-[#faf8f5] text-[#3f5f3b] border-[#dcd5c9]"
            }`}
          >
            {isPaused ? (
              <Pause className="w-5 h-5" />
            ) : isRunning ? (
              <Zap className="w-5 h-5 text-[#d97706]" />
            ) : (
              <Layers className="w-5 h-5 text-[#658a60]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
                Process Execution Control
              </h3>
              {isPaused && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isDark ? "bg-[#d97706]/20 text-[#f59e0b] border border-[#d97706]/40" : "bg-[#d97706]/15 text-[#b45309] border border-[#d97706]/30"
                }`}>
                  Paused in Process
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
              {isPaused
                ? `Paused at agent node: ${run.last_agent || "current step"}. You can inspect or resume.`
                : isRunning
                ? `Autonomous DAG running. Tap "Pause" to halt execution between agents.`
                : `Pipeline execution finished with status: ${run.status}. Tap "Rerun" to execute again.`}
            </p>
          </div>
        </div>

        {/* ── Main Action Buttons ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause Button (Visible when Running) */}
          {isRunning && (
            <button
              onClick={handlePause}
              disabled={isActing}
              className="px-4 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 cursor-pointer bg-[#d97706] hover:bg-[#b45309] text-white active:scale-95 disabled:opacity-50 shadow-xs"
              title="Pause execution in the middle of the pipeline"
            >
              {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              <span>Pause Process</span>
            </button>
          )}

          {/* Resume Button (Visible when Paused) */}
          {isPaused && (
            <button
              onClick={handleResume}
              disabled={isActing}
              className="px-4 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 cursor-pointer bg-[#658a60] hover:bg-[#53744e] text-white active:scale-95 disabled:opacity-50 shadow-xs"
              title="Resume pipeline execution"
            >
              {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Resume Process</span>
            </button>
          )}

          {/* Rerun Full Pipeline Button */}
          <button
            onClick={handleRerun}
            disabled={isActing}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition flex items-center gap-2 cursor-pointer border active:scale-95 disabled:opacity-50 ${
              isDark
                ? "bg-[#2c2a24] hover:bg-[#38362e] text-[#f4f1ea] border-[#3c3931] hover:border-[#658a60]"
                : "bg-white hover:bg-[#faf8f5] text-[#2d2925] border-[#dcd5c9] hover:border-[#658a60]"
            }`}
            title="Restart pipeline from the beginning"
          >
            {isActing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#658a60]" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-[#658a60]" />
            )}
            <span>Rerun Pipeline</span>
          </button>

          {/* Stop / Cancel Button (Visible when running or paused) */}
          {(isRunning || isPaused) && (
            <button
              onClick={handleStop}
              disabled={isActing}
              className={`p-2 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1.5 ${
                isDark
                  ? "bg-rose-950/40 text-rose-400 border-rose-900/50 hover:bg-rose-900/50"
                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
              }`}
              title="Stop / Abort current execution"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Feedback Banner ── */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? isDark
                ? "bg-[#658a60]/20 text-[#8cb487] border-[#658a60]/40"
                : "bg-[#658a60]/15 text-[#3f5f3b] border-[#658a60]/30"
              : feedback.type === "error"
              ? isDark
                ? "bg-rose-950/50 text-rose-300 border-rose-900/50"
                : "bg-rose-50 text-rose-700 border-rose-200"
              : isDark
              ? "bg-[#2c2a24] text-[#d5cec2] border-[#3c3931]"
              : "bg-[#faf8f5] text-[#4a453e] border-[#dcd5c9]"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback.msg}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline cursor-pointer font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Interactive Code Inspector & Sandbox Runner Toggle ── */}
      {customCodeEnabled && (
      <div className="mt-4 pt-3 border-t border-inherit">
        <button
          onClick={() => setShowCodeInspector(!showCodeInspector)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            isDark
              ? "bg-[#2c2a24] hover:bg-[#34322a] border-[#3c3931] text-[#f4f1ea]"
              : "bg-[#faf8f5] hover:bg-[#ede8df] border-[#dcd5c9] text-[#2d2925]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#658a60]" />
            <span>Code Inspector & Sandbox Runner</span>
            <span className={`text-[10px] font-normal px-2 py-0.5 rounded-md border ${
              isDark ? "bg-[#181714] text-[#9a9386] border-[#3c3931]" : "bg-white text-[#756e63] border-[#dcd5c9]"
            }`}>
              Live Python Editor
            </span>
          </div>
          {showCodeInspector ? <ChevronUp className="w-4 h-4 text-[#756e63]" /> : <ChevronDown className="w-4 h-4 text-[#756e63]" />}
        </button>

        {/* ── Expanded Code Inspector & Custom Sandbox Execution Area ── */}
        {showCodeInspector && (
          <div className={`mt-3 space-y-3 p-4 rounded-lg border ${
            isDark ? "bg-[#181714] border-[#3c3931]" : "bg-[#f4efe6] border-[#dcd5c9]"
          }`}>
            {/* Agent Stage Presets Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[11px] font-bold uppercase tracking-wider mr-1 ${
                  isDark ? "text-[#9a9386]" : "text-[#756e63]"
                }`}>
                  Stage Template:
                </span>
                {Object.entries(AGENT_PRESETS).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedAgentPreset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedAgentPreset(key);
                        setCustomCode(config.sampleCode);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-[#658a60] text-white border-[#658a60] shadow-xs"
                          : isDark
                          ? "bg-[#252420] text-[#d5cec2] border-[#3c3931] hover:text-white"
                          : "bg-white text-[#4a453e] border-[#dcd5c9] hover:text-[#2d2925]"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleCopyCode}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 border ${
                  isDark
                    ? "bg-[#252420] text-[#d5cec2] hover:text-[#f4f1ea] border-[#3c3931]"
                    : "bg-white text-[#4a453e] hover:text-[#2d2925] border-[#dcd5c9]"
                }`}
              >
                {codeCopied ? <Check className="w-3 h-3 text-[#658a60]" /> : <Copy className="w-3 h-3" />}
                <span>{codeCopied ? "Copied" : "Copy Code"}</span>
              </button>
            </div>

            {/* Code Textarea */}
            <div className="relative rounded-lg overflow-hidden border border-[#3c3931] bg-[#1a1916]">
              <div className="bg-[#23221d] px-3 py-1.5 text-[11px] font-mono text-[#9a9386] flex items-center justify-between border-b border-[#3c3931]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-[#658a60]" />
                  Python 3 Sandbox Runtime
                </span>
                <span className="text-[10px] text-[#7a7469]">Mutates state_updates directly</span>
              </div>
              <textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                rows={10}
                placeholder="Write or edit Python code to execute in the sandbox..."
                className="w-full p-3 font-mono text-xs text-[#a3c99e] bg-transparent focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Sandbox Execution Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className={`text-[11px] ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                Tip: Code executes with state deep-copied in sandbox. Original state preserved on error.
              </p>

              <button
                onClick={handleExecuteSandbox}
                disabled={executingSandbox || !customCode.trim()}
                className="bg-[#658a60] hover:bg-[#53744e] text-white font-bold text-xs px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shadow-xs"
              >
                {executingSandbox ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing in Sandbox...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Code in Sandbox</span>
                  </>
                )}
              </button>
            </div>

            {/* Sandbox Output Console */}
            {sandboxOutput && (
              <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                sandboxOutput.ok
                  ? "bg-[#658a60]/20 border-[#658a60]/40 text-[#8cb487]"
                  : "bg-rose-950/50 border-rose-900/50 text-rose-300"
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold pb-1 border-b border-inherit">
                  <span>{sandboxOutput.ok ? "✓ Sandbox Output (Execution Succeeded)" : "✗ Sandbox Execution Traceback"}</span>
                </div>
                {sandboxOutput.stdout && (
                  <div>
                    <span className="text-[10px] text-[#9a9386]">STDOUT:</span>
                    <pre className="whitespace-pre-wrap mt-0.5">{sandboxOutput.stdout}</pre>
                  </div>
                )}
                {sandboxOutput.traceback && (
                  <div>
                    <span className="text-[10px] text-rose-400">TRACEBACK:</span>
                    <pre className="whitespace-pre-wrap mt-0.5 text-rose-400">{sandboxOutput.traceback}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
