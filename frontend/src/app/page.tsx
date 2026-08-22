"use client";

import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import PipelineStepper from "../components/PipelineStepper";
import MetricsDashboard from "../components/MetricsDashboard";
import EDAGallery from "../components/EDAGallery";
import SHAPViewer from "../components/SHAPViewer";
import ArtifactDownloads from "../components/ArtifactDownloads";
import ErrorPanel from "../components/ErrorPanel";
import EmptyState from "../components/EmptyState";
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
} from "lucide-react";

export default function DashboardPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<RunDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "eda" | "shap" | "artifacts">("overview");
  const [isStarting, setIsStarting] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  // Load all runs
  const fetchAllRuns = useCallback(async () => {
    try {
      const data = await getRuns();
      setRuns(data);
      setApiUnreachable(false);
      // Auto-select first run if none selected
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
    try {
      const res = await startRun(file, target, type);
      await fetchAllRuns();
      setSelectedRunId(res.run_id);
      setActiveTab("overview");
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "done":
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#08979D] bg-[#08979D]/15 border border-[#08979D]/30 px-3 py-1 rounded-full shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#08979D]" />
            Completed
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#B83E16] bg-[#B83E16]/15 border border-[#B83E16]/30 px-3 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case "running":
      case "pending":
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#CA651B] bg-[#FAC61B]/30 border border-[#FAC61B]/60 px-3 py-1 rounded-full animate-pulse">
            <Hourglass className="w-3.5 h-3.5 animate-spin text-[#CA651B]" />
            Processing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#E5DDD0] text-[#1C1917] overflow-hidden antialiased font-sans">
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

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-gradient-to-b from-[#E6DED4] via-[#DDD4C7] to-[#E3DBD0]">
        {/* Backend Connectivity Banner */}
        {apiUnreachable && (
          <div className="bg-[#B83E16]/15 border-b border-[#B83E16]/30 p-3 px-6 flex items-center justify-between text-xs text-[#B83E16]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B83E16]" />
              <span>
                Cannot reach FastAPI server at <strong className="font-bold text-[#1C1917]">http://127.0.0.1:8000</strong>. Ensure the backend is active.
              </span>
            </div>
            <button
              onClick={fetchAllRuns}
              className="text-xs underline hover:text-[#1C1917] font-bold cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!activeRun ? (
          <EmptyState />
        ) : (
          <div className="p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
            {/* Header / Active Run Meta */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#C8BCAB]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#FAF6F0] border border-[#C8BCAB] text-[#CA651B] shadow-2xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold text-[#1C1917] tracking-tight">
                        {activeRun.csv_filename}
                      </h1>
                      {getStatusBadge(activeRun.status)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#574E47] pl-12">
                  <span>
                    Target: <strong className="text-[#CA651B] font-bold">{activeRun.target_column}</strong>
                  </span>
                  <span className="text-[#C8BCAB]">•</span>
                  <span>
                    Problem: <strong className="text-[#1C1917] font-semibold capitalize">{activeRun.problem_type}</strong>
                  </span>
                  <span className="text-[#C8BCAB]">•</span>
                  <span className="font-mono text-[11px] text-[#786F68]">ID: {activeRun.run_id}</span>
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

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-[#C8BCAB]">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                  activeTab === "overview"
                    ? "border-[#CA651B] text-[#CA651B] bg-[#FAF6F0] shadow-2xs"
                    : "border-transparent text-[#574E47] hover:text-[#1C1917] hover:bg-[#FAF6F0]/60"
                }`}
              >
                <BarChart3 className="w-4 h-4 text-[#CA651B]" />
                Performance Overview
              </button>

              <button
                onClick={() => setActiveTab("eda")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                  activeTab === "eda"
                    ? "border-[#CA651B] text-[#CA651B] bg-[#FAF6F0] shadow-2xs"
                    : "border-transparent text-[#574E47] hover:text-[#1C1917] hover:bg-[#FAF6F0]/60"
                }`}
              >
                <ImageIcon className="w-4 h-4 text-[#08979D]" />
                EDA Heatmaps & Plots
              </button>

              <button
                onClick={() => setActiveTab("shap")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                  activeTab === "shap"
                    ? "border-[#CA651B] text-[#CA651B] bg-[#FAF6F0] shadow-2xs"
                    : "border-transparent text-[#574E47] hover:text-[#1C1917] hover:bg-[#FAF6F0]/60"
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#FAC61B]" />
                SHAP Explainability
              </button>

              <button
                onClick={() => setActiveTab("artifacts")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 cursor-pointer rounded-t-xl ${
                  activeTab === "artifacts"
                    ? "border-[#CA651B] text-[#CA651B] bg-[#FAF6F0] shadow-2xs"
                    : "border-transparent text-[#574E47] hover:text-[#1C1917] hover:bg-[#FAF6F0]/60"
                }`}
              >
                <Download className="w-4 h-4 text-[#B83E16]" />
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
  );
}
