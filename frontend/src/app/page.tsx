"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import PipelineStepper from "../components/PipelineStepper";
import ExecutionControlPanel from "../components/ExecutionControlPanel";
import MetricsDashboard from "../components/MetricsDashboard";
import EDAGallery from "../components/EDAGallery";
import SHAPViewer from "../components/SHAPViewer";
import ArtifactDownloads from "../components/ArtifactDownloads";
import ErrorPanel from "../components/ErrorPanel";
import EmptyState from "../components/EmptyState";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../lib/ThemeContext";
import { getArtifactUrl, getRuns, getRunStatus, startRun } from "../lib/api";
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
  Play,
  RotateCcw,
  Check,
  Pause,
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

      if (data.length === 0) {
        setSelectedRunId(null);
        setActiveRun(null);
      } else if (!selectedRunId || !data.some((r) => r.run_id === selectedRunId)) {
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

  // Background polling when run is pending/running/paused
  useEffect(() => {
    if (
      !activeRun ||
      (activeRun.status !== "pending" &&
        activeRun.status !== "running" &&
        activeRun.status !== "paused")
    ) {
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
      setCommandError("Please upload a dataset CSV first.");
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "done":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#8cb487] bg-[#658a60]/20 border-[#658a60]/40"
              : "text-[#3f5f3b] bg-[#658a60]/15 border-[#658a60]/30"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case "paused":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#f59e0b] bg-[#d97706]/20 border-[#d97706]/40"
              : "text-[#b45309] bg-[#d97706]/15 border-[#d97706]/30"
          }`}>
            <Pause className="w-3.5 h-3.5" />
            Paused
          </span>
        );
      case "cancelled":
      case "failed":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-rose-400 bg-rose-950/40 border-rose-900/50"
              : "text-rose-700 bg-rose-50 border-rose-200"
          }`}>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            {status === "failed" ? "Failed" : "Cancelled"}
          </span>
        );
      case "running":
      case "pending":
        return (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#f59e0b] bg-[#d97706]/20 border-[#d97706]/40"
              : "text-[#b45309] bg-[#d97706]/15 border-[#d97706]/30"
          }`}>
            <Hourglass className="w-3.5 h-3.5 animate-spin text-[#d97706]" />
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
        ? "bg-[#181714] text-[#f4f1ea]"
        : "bg-[#f4f1ea] text-[#2d2925]"
    }`}>
      {/* ── Top Navbar ── */}
      <header className={`border-b sticky top-0 z-50 transition-colors ${
        isDark
          ? "border-[#3c3931] bg-[#1f1e1a]"
          : "border-[#dcd5c9] bg-[#f4f1ea]"
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#658a60] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              A
            </div>
            <div>
              <span className={`text-base font-bold tracking-tight block leading-tight ${
                isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
              }`}>
                AutoML Studio
              </span>
              <span className={`text-[10px] font-medium tracking-wide ${
                isDark ? "text-[#9a9386]" : "text-[#756e63]"
              }`}>
                Organic Autonomous Data Analyzer
              </span>
            </div>
          </div>

          {/* Workspace status and appearance */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${
              isDark
                ? "bg-[#252420] border-[#3c3931] text-[#d5cec2]"
                : "bg-[#f4efe6] border-[#dcd5c9] text-[#4a453e]"
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#658a60]" />
              <span className="font-medium">Local workspace</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Backend Alert Banner */}
      {apiUnreachable && (
        <div className={`border-b py-2.5 px-6 text-xs ${
          isDark
            ? "bg-rose-950/60 border-rose-900/60 text-rose-300"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                Cannot reach backend server. Make sure the API server is active.
              </span>
            </div>
            <button
              onClick={fetchAllRuns}
              className="underline font-semibold cursor-pointer text-[#d97706]"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#658a60]" />
              <p className={`text-[11px] font-bold uppercase tracking-widest ${
                isDark ? "text-[#9a9386]" : "text-[#756e63]"
              }`}>
                ANALYSIS WORKSPACE
              </p>
            </div>
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
              isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
            }`}>
              Start a new analysis
            </h1>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-[#d5cec2]" : "text-[#4a453e]"
            }`}>
              Upload a CSV, choose the column you want to predict, and the pipeline will prepare data, train a model, and generate explanations.
            </p>
          </div>

          {/* Right Mode Dropdown */}
          <div className="flex flex-col gap-1.5 self-start md:self-end">
            <label className={`text-[11px] font-semibold ${isDark ? "text-[#9a9386]" : "text-[#4a453e]"}`}>
              Problem type
            </label>
            <select
              value={commandProblemType}
              onChange={(e) => setCommandProblemType(e.target.value as ProblemType)}
              className={`font-medium text-sm rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#658a60] cursor-pointer min-w-[180px] transition ${
                isDark
                  ? "bg-[#252420] text-[#f4f1ea] border-[#3c3931]"
                  : "bg-white text-[#2d2925] border-[#dcd5c9]"
              }`}
            >
              <option value="classification">Classification</option>
              <option value="regression">Regression</option>
            </select>
          </div>
        </div>

        {/* Upload Card */}
        <div className={`border rounded-xl p-5 flex items-center gap-4 transition-colors ${
          isDark
            ? "bg-[#23221d] border-[#3c3931]"
            : "bg-white border-[#dcd5c9]"
        }`}>
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
            className="w-12 h-12 rounded-xl bg-[#658a60] hover:bg-[#53744e] text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
          >
            {commandFile ? (
              <Check className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Upload className="w-5 h-5 stroke-[2.2]" />
            )}
          </button>

          <div className="space-y-1">
            <h2 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
            }`}>
              {commandFile ? commandFile.name : "Upload a dataset"}
              {commandFile && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                  isDark ? "bg-[#658a60]/20 text-[#8cb487] border-[#658a60]/40" : "bg-[#658a60]/15 text-[#3f5f3b] border-[#658a60]/30"
                }`}>
                  Ready to run
                </span>
              )}
            </h2>
            <p className={`text-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
              {commandFile
                ? "Choose the target column below, then start the analysis."
                : "Select a CSV file from your computer."}
            </p>
          </div>
        </div>

        {/* Target input & Run Form */}
        <form onSubmit={handleQuickCommandSubmit} className={`rounded-xl border p-4 space-y-2 transition-colors ${
          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
        }`}>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className={`flex-1 rounded-lg flex items-center px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#658a60] border transition ${
              isDark
                ? "bg-[#181714] border-[#3c3931]"
                : "bg-[#faf8f5] border-[#dcd5c9]"
            }`}>
              <input
                type="text"
                placeholder='Target column, e.g. "Survived"'
                value={commandTarget}
                onChange={(e) => setCommandTarget(e.target.value)}
                className={`w-full bg-transparent font-medium text-sm focus:outline-none py-2 ${
                  isDark ? "text-[#f4f1ea] placeholder:text-[#7a7469]" : "text-[#2d2925] placeholder:text-[#948c80]"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isStarting}
              className="bg-[#658a60] hover:bg-[#53744e] disabled:opacity-60 text-white font-semibold text-sm px-6 py-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs"
            >
              {isStarting ? (
                <>
                  <Hourglass className="w-4 h-4 animate-spin text-white" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Run analysis</span>
                </>
              )}
            </button>
          </div>

          {commandError && (
            <p className={`text-xs p-2.5 rounded-lg border ${
              isDark
                ? "text-rose-300 bg-rose-950/50 border-rose-900/60"
                : "text-rose-700 bg-rose-50 border-rose-200"
            }`}>
              {commandError}
            </p>
          )}
        </form>

        {/* Analysis workspace */}
        <div ref={studioRef} className="pt-4 space-y-4">
          <div className={`border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 transition-colors ${
            isDark
              ? "bg-[#23221d] border-[#3c3931]"
              : "bg-white border-[#dcd5c9]"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isDark ? "text-[#9a9386]" : "text-[#756e63]"
              }`}>
                CURRENT ANALYSIS
              </span>

              {activeRun ? (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  isDark
                    ? "bg-[#181714] border-[#3c3931] text-[#f4f1ea]"
                    : "bg-[#f4efe6] border-[#dcd5c9] text-[#2d2925]"
                }`}>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#658a60]" />
                  <span>{activeRun.csv_filename}</span>
                  <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center ${
                    isDark ? "bg-[#2c2a24] text-[#9a9386]" : "bg-[#dcd5c9] text-[#4a453e]"
                  }`}>
                    {runs.length}
                  </span>
                </div>
              ) : (
                <span className={`text-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                  Select a run from history to inspect its results
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-1.5 rounded-lg transition border cursor-pointer font-medium ${
                  isDark
                    ? "bg-[#2c2a24] hover:bg-[#38362e] text-[#f4f1ea] border-[#3c3931]"
                    : "bg-[#faf8f5] hover:bg-[#ede8df] text-[#2d2925] border-[#dcd5c9]"
                }`}
              >
                + New run
              </button>

              <button
                onClick={fetchAllRuns}
                className={`px-3 py-1.5 rounded-lg transition border cursor-pointer flex items-center gap-1 font-medium ${
                  isDark
                    ? "bg-[#2c2a24] hover:bg-[#38362e] text-[#d5cec2] hover:text-[#f4f1ea] border-[#3c3931]"
                    : "bg-[#faf8f5] hover:bg-[#ede8df] text-[#4a453e] hover:text-[#2d2925] border-[#dcd5c9]"
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Refresh
              </button>

              {activeRun?.cleaned_csv_path && (
                <a
                  href={getArtifactUrl(activeRun.run_id, activeRun.cleaned_csv_path)}
                  download="cleaned_dataset.csv"
                  className={`px-3 py-1.5 rounded-lg transition border cursor-pointer font-medium ${
                    isDark
                      ? "bg-[#2c2a24] hover:bg-[#38362e] text-[#d5cec2] hover:text-[#f4f1ea] border-[#3c3931]"
                      : "bg-[#faf8f5] hover:bg-[#ede8df] text-[#4a453e] hover:text-[#2d2925] border-[#dcd5c9]"
                  }`}
                >
                  Export CSV
                </a>
              )}
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[640px] transition-colors ${
            isDark
              ? "bg-[#181714] border-[#3c3931]"
              : "bg-white border-[#dcd5c9]"
          }`}>
            {/* Left Sidebar */}
            <Sidebar
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRun={(id) => {
                setSelectedRunId(id);
                setActiveTab("overview");
              }}
              onRefreshRuns={fetchAllRuns}
            />

            {/* Main Workspace Area */}
            <main className={`flex-1 flex flex-col overflow-y-auto p-5 md:p-8 transition-colors ${
              isDark
                ? "bg-[#181714]"
                : "bg-[#faf8f5]"
            }`}>
              {!activeRun ? (
                <EmptyState />
              ) : (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  {/* Header / Active Run Meta */}
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
                    isDark ? "border-[#3c3931]" : "border-[#dcd5c9]"
                  }`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border text-[#658a60] ${
                          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
                        }`}>
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className={`text-xl font-bold tracking-tight ${
                              isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
                            }`}>
                              {activeRun.csv_filename}
                            </h2>
                            {getStatusBadge(activeRun.status)}
                          </div>
                        </div>
                      </div>
                      <div className={`flex flex-wrap items-center gap-3 text-xs pl-12 ${
                        isDark ? "text-[#9a9386]" : "text-[#756e63]"
                      }`}>
                        <span>
                          Target: <strong className="text-[#d97706] font-semibold">{activeRun.target_column}</strong>
                        </span>
                        <span className={isDark ? "text-[#3c3931]" : "text-[#dcd5c9]"}>•</span>
                        <span>
                          Problem: <strong className={`font-semibold capitalize ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>{activeRun.problem_type}</strong>
                        </span>
                        <span className={isDark ? "text-[#3c3931]" : "text-[#dcd5c9]"}>•</span>
                        <span className={`font-mono text-[11px] ${isDark ? "text-[#7a7469]" : "text-[#948c80]"}`}>ID: {activeRun.run_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Visualizer Stepper */}
                  <PipelineStepper
                    lastAgent={activeRun.last_agent}
                    overallStatus={activeRun.status}
                    retryCount={activeRun.retry_count}
                  />

                  {/* Execution Control Hub */}
                  <ExecutionControlPanel
                    run={activeRun}
                    onRefresh={() => {
                      fetchActiveRunDetail();
                      fetchAllRuns();
                    }}
                  />

                  {/* Error Diagnostics if failed */}
                  {activeRun.status === "failed" && (
                    <ErrorPanel
                      lastAgent={activeRun.last_agent}
                      retryCount={activeRun.retry_count}
                      errorTraceback={activeRun.error_traceback}
                    />
                  )}

                  {/* Tab Navigation Bar */}
                  <div className={`flex items-center gap-2 border-b ${
                    isDark ? "border-[#3c3931]" : "border-[#dcd5c9]"
                  }`}>
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-lg ${
                        activeTab === "overview"
                          ? isDark
                            ? "border-[#658a60] text-[#8cb487] bg-[#23221d] font-bold"
                            : "border-[#658a60] text-[#3f5f3b] bg-white font-bold"
                          : isDark
                          ? "border-transparent text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#23221d]"
                          : "border-transparent text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-[#658a60]" />
                      Performance Overview
                    </button>

                    <button
                      onClick={() => setActiveTab("eda")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-lg ${
                        activeTab === "eda"
                          ? isDark
                            ? "border-[#658a60] text-[#8cb487] bg-[#23221d] font-bold"
                            : "border-[#658a60] text-[#3f5f3b] bg-white font-bold"
                          : isDark
                          ? "border-transparent text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#23221d]"
                          : "border-transparent text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-[#658a60]" />
                      EDA Heatmaps & Plots
                    </button>

                    <button
                      onClick={() => setActiveTab("shap")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-lg ${
                        activeTab === "shap"
                          ? isDark
                            ? "border-[#658a60] text-[#8cb487] bg-[#23221d] font-bold"
                            : "border-[#658a60] text-[#3f5f3b] bg-white font-bold"
                          : isDark
                          ? "border-transparent text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#23221d]"
                          : "border-transparent text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-[#d97706]" />
                      SHAP Explainability
                    </button>

                    <button
                      onClick={() => setActiveTab("artifacts")}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition duration-150 cursor-pointer rounded-t-lg ${
                        activeTab === "artifacts"
                          ? isDark
                            ? "border-[#658a60] text-[#8cb487] bg-[#23221d] font-bold"
                            : "border-[#658a60] text-[#3f5f3b] bg-white font-bold"
                          : isDark
                          ? "border-transparent text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#23221d]"
                          : "border-transparent text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                      }`}
                    >
                      <Download className="w-4 h-4 text-[#658a60]" />
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
