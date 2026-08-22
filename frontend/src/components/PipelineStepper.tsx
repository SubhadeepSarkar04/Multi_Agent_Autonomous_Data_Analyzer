"use client";

import React from "react";
import { CheckCircle2, Loader2, XCircle, CircleDashed, Database, Sparkles, Sliders, LineChart } from "lucide-react";
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
      if (agentId === AGENTS[0].id && (overallStatus === "running" || overallStatus === "pending")) {
        return "running";
      }
      return "waiting";
    }

    const lastIdx = AGENTS.findIndex((a) => a.id === lastAgent);
    const currIdx = AGENTS.findIndex((a) => a.id === agentId);

    if (overallStatus === "failed") {
      if (currIdx < lastIdx) return "done";
      if (currIdx === lastIdx) return "failed";
      return "waiting";
    }

    if (overallStatus === "done") {
      return "done";
    }

    if (currIdx <= lastIdx) return "done";
    if (currIdx === lastIdx + 1 && overallStatus === "running") return "running";
    return "waiting";
  };

  return (
    <div className={`border rounded-2xl p-4 md:p-5 shadow-md transition-colors ${
      isDark
        ? "bg-[#12382f] border-[#1e4e42]"
        : "bg-white border-slate-200 shadow-sm"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-base font-bold tracking-tight flex items-center gap-2 font-serif-display ${
            isDark ? "text-[#f4f3ee]" : "text-slate-900"
          }`}>
            Multi-Agent Workflow Pipeline
            <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border ${
              isDark
                ? "bg-[#174337] text-[#eb5e41] border-[#286253]"
                : "bg-orange-50 text-[#eb5e41] border-orange-200"
            }`}>
              Autonomous DAG
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
            Collaborative execution across 4 specialized AI agent nodes
          </p>
        </div>
        {overallStatus === "running" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-pulse shadow-sm border ${
            isDark
              ? "text-[#eb5e41] bg-[#174337] border-[#eb5e41]/60"
              : "text-[#eb5e41] bg-orange-50 border-orange-200"
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#eb5e41]" />
            Execution Active
          </span>
        )}
        {overallStatus === "done" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-sm border ${
            isDark
              ? "text-[#34d399] bg-[#0f2e26] border-[#34d399]/40"
              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
            Pipeline Completed
          </span>
        )}
        {overallStatus === "failed" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-sm border ${
            isDark
              ? "text-[#f87171] bg-[#2d1215] border-[#7f1d1d]/60"
              : "text-rose-700 bg-rose-50 border border-rose-200"
          }`}>
            <XCircle className="w-3.5 h-3.5 text-[#f87171]" />
            Stage Failed ({retryCount} retries)
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
                    ? "bg-[#174337] border-[#eb5e41] shadow-[0_0_15px_rgba(235,94,65,0.2)] ring-1 ring-[#eb5e41]/50"
                    : "bg-orange-50/70 border-[#eb5e41] ring-1 ring-[#eb5e41]/40"
                  : status === "done"
                  ? isDark
                    ? "bg-[#103027] border-[#1e4e42]"
                    : "bg-slate-50 border-slate-200"
                  : status === "failed"
                  ? isDark
                    ? "bg-[#281316] border-[#7f1d1d]/60"
                    : "bg-rose-50 border-rose-200"
                  : isDark
                  ? "bg-[#0d2822] border-[#1e4e42]/60 opacity-75"
                  : "bg-slate-50/40 border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      status === "running"
                        ? "bg-[#eb5e41] text-white shadow-sm"
                        : status === "done"
                        ? isDark ? "bg-[#174337] text-[#34d399]" : "bg-emerald-100 text-emerald-700"
                        : status === "failed"
                        ? isDark ? "bg-[#3f161a] text-[#f87171]" : "bg-rose-100 text-rose-700"
                        : isDark ? "bg-[#174337] text-[#6b9386]" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#eb5e41]">Step 0{index + 1}</span>
                </div>

                <div>
                  {status === "done" && <CheckCircle2 className="w-4 h-4 text-[#34d399]" />}
                  {status === "running" && <Loader2 className="w-4 h-4 text-[#eb5e41] animate-spin" />}
                  {status === "failed" && <XCircle className="w-4 h-4 text-[#f87171]" />}
                  {status === "waiting" && <CircleDashed className={`w-4 h-4 ${isDark ? "text-[#3d695d]" : "text-slate-300"}`} />}
                </div>
              </div>

              <div>
                <h3 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
                  {agent.label}
                </h3>
                <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
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
