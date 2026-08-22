"use client";

import React from "react";
import { CheckCircle2, Loader2, XCircle, CircleDashed, Database, Sparkles, Sliders, LineChart } from "lucide-react";
import { RunStatus } from "../lib/types";

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
    <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl p-4 md:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-[#1C1917] tracking-tight">Multi-Agent Workflow Pipeline</h2>
          <p className="text-xs text-[#574E47]">Autonomous collaboration across 4 specialized agent nodes</p>
        </div>
        {overallStatus === "running" && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#CA651B] bg-[#FAC61B]/25 border border-[#FAC61B]/50 px-3 py-1 rounded-full animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CA651B]" />
            Execution Active
          </span>
        )}
        {overallStatus === "done" && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#08979D] bg-[#08979D]/15 border border-[#08979D]/30 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#08979D]" />
            Pipeline Completed
          </span>
        )}
        {overallStatus === "failed" && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#B83E16] bg-[#B83E16]/15 border border-[#B83E16]/30 px-3 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
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
                  ? "bg-[#FAC61B]/20 border-[#CA651B] shadow-sm"
                  : status === "done"
                  ? "bg-[#08979D]/10 border-[#08979D]/40 shadow-2xs"
                  : status === "failed"
                  ? "bg-[#B83E16]/10 border-[#B83E16]/40 shadow-2xs"
                  : "bg-[#E5DDD0] border-[#C8BCAB] opacity-80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      status === "running"
                        ? "bg-[#FAC61B]/30 text-[#CA651B]"
                        : status === "done"
                        ? "bg-[#08979D]/20 text-[#08979D]"
                        : status === "failed"
                        ? "bg-[#B83E16]/20 text-[#B83E16]"
                        : "bg-[#C8BCAB]/50 text-[#574E47]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#CA651B]">Step 0{index + 1}</span>
                </div>

                <div>
                  {status === "done" && <CheckCircle2 className="w-4 h-4 text-[#08979D]" />}
                  {status === "running" && <Loader2 className="w-4 h-4 text-[#CA651B] animate-spin" />}
                  {status === "failed" && <XCircle className="w-4 h-4 text-[#B83E16]" />}
                  {status === "waiting" && <CircleDashed className="w-4 h-4 text-[#786F68]" />}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#1C1917]">{agent.label}</h3>
                <p className="text-[11px] text-[#574E47] mt-0.5 leading-snug">{agent.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
