"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import PipelineStepper from "../components/PipelineStepper";
import MetricsDashboard from "../components/MetricsDashboard";
import EDAGallery from "../components/EDAGallery";
import SHAPViewer from "../components/SHAPViewer";
import ArtifactDownloads from "../components/ArtifactDownloads";
import ErrorPanel from "../components/ErrorPanel";
import EmptyState from "../components/EmptyState";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../lib/ThemeContext";
import { getRuns, getRunStatus, startRun } from "../lib/api";
import { ProblemType, RunDetail, RunSummary } from "../lib/types";
import {
  BarChart3,
  Image as ImageIcon,
  Sparkles,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  XCircle,
  Upload,
  Cpu,
  Play,
  RotateCcw,
  Check,
} from "lucide-react";

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<RunDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "eda" | "shap" | "artifacts">("overview");
  const [isStarting, setIsStarting] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  // Quick Command Bar States
  const [commandTarget, setCommandTarget] = useState("");
  const [commandProblemType, setCommandProblemType] = useState<ProblemType>("classification");
  const [commandFile, setCommandFile] = useState<File | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);

  // Load all runs
  const fetchAllRuns = useCallback(async () => {
    try {
      const data = await getRuns();
      setRuns(data);
      setApiUnreachable(false);
      if (!selectedRunId && data.length > 0) {
        setSelectedRunId(data[0].run_id);
      }
    } catch {
      setApiUnreachable(true);
    }
  }, [selectedRunId]);

  // Load selected run details
  const fetchActiveRunDetail = useCallback(async () => {
    if (!selectedRunId) return;
    try {
      const detail = await getRunStatus(selectedRunId);
      if (detail) {
        setActiveRun(detail);
        setApiUnreachable(false);
      }
    } catch {
      setApiUnreachable(true);
    }
  }, [selectedRunId]);

  // Initial load
  useEffect(() => {
    fetchAllRuns();
  }, [fetchAllRuns]);

  // Refetch when selected run changes
  useEffect(() => {
    if (selectedRunId) {
      fetchActiveRunDetail();
    }
  }, [selectedRunId, fetchActiveRunDetail]);

  // Background polling when run is pending/running
  useEffect(() => {
    if (!activeRun || (activeRun.status !== "pending" && activeRun.status !== "running")) {
      return;
    }

    const interval = setInterval(() => {
      fetchActiveRunDetail();
      fetchAllRuns();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRun, fetchActiveRunDetail, fetchAllRuns]);

  // Handler for starting a new run
  const handleStartRun = async (file: File, target: string, type: ProblemType) => {
    setIsStarting(true);
    setCommandError(null);
    try {
      const res = await startRun(file, target, type);
      await fetchAllRuns();
      setSelectedRunId(res.run_id);
      setActiveTab("overview");
      setCommandTarget("");
      setCommandFile(null);
      if (studioRef.current) {
        studioRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err: any) {
      setCommandError(err.message || "Failed to start pipeline run.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleQuickCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandFile) {
      setCommandError("Please click the orange icon or upload a dataset first.");
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    if (!commandTarget.trim()) {
      setCommandError("Please specify the target column name.");
      return;
    }
    handleStartRun(commandFile, commandTarget.trim(), commandProblemType);
  };

  const handleQuickTry = (target: string, type: ProblemType) => {
    setCommandTarget(target);
    setCommandProblemType(type);
    setCommandError(null);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "done":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-xs ${
            isDark
              ? "text-[#34d399] bg-[#0f2e26] border border-[#34d399]/40"
              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
            Completed
          </span>
        );
      case "failed":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-xs ${
            isDark
              ? "text-[#f87171] bg-[#2d1215] border border-[#7f1d1d]/60"
              : "text-rose-700 bg-rose-50 border border-rose-200"
          }`}>
            <XCircle className="w-3.5 h-3.5 text-[#f87171]" />
            Failed
          </span>
        );
      case "running":
      case "pending":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-pulse shadow-xs ${
            isDark
              ? "text-[#eb5e41] bg-[#174337] border border-[#eb5e41]/60"
              : "text-blue-600 bg-blue-50 border border-blue-200"
          }`}>
            <Hourglass className="w-3.5 h-3.5 animate-spin text-[#eb5e41]" />
            Processing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen relative overflow-x-hidden transition-colors duration-200 ${
      isDark
        ? "bg-[#081d18] text-[#f4f3ee]"
        : "bg-[#f8fafc] text-[#0f172a]"
    }`}>
      {/* ── Top Navbar (Matching VoiceCart Header) ── */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors ${
        isDark
          ? "border-[#1e4e42] bg-[#081d18]/90"
          : "border-slate-200 bg-white/90 shadow-2xs"
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border-2 border-[#eb5e41] flex items-center justify-center shadow-md shadow-[#eb5e41]/20">
              <div className="w-2.5 h-2.5 rounded-full bg-[#eb5e41]" />
            </div>
            <span className={`font-serif-display text-lg font-bold tracking-tight ${
              isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              AutoML Studio
            </span>
          </div>

          {/* Right Header Badges / Actions & Theme Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              isDark
                ? "bg-[#12382f] border-[#1e4e42] text-[#98bbaf]"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}>
              <Cpu className="w-3.5 h-3.5 text-[#eb5e41]" />
              <span>Multi-Agent Mode</span>
            </div>

            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              isDark
                ? "bg-[#12382f] border-[#1e4e42] text-[#98bbaf]"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
              <span>LangGraph Active</span>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              isDark
                ? "bg-[#12382f] border-[#1e4e42] text-[#98bbaf]"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
              <span>Groq LLaMA 3.3</span>
            </div>

            {/* Theme Toggle (Light / Dark / System) */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Backend Alert Banner */}
      {apiUnreachable && (
        <div className={`border-b py-2.5 px-6 text-xs ${
          isDark
            ? "bg-[#2d1215] border-[#7f1d1d]/60 text-[#f87171]"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Cannot reach FastAPI server at <strong>http://127.0.0.1:8000</strong>. Ensure the backend is active.
              </span>
            </div>
            <button
              onClick={fetchAllRuns}
              className="underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Main Container (Matching VoiceCart Hero & Form Layout) ── */}
      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16 space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className={`text-[11px] font-bold uppercase tracking-widest ${
              isDark ? "text-[#6b9386]" : "text-slate-400"
            }`}>
              VOICE & MULTI-AGENT DATA SCIENTIST
            </p>
            <h1 className={`text-4xl md:text-6xl font-serif-display font-medium tracking-tight leading-[1.1] ${
              isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              Your data, analyzed<br />plainly.
            </h1>
            <p className={`text-sm max-w-xl leading-relaxed ${
              isDark ? "text-[#98bbaf]" : "text-slate-500"
            }`}>
              Add datasets, clean missing values, engineer non-leaking features, optimize Bayesian models with Optuna, and explain predictions hands free.
            </p>
          </div>

          {/* Right Mode Dropdown Pill */}
          <div className="flex flex-col gap-1.5 self-start md:self-end">
            <label className={`text-[11px] font-medium ${isDark ? "text-[#6b9386]" : "text-slate-400"}`}>
              Recognition Problem
            </label>
            <select
              value={commandProblemType}
              onChange={(e) => setCommandProblemType(e.target.value as ProblemType)}
              className={`font-semibold text-xs rounded-xl px-4 py-2.5 shadow-md border focus:outline-none focus:ring-2 focus:ring-[#eb5e41] cursor-pointer min-w-[160px] ${
                isDark
                  ? "bg-white text-[#0a241e] border-transparent"
                  : "bg-white text-slate-800 border-slate-200 shadow-sm"
              }`}
            >
              <option value="classification">Classification (US)</option>
              <option value="regression">Regression (Continuous)</option>
            </select>
          </div>
        </div>

        {/* ── Action Card (Matching the large VoiceCart mic box) ── */}
        <div className={`border rounded-2xl p-6 flex items-center gap-5 shadow-lg relative overflow-hidden transition-colors ${
          isDark
            ? "bg-[#12382f] border-[#1e4e42]"
            : "bg-white border-slate-200 shadow-md"
        }`}>
          {/* Circular Coral Action Trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setCommandFile(e.target.files[0]);
                setCommandError(null);
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload CSV dataset"
            className="w-16 h-16 rounded-full bg-[#eb5e41] hover:bg-[#d94b2c] text-white flex items-center justify-center shadow-lg shadow-[#eb5e41]/30 transition transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            {commandFile ? (
              <Check className="w-7 h-7" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </button>

          <div className="space-y-1">
            <h2 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              {commandFile ? `Loaded: ${commandFile.name}` : "Tap button to upload dataset"}
              {commandFile && (
                <span className="text-[11px] font-normal bg-[#0f2e26] text-[#34d399] border border-[#34d399]/40 px-2 py-0.5 rounded-full">
                  Ready
                </span>
              )}
            </h2>
            <p className={`text-xs ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              {commandFile
                ? "Dataset attached. Specify target column below and tap 'Run command' to start."
                : 'Say "add Titanic dataset" or tap the icon to select your CSV file.'}
            </p>
          </div>
        </div>

        {/* ── Quick Try Row (Matching VoiceCart Quick Try Pills) ── */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`text-[11px] font-bold uppercase tracking-wider mr-1 ${
            isDark ? "text-[#6b9386]" : "text-slate-400"
          }`}>
            QUICK TRY:
          </span>

          <button
            onClick={() => handleQuickTry("Survived", "classification")}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition shadow-2xs cursor-pointer text-xs ${
              isDark
                ? "bg-white text-[#0a241e] hover:bg-[#f4f3ee]"
                : "bg-slate-900 text-white hover:bg-black"
            }`}
          >
            Survived (Titanic)
          </button>

          <button
            onClick={() => handleQuickTry("Price", "regression")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer text-xs border ${
              isDark
                ? "bg-[#12382f] text-[#f4f3ee] border-[#1e4e42] hover:border-[#eb5e41]/60"
                : "bg-white text-slate-700 border-slate-200 hover:border-[#eb5e41]"
            }`}
          >
            Price (Housing)
          </button>

          <button
            onClick={() => handleQuickTry("Churn", "classification")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer text-xs border ${
              isDark
                ? "bg-[#12382f] text-[#f4f3ee] border-[#1e4e42] hover:border-[#eb5e41]/60"
                : "bg-white text-slate-700 border-slate-200 hover:border-[#eb5e41]"
            }`}
          >
            Churn (Customers)
          </button>

          <button
            onClick={() => handleQuickTry("Default", "classification")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer text-xs border ${
              isDark
                ? "bg-[#12382f] text-[#f4f3ee] border-[#1e4e42] hover:border-[#eb5e41]/60"
                : "bg-white text-slate-700 border-slate-200 hover:border-[#eb5e41]"
            }`}
          >
            Default (Credit Risk)
          </button>

          <button
            onClick={() => {
              setCommandTarget("");
              setCommandFile(null);
              setCommandError(null);
            }}
            className={`px-3.5 py-1.5 rounded-full border transition cursor-pointer text-xs ${
              isDark
                ? "bg-[#12382f] text-[#98bbaf] border-[#1e4e42] hover:text-[#f4f3ee]"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-900"
            }`}
          >
            clear target
          </button>
        </div>

        {/* ── White Command / Target Input Bar (Matching VoiceCart Command Bar) ── */}
        <form onSubmit={handleQuickCommandSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className={`flex-1 rounded-xl shadow-md flex items-center px-4 py-1.5 focus-within:ring-2 focus-within:ring-[#eb5e41] border ${
              isDark
                ? "bg-white border-transparent"
                : "bg-white border-slate-200"
            }`}>
              <input
                type="text"
                placeholder='Type target column name, e.g. "Survived", "Price", "Churn", "Outcome"'
                value={commandTarget}
                onChange={(e) => setCommandTarget(e.target.value)}
                className="w-full bg-transparent text-[#0a241e] font-medium text-xs sm:text-sm placeholder-[#738a83] focus:outline-none py-2"
              />
            </div>

            <button
              type="submit"
              disabled={isStarting}
              className="bg-[#eb5e41] hover:bg-[#d94b2c] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm px-7 py-3 rounded-xl shadow-md shadow-[#eb5e41]/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              {isStarting ? (
                <>
                  <Hourglass className="w-4 h-4 animate-spin text-white" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Run command</span>
                </>
              )}
            </button>
          </div>

          {commandError && (
            <p className={`text-xs p-2.5 rounded-xl border ${
              isDark
                ? "text-[#f87171] bg-[#2d1215] border-[#7f1d1d]/60"
                : "text-rose-600 bg-rose-50 border-rose-200"
            }`}>
              {commandError}
            </p>
          )}
        </form>

        {/* ── Studio Frame with Sidebar and Active Analysis ── */}
        <div ref={studioRef} className="pt-4 space-y-4">
          {/* MY LISTS Header Strip (Matching Screenshot) */}
          <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md transition-colors ${
            isDark
              ? "bg-[#12382f] border-[#1e4e42]"
              : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isDark ? "text-[#6b9386]" : "text-slate-400"
              }`}>
                MY LISTS
              </span>

              {activeRun ? (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  isDark
                    ? "bg-[#174337] border-[#1e4e42] text-[#f4f3ee]"
                    : "bg-slate-100 border-slate-200 text-slate-800"
                }`}>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#eb5e41]" />
                  <span>{activeRun.csv_filename}</span>
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                    isDark ? "bg-[#0a241e] text-[#98bbaf]" : "bg-slate-200 text-slate-600"
                  }`}>
                    {runs.length}
                  </span>
                </div>
              ) : (
                <span className={`text-xs ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
                  No active analysis selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-1.5 rounded-lg transition border cursor-pointer ${
                  isDark
                    ? "bg-[#174337] hover:bg-[#1f5647] text-[#f4f3ee] border-[#1e4e42]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                }`}
              >
                + New run
              </button>

              <button
                onClick={fetchAllRuns}
                className={`px-3 py-1.5 rounded-lg transition border cursor-pointer flex items-center gap-1 ${
                  isDark
                    ? "bg-[#174337] hover:bg-[#1f5647] text-[#98bbaf] hover:text-[#f4f3ee] border-[#1e4e42]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200"
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Refresh
              </button>

              {activeRun?.cleaned_csv_path && (
                <a
                  href={`http://127.0.0.1:8000/runs/${activeRun.run_id}/artifacts/cleaned_dataset.csv`}
                  download="cleaned_dataset.csv"
                  className={`px-3 py-1.5 rounded-lg transition border cursor-pointer ${
                    isDark
                      ? "bg-[#174337] hover:bg-[#1f5647] text-[#98bbaf] hover:text-[#f4f3ee] border-[#1e4e42]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200"
                  }`}
                >
                  Export CSV
                </a>
              )}
            </div>
          </div>

          {/* Main App Frame Card */}
          <div className={`border rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[640px] transition-colors ${
            isDark
              ? "bg-[#0a241e] border-[#1e4e42]"
              : "bg-white border-slate-200 shadow-md"
          }`}>
            {/* Left Sidebar */}
            <Sidebar
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRun={(id) => {
                setSelectedRunId(id);
                setActiveTab("overview");
              }}
              onStartRun={handleStartRun}
              onRefreshRuns={fetchAllRuns}
              isStarting={isStarting}
            />

            {/* Main Workspace Area */}
            <main className={`flex-1 flex flex-col overflow-y-auto p-5 md:p-8 transition-colors ${
              isDark
                ? "bg-[#081d18]"
                : "bg-slate-50/50"
            }`}>
              {!activeRun ? (
                <EmptyState />
              ) : (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  {/* Header / Active Run Meta */}
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
                    isDark ? "border-[#1e4e42]" : "border-slate-200"
                  }`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border text-[#eb5e41] shadow-2xs ${
                          isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200"
                        }`}>
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className={`text-xl font-bold tracking-tight font-serif-display ${
                              isDark ? "text-[#f4f3ee]" : "text-slate-900"
                            }`}>
                              {activeRun.csv_filename}
                            </h2>
                            {getStatusBadge(activeRun.status)}
                          </div>
                        </div>
                      </div>
                      <div className={`flex flex-wrap items-center gap-3 text-xs pl-12 ${
                        isDark ? "text-[#98bbaf]" : "text-slate-500"
                      }`}>
                        <span>
                          Target: <strong className="text-[#eb5e41] font-semibold">{activeRun.target_column}</strong>
                        </span>
                        <span className={isDark ? "text-[#1e4e42]" : "text-slate-300"}>•</span>
                        <span>
                          Problem: <strong className={`font-semibold capitalize ${isDark ? "text-[#f4f3ee]" : "text-slate-800"}`}>{activeRun.problem_type}</strong>
                        </span>
                        <span className={isDark ? "text-[#1e4e42]" : "text-slate-300"}>•</span>
                        <span className="font-mono text-[11px] opacity-70">ID: {activeRun.run_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Visualizer Stepper */}
                  <PipelineStepper
                    lastAgent={activeRun.last_agent}
                    overallStatus={activeRun.status}
                    retryCount={activeRun.retry_count}
                  />

                  {/* Error Diagnostics if failed */}
                  {activeRun.status === "failed" && (
                    <ErrorPanel
                      lastAgent={activeRun.last_agent}
                      retryCount={activeRun.retry_count}
                      errorTraceback={activeRun.error_traceback}
                    />
                  )}

                  {/* Tab Navigation Pill Bar */}
                  <div className={`flex items-center gap-2 border-b ${
                    isDark ? "border-[#1e4e42]" : "border-slate-200"
                  }`}>
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                        activeTab === "overview"
                          ? isDark
                            ? "border-[#eb5e41] text-[#eb5e41] bg-[#12382f] shadow-xs font-bold"
                            : "border-[#eb5e41] text-[#eb5e41] bg-white shadow-xs font-bold"
                          : isDark
                          ? "border-transparent text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#12382f]/60"
                          : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-[#eb5e41]" />
                      Performance Overview
                    </button>

                    <button
                      onClick={() => setActiveTab("eda")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                        activeTab === "eda"
                          ? isDark
                            ? "border-[#eb5e41] text-[#eb5e41] bg-[#12382f] shadow-xs font-bold"
                            : "border-[#eb5e41] text-[#eb5e41] bg-white shadow-xs font-bold"
                          : isDark
                          ? "border-transparent text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#12382f]/60"
                          : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-[#eb5e41]" />
                      EDA Heatmaps & Plots
                    </button>

                    <button
                      onClick={() => setActiveTab("shap")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                        activeTab === "shap"
                          ? isDark
                            ? "border-[#eb5e41] text-[#eb5e41] bg-[#12382f] shadow-xs font-bold"
                            : "border-[#eb5e41] text-[#eb5e41] bg-white shadow-xs font-bold"
                          : isDark
                          ? "border-transparent text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#12382f]/60"
                          : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-[#eb5e41]" />
                      SHAP Explainability
                    </button>

                    <button
                      onClick={() => setActiveTab("artifacts")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                        activeTab === "artifacts"
                          ? isDark
                            ? "border-[#eb5e41] text-[#eb5e41] bg-[#12382f] shadow-xs font-bold"
                            : "border-[#eb5e41] text-[#eb5e41] bg-white shadow-xs font-bold"
                          : isDark
                          ? "border-transparent text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#12382f]/60"
                          : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Download className="w-4 h-4 text-[#eb5e41]" />
                      Artifact Downloads
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="pt-2">
                    {activeTab === "overview" && (
                      <div className="space-y-6">
                        <MetricsDashboard metrics={activeRun.metrics} problemType={activeRun.problem_type} />
                        <ArtifactDownloads
                          runId={activeRun.run_id}
                          cleanedCsvPath={activeRun.cleaned_csv_path}
                          modelPath={activeRun.model_path}
                        />
                      </div>
                    )}

                    {activeTab === "eda" && (
                      <EDAGallery
                        runId={activeRun.run_id}
                        edaPlotPaths={activeRun.eda_plot_paths}
                        status={activeRun.status}
                      />
                    )}

                    {activeTab === "shap" && (
                      <SHAPViewer
                        runId={activeRun.run_id}
                        shapPlotPath={activeRun.shap_plot_path}
                        status={activeRun.status}
                      />
                    )}

                    {activeTab === "artifacts" && (
                      <ArtifactDownloads
                        runId={activeRun.run_id}
                        cleanedCsvPath={activeRun.cleaned_csv_path}
                        modelPath={activeRun.model_path}
                      />
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </main>
    </div>
  );
}
