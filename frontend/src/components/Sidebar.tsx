"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  RefreshCw,
  Cpu,
  Pause,
  FileSpreadsheet,
  History,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";
import { RunSummary } from "../lib/types";
import { useTheme } from "../lib/ThemeContext";
import { deleteRun, deleteAllRuns } from "../lib/api";

interface SidebarProps {
  runs: RunSummary[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onRefreshRuns: () => void;
}

export default function Sidebar({
  runs,
  selectedRunId,
  onSelectRun,
  onRefreshRuns,
}: SidebarProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-[#658a60] shrink-0" />;
      case "paused":
        return <Pause className="w-4 h-4 text-[#d97706] shrink-0" />;
      case "cancelled":
      case "failed":
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case "running":
      case "pending":
        return <Hourglass className="w-4 h-4 text-[#d97706] animate-spin shrink-0" />;
      default:
        return <Clock className={`w-4 h-4 shrink-0 ${isDark ? "text-[#7a7469]" : "text-[#948c80]"}`} />;
    }
  };

  const handleDeleteSingle = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    setDeletingId(runId);
    setErrorMessage(null);
    try {
      await deleteRun(runId);
      onRefreshRuns();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete run.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    setErrorMessage(null);
    try {
      await deleteAllRuns();
      setShowClearConfirm(false);
      onRefreshRuns();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to clear all runs.");
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <aside className={`w-80 border-r flex flex-col h-full shrink-0 transition-colors ${
      isDark
        ? "border-[#3c3931] bg-[#1f1e1a] text-[#f4f1ea]"
        : "border-[#dcd5c9] bg-[#faf8f5] text-[#2d2925]"
    }`}>
      {/* Brand Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDark ? "border-[#3c3931] bg-[#181714]" : "border-[#dcd5c9] bg-white"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#658a60] text-white shadow-xs">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className={`font-bold text-sm tracking-tight ${
              isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
            }`}>
              Saved analyses
            </h1>
            <p className={`text-[11px] font-medium ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
              Recent pipeline runs
            </p>
          </div>
        </div>
        <button
          onClick={onRefreshRuns}
          title="Refresh runs"
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            isDark
              ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
              : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Runs History Header with Clear All Action */}
      <div className={`p-4 pb-2 border-b space-y-2 ${
        isDark ? "border-[#3c3931]" : "border-[#dcd5c9]"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? "text-[#9a9386]" : "text-[#756e63]"
            }`}>
              <History className="w-3.5 h-3.5 text-[#658a60]" />
              Analysis History
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-semibold border ${
              isDark
                ? "text-[#8cb487] bg-[#658a60]/20 border-[#658a60]/30"
                : "text-[#3f5f3b] bg-[#658a60]/15 border-[#658a60]/30"
            }`}>
              {runs.length}
            </span>
          </div>

          {/* Clear All Trigger Button */}
          {runs.length > 0 && !showClearConfirm && (
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear all analysis history"
              className={`text-[11px] font-medium px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 border ${
                isDark
                  ? "text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 border-rose-900/50"
                  : "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Clear All Inline Confirmation Strip */}
        {showClearConfirm && (
          <div className={`p-2.5 rounded-xl border text-xs space-y-2 transition-all ${
            isDark
              ? "bg-rose-950/60 border-rose-900/60 text-rose-300"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            <div className="flex items-center gap-1.5 font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Delete all {runs.length} history records?</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingAll}
                className={`px-2 py-1 rounded-lg text-[11px] border cursor-pointer ${
                  isDark
                    ? "bg-[#181714] hover:bg-[#252420] text-[#f4f1ea] border-[#3c3931]"
                    : "bg-white hover:bg-[#faf8f5] text-[#2d2925] border-[#dcd5c9]"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isClearingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>Yes, Clear All</span>
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className={`p-2 rounded-lg text-[11px] border ${
            isDark
              ? "bg-rose-950/50 text-rose-300 border-rose-900/50"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
            {errorMessage}
          </div>
        )}
      </div>

      {/* Runs History List with One-by-One Delete Buttons */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {runs.length === 0 ? (
          <div className={`text-center py-10 px-3 border rounded-xl ${
            isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
          }`}>
            <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-[#7a7469]" : "text-[#948c80]"}`} />
            <p className={`text-xs font-semibold ${isDark ? "text-[#d5cec2]" : "text-[#4a453e]"}`}>
              No past runs yet.
            </p>
            <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
              Upload or run an analysis to view history.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const isSelected = r.run_id === selectedRunId;
              const isDeletingThis = deletingId === r.run_id;

              return (
                <div
                  key={r.run_id}
                  onClick={() => onSelectRun(r.run_id)}
                  className={`group relative p-3 rounded-lg border transition flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                    isSelected
                      ? isDark
                        ? "bg-[#2c2a24] border-[#658a60] text-[#f4f1ea] font-semibold"
                        : "bg-white border-[#658a60] text-[#2d2925] font-semibold shadow-xs ring-1 ring-[#658a60]/30"
                      : isDark
                      ? "bg-[#23221d] border-[#3c3931] hover:bg-[#2c2a24] text-[#d5cec2]"
                      : "bg-white border-[#dcd5c9] hover:bg-[#f4efe6] text-[#4a453e]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs truncate">{r.csv_filename}</span>
                    </div>
                    <div className={`flex items-center gap-2 mt-0.5 text-[11px] ${
                      isDark ? "text-[#9a9386]" : "text-[#756e63]"
                    }`}>
                      <span className="truncate text-[#d97706] font-medium">Target: {r.target_column}</span>
                      <span>•</span>
                      <span className="capitalize">{r.problem_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status Badge */}
                    {getStatusBadge(r.status)}

                    {/* Single Item Delete Trash Button */}
                    <button
                      onClick={(e) => handleDeleteSingle(e, r.run_id)}
                      disabled={isDeletingThis}
                      title="Delete this analysis run"
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer border ${
                        isDark
                          ? "hover:bg-rose-950/60 text-[#9a9386] hover:text-rose-400 border-transparent hover:border-rose-900/50"
                          : "hover:bg-rose-50 text-[#756e63] hover:text-rose-600 border-transparent hover:border-rose-200"
                      }`}
                    >
                      {isDeletingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className={`p-3 border-t text-[11px] text-center font-medium ${
        isDark ? "border-[#3c3931] bg-[#181714] text-[#9a9386]" : "border-[#dcd5c9] bg-white text-[#756e63]"
      }`}>
        Powered by LangGraph & Groq LLMs
      </div>
    </aside>
  );
}
