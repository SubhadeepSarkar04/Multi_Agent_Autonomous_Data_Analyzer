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
} from "lucide-react";
import { RunSummary, ProblemType } from "../lib/types";

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
        return <CheckCircle2 className="w-4 h-4 text-[#08979D] shrink-0" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-[#B83E16] shrink-0" />;
      case "running":
      case "pending":
        return <Hourglass className="w-4 h-4 text-[#CA651B] animate-spin shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-[#786F68] shrink-0" />;
    }
  };

  return (
    <aside className="w-80 border-r border-[#C8BCAB] bg-[#ECE4D8] flex flex-col h-screen shrink-0 text-[#1C1917] shadow-xs">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#C8BCAB] flex items-center justify-between bg-gradient-to-r from-[#ECE4D8] to-[#E5DDD0]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#CA651B] to-[#FAC61B] text-white shadow-xs">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#1C1917] text-sm tracking-tight">
              AutoML Co-Pilot
            </h1>
            <p className="text-[11px] text-[#CA651B] font-bold">Autonomous Multi-Agent</p>
          </div>
        </div>
        <button
          onClick={onRefreshRuns}
          title="Refresh runs"
          className="p-1.5 rounded-lg text-[#574E47] hover:text-[#1C1917] hover:bg-[#DDD4C5] transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* New Run Form */}
        <section className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#C8BCAB] space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#CA651B]">
              Launch New Analysis
            </h2>
            <span className="w-2 h-2 rounded-full bg-[#FAC61B] animate-ping" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File Upload Dropzone */}
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">Upload CSV Dataset</label>
              <label
                className={`flex flex-col items-center justify-center border border-dashed rounded-xl p-3.5 cursor-pointer transition duration-150 ${
                  file
                    ? "border-[#CA651B] bg-[#FAC61B]/15 text-[#1C1917]"
                    : "border-[#C8BCAB] bg-[#E5DDD0] hover:bg-[#DDD4C5] hover:border-[#CA651B] text-[#574E47] hover:text-[#1C1917]"
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
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-[#CA651B]" />
                    <span className="truncate font-bold text-[#1C1917]">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-4 h-4 mb-1 text-[#CA651B]" />
                    <span className="text-xs font-semibold">Select or drop dataset (.csv)</span>
                  </div>
                )}
              </label>
            </div>

            {/* Target Column */}
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">Target Column</label>
              <input
                type="text"
                placeholder="e.g. Survived, Price, Churn"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-[#E5DDD0] border border-[#C8BCAB] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#786F68] focus:outline-none focus:border-[#CA651B] focus:ring-1 focus:ring-[#CA651B]/30 transition"
              />
            </div>

            {/* Problem Type */}
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">Problem Type</label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value as ProblemType)}
                className="w-full bg-[#E5DDD0] border border-[#C8BCAB] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#CA651B] focus:ring-1 focus:ring-[#CA651B]/30 transition cursor-pointer"
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
              </select>
            </div>

            {errorMsg && (
              <p className="text-xs text-[#B83E16] bg-[#B83E16]/15 p-2.5 rounded-xl border border-[#B83E16]/30">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isStarting || !file || !targetColumn.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-[#CA651B] to-[#FAC61B] hover:from-[#d56d22] hover:to-[#fbc92b] disabled:opacity-50 disabled:pointer-events-none text-[#1C1917] py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-[#CA651B]/20 transition duration-150 cursor-pointer active:scale-[0.99]"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1C1917]" />
                  <span>Starting Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-[#1C1917]" />
                  <span>Run Pipeline</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Past Runs Section */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#CA651B]">Analysis History</h2>
            <span className="text-xs text-[#08979D] bg-[#08979D]/15 border border-[#08979D]/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {runs.length}
            </span>
          </div>

          {runs.length === 0 ? (
            <div className="text-center py-6 px-3 bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl">
              <p className="text-xs text-[#574E47]">No past runs yet.</p>
              <p className="text-[11px] text-[#786F68] mt-0.5">Upload a dataset above to start.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-440px)] overflow-y-auto pr-1">
              {runs.map((r) => {
                const isSelected = r.run_id === selectedRunId;
                return (
                  <button
                    key={r.run_id}
                    onClick={() => onSelectRun(r.run_id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#FAF6F0] border-[#CA651B] text-[#1C1917] shadow-xs ring-1 ring-[#CA651B]/40"
                        : "bg-[#FAF6F0]/80 border-[#C8BCAB] hover:bg-[#FAF6F0] hover:border-[#CA651B]/50 text-[#1C1917]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate text-[#1C1917]">{r.csv_filename}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#574E47]">
                        <span className="truncate text-[#CA651B] font-bold">Target: {r.target_column}</span>
                        <span className="text-[#C8BCAB]">•</span>
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
      <div className="p-3 border-t border-[#C8BCAB] bg-[#ECE4D8] text-[11px] text-[#574E47] text-center font-bold">
        Powered by LangGraph & Groq LLMs
      </div>
    </aside>
  );
}
