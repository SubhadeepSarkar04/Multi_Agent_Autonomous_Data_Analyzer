"use client";

import React, { useState } from "react";
import {
  Upload,
  Play,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  RefreshCw,
  FileSpreadsheet,
  Cpu,
  Sparkles,
} from "lucide-react";
import { RunSummary, ProblemType } from "../lib/types";
import { useTheme } from "../lib/ThemeContext";

interface SidebarProps {
  runs: RunSummary[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onStartRun: (file: File, target: string, type: ProblemType) => Promise<void>;
  onRefreshRuns: () => void;
  isStarting: boolean;
}

export default function Sidebar({
  runs,
  selectedRunId,
  onSelectRun,
  onStartRun,
  onRefreshRuns,
  isStarting,
}: SidebarProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [file, setFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState("");
  const [problemType, setProblemType] = useState<ProblemType>("classification");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!file) {
      setErrorMsg("Please select a CSV dataset.");
      return;
    }
    if (!targetColumn.trim()) {
      setErrorMsg("Please specify the target column name.");
      return;
    }

    try {
      await onStartRun(file, targetColumn.trim(), problemType);
      setFile(null);
      setTargetColumn("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start pipeline run.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-[#f87171] shrink-0" />;
      case "running":
      case "pending":
        return <Hourglass className="w-4 h-4 text-[#eb5e41] animate-spin shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <aside className={`w-80 border-r flex flex-col h-full shrink-0 shadow-lg transition-colors ${
      isDark
        ? "border-[#1e4e42] bg-[#0a241e] text-[#f4f3ee]"
        : "border-slate-200 bg-slate-50 text-slate-900"
    }`}>
      {/* Brand Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDark ? "border-[#1e4e42] bg-[#081d18]" : "border-slate-200 bg-white"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#eb5e41] text-white shadow-md shadow-[#eb5e41]/20">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className={`font-bold text-sm tracking-tight flex items-center gap-1.5 font-serif-display ${
              isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              AutoML Studio
              <span className={`text-[10px] font-sans font-semibold border px-1.5 py-0.2 rounded-full ${
                isDark
                  ? "bg-[#174337] text-[#98bbaf] border-[#1e4e42]"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                v2.0
              </span>
            </h1>
            <p className={`text-[11px] font-medium ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Autonomous Agent Engine
            </p>
          </div>
        </div>
        <button
          onClick={onRefreshRuns}
          title="Refresh runs"
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            isDark
              ? "text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#12382f]"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* New Run Form */}
        <section className={`p-4 rounded-2xl border space-y-3.5 shadow-sm transition-colors ${
          isDark
            ? "bg-[#12382f] border-[#1e4e42]"
            : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? "text-[#98bbaf]" : "text-slate-600"
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-[#eb5e41]" />
              Launch Analysis
            </h2>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#eb5e41] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#eb5e41]"></span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File Upload Dropzone */}
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-[#98bbaf]" : "text-slate-700"}`}>
                Upload CSV Dataset
              </label>
              <label
                className={`flex flex-col items-center justify-center border border-dashed rounded-xl p-3.5 cursor-pointer transition duration-150 ${
                  file
                    ? isDark
                      ? "border-[#eb5e41] bg-[#174337] text-[#f4f3ee]"
                      : "border-[#eb5e41] bg-orange-50 text-slate-900"
                    : isDark
                    ? "border-[#1e4e42] bg-[#0d2822] hover:bg-[#174337] hover:border-[#eb5e41]/60 text-[#98bbaf] hover:text-[#f4f3ee]"
                    : "border-slate-300 bg-slate-50 hover:bg-orange-50/40 hover:border-[#eb5e41] text-slate-600"
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                {file ? (
                  <div className="flex items-center gap-2 text-xs truncate max-w-full px-1">
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-[#eb5e41]" />
                    <span className="truncate font-semibold">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-4 h-4 mb-1 text-[#eb5e41]" />
                    <span className="text-xs font-medium">Select or drop dataset (.csv)</span>
                  </div>
                )}
              </label>
            </div>

            {/* Target Column */}
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-[#98bbaf]" : "text-slate-700"}`}>
                Target Column
              </label>
              <input
                type="text"
                placeholder="e.g. Survived, Price, Churn"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#eb5e41] focus:ring-1 focus:ring-[#eb5e41]/30 transition ${
                  isDark
                    ? "bg-[#0d2822] border-[#1e4e42] text-[#f4f3ee] placeholder-[#6b9386]"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Problem Type */}
            <div>
              <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-[#98bbaf]" : "text-slate-700"}`}>
                Problem Type
              </label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value as ProblemType)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#eb5e41] focus:ring-1 focus:ring-[#eb5e41]/30 transition cursor-pointer ${
                  isDark
                    ? "bg-[#0d2822] border-[#1e4e42] text-[#f4f3ee]"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
              </select>
            </div>

            {errorMsg && (
              <p className={`text-xs p-2.5 rounded-xl border ${
                isDark
                  ? "text-[#f87171] bg-[#2d1215] border-[#7f1d1d]/60"
                  : "text-rose-600 bg-rose-50 border-rose-200"
              }`}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isStarting || !file || !targetColumn.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-[#eb5e41] hover:bg-[#d94b2c] disabled:opacity-50 disabled:pointer-events-none text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-md shadow-[#eb5e41]/20 transition duration-150 cursor-pointer active:scale-[0.99]"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Starting Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Run Pipeline</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Past Runs Section */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-[#6b9386]" : "text-slate-400"
            }`}>
              Analysis History
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold border ${
              isDark
                ? "text-[#eb5e41] bg-[#174337] border-[#1e4e42]"
                : "text-[#eb5e41] bg-orange-50 border-orange-200"
            }`}>
              {runs.length}
            </span>
          </div>

          {runs.length === 0 ? (
            <div className={`text-center py-6 px-3 border rounded-2xl ${
              isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200"
            }`}>
              <p className={`text-xs ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>No past runs yet.</p>
              <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#6b9386]" : "text-slate-400"}`}>Upload a dataset above to start.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-460px)] overflow-y-auto pr-1">
              {runs.map((r) => {
                const isSelected = r.run_id === selectedRunId;
                return (
                  <button
                    key={r.run_id}
                    onClick={() => onSelectRun(r.run_id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? isDark
                          ? "bg-[#174337] border-[#eb5e41] text-[#f4f3ee] shadow-sm ring-1 ring-[#eb5e41]/40 font-semibold"
                          : "bg-orange-50/70 border-[#eb5e41] text-slate-900 shadow-sm ring-1 ring-[#eb5e41]/30 font-semibold"
                        : isDark
                        ? "bg-[#12382f] border-[#1e4e42] hover:bg-[#174337]/70 text-[#98bbaf]"
                        : "bg-white border-slate-200 hover:bg-slate-100/70 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate">{r.csv_filename}</span>
                      </div>
                      <div className={`flex items-center gap-2 mt-0.5 text-[11px] ${
                        isDark ? "text-[#6b9386]" : "text-slate-400"
                      }`}>
                        <span className="truncate text-[#eb5e41] font-medium">Target: {r.target_column}</span>
                        <span>•</span>
                        <span className="capitalize">{r.problem_type}</span>
                      </div>
                    </div>
                    {getStatusBadge(r.status)}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Footer Info */}
      <div className={`p-3 border-t text-[11px] text-center font-medium ${
        isDark ? "border-[#1e4e42] bg-[#081d18] text-[#6b9386]" : "border-slate-200 bg-white text-slate-400"
      }`}>
        Powered by LangGraph & Groq LLMs
      </div>
    </aside>
  );
}
