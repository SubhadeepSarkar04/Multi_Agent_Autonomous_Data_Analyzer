"use client";

import React from "react";
import { CheckCircle2, Loader2, XCircle, CircleDashed, Database, Sparkles, Sliders, LineChart, Pause } from "lucide-react";
import { RunStatus } from "../lib/types";
import { useTheme } from "../lib/ThemeContext";

interface PipelineStepperProps {
  lastAgent?: string | null;
  overallStatus: RunStatus;
  retryCount?: number;
}

const AGENTS = [
  { id: "loader_eda", label: "Loader & EDA", icon: Database, desc: "Data hygiene & distributions" },
  { id: "feature_engineer", label: "Feature Engineer", icon: Sparkles, desc: "Encoding & derived features" },
  { id: "tuner", label: "Hyperparameter Tuner", icon: Sliders, desc: "Optuna 3-trial optimization" },
  { id: "explainer", label: "SHAP Explainer", icon: LineChart, desc: "Feature importance interpretation" },
];

export default function PipelineStepper({ lastAgent, overallStatus, retryCount = 0 }: PipelineStepperProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const getAgentStatus = (agentId: string) => {
    if (!lastAgent) {
      if (agentId === AGENTS[0].id) {
        if (overallStatus === "paused") return "paused";
        if (overallStatus === "running" || overallStatus === "pending") return "running";
      }
      return "waiting";
    }

    const lastIdx = AGENTS.findIndex((a) => a.id === lastAgent);
    const currIdx = AGENTS.findIndex((a) => a.id === agentId);

    if (overallStatus === "failed" || overallStatus === "cancelled") {
      if (currIdx < lastIdx) return "done";
      if (currIdx === lastIdx) return "failed";
      return "waiting";
    }

    if (overallStatus === "done") {
      return "done";
    }

    if (overallStatus === "paused") {
      if (currIdx < lastIdx) return "done";
      if (currIdx === lastIdx) return "paused";
      if (currIdx === lastIdx + 1) return "paused";
      return "waiting";
    }

    if (currIdx <= lastIdx) return "done";
    if (currIdx === lastIdx + 1 && overallStatus === "running") return "running";
    return "waiting";
  };

  return (
    <div className={`border rounded-xl p-4 md:p-5 transition-colors ${
      isDark
        ? "bg-[#23221d] border-[#3c3931]"
        : "bg-white border-[#dcd5c9]"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-base font-bold tracking-tight flex items-center gap-2 ${
            isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
          }`}>
            Multi-Agent Workflow Pipeline
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
              isDark
                ? "bg-[#658a60]/20 text-[#8cb487] border-[#658a60]/30"
                : "bg-[#658a60]/15 text-[#3f5f3b] border-[#658a60]/30"
            }`}>
              Autonomous DAG
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
            Collaborative execution across 4 specialized AI agent nodes
          </p>
        </div>

        {overallStatus === "running" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#f59e0b] bg-[#d97706]/20 border-[#d97706]/40"
              : "text-[#b45309] bg-[#d97706]/15 border-[#d97706]/30"
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d97706]" />
            Execution Active
          </span>
        )}

        {overallStatus === "paused" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#f59e0b] bg-[#d97706]/20 border-[#d97706]/40"
              : "text-[#b45309] bg-[#d97706]/15 border-[#d97706]/30"
          }`}>
            <Pause className="w-3.5 h-3.5 text-[#d97706]" />
            Execution Paused
          </span>
        )}

        {overallStatus === "done" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#8cb487] bg-[#658a60]/20 border-[#658a60]/40"
              : "text-[#3f5f3b] bg-[#658a60]/15 border-[#658a60]/30"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#658a60]" />
            Pipeline Completed
          </span>
        )}

        {(overallStatus === "failed" || overallStatus === "cancelled") && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-rose-400 bg-rose-950/40 border-rose-900/50"
              : "text-rose-700 bg-rose-50 border-rose-200"
          }`}>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            {overallStatus === "cancelled" ? "Cancelled by User" : `Stage Failed (${retryCount} retries)`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {AGENTS.map((agent, index) => {
          const status = getAgentStatus(agent.id);
          const Icon = agent.icon;

          return (
            <div
              key={agent.id}
              className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                status === "running"
                  ? isDark
                    ? "bg-[#2c2a24] border-[#d97706]/70 shadow-xs"
                    : "bg-[#fffdfa] border-[#d97706] shadow-xs"
                  : status === "paused"
                  ? isDark
                    ? "bg-[#2a261e] border-[#d97706]/50"
                    : "bg-[#fefaf3] border-[#d97706]/40"
                  : status === "done"
                  ? isDark
                    ? "bg-[#23221d] border-[#3c3931]"
                    : "bg-[#faf8f5] border-[#dcd5c9]"
                  : status === "failed"
                  ? isDark
                    ? "bg-rose-950/40 border-rose-900/50"
                    : "bg-rose-50/60 border-rose-200"
                  : isDark
                  ? "bg-[#181714] border-[#3c3931]"
                  : "bg-[#f4efe6] border-[#dcd5c9]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      status === "running"
                        ? "bg-[#d97706] text-white"
                        : status === "paused"
                        ? isDark ? "bg-[#d97706]/30 text-[#f59e0b] border border-[#d97706]/40" : "bg-[#d97706]/20 text-[#b45309]"
                        : status === "done"
                        ? isDark ? "bg-[#658a60]/30 text-[#8cb487] border border-[#658a60]/40" : "bg-[#658a60]/20 text-[#3f5f3b]"
                        : status === "failed"
                        ? isDark ? "bg-rose-900/40 text-rose-300 border border-rose-800" : "bg-rose-100 text-rose-700"
                        : isDark ? "bg-[#2c2a24] text-[#7a7469] border border-[#3c3931]" : "bg-[#dcd5c9] text-[#756e63]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[11px] font-bold ${
                    status === "running" || status === "paused" ? "text-[#d97706]" : "text-[#658a60]"
                  }`}>
                    Step 0{index + 1}
                  </span>
                </div>

                <div>
                  {status === "done" && <CheckCircle2 className="w-4 h-4 text-[#658a60]" />}
                  {status === "running" && <Loader2 className="w-4 h-4 text-[#d97706] animate-spin" />}
                  {status === "paused" && <Pause className="w-4 h-4 text-[#d97706]" />}
                  {status === "failed" && <XCircle className="w-4 h-4 text-rose-500" />}
                  {status === "waiting" && <CircleDashed className={`w-4 h-4 ${isDark ? "text-[#4a473d]" : "text-[#c8c0b2]"}`} />}
                </div>
              </div>

              <div>
                <h3 className={`text-xs font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
                  {agent.label}
                </h3>
                <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                  {agent.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
