"use client";

import React from "react";
import { Sparkles, Database, Sliders, LineChart, ArrowLeft, Cpu } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";

export default function EmptyState() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-2xl mx-auto space-y-6">
      <div className={`p-4 rounded-3xl border shadow-lg ${
        isDark
          ? "bg-[#12382f] text-[#eb5e41] border-[#1e4e42] shadow-[#eb5e41]/10"
          : "bg-orange-50 text-[#eb5e41] border-orange-200"
      }`}>
        <Cpu className="w-10 h-10 text-[#eb5e41]" />
      </div>

      <div className="space-y-2">
        <h2 className={`text-3xl font-bold tracking-tight font-serif-display ${
          isDark ? "text-[#f4f3ee]" : "text-slate-900"
        }`}>
          Autonomous Data Scientist Studio
        </h2>
        <p className={`text-sm leading-relaxed max-w-lg mx-auto ${
          isDark ? "text-[#98bbaf]" : "text-slate-500"
        }`}>
          Upload a dataset in the sidebar to initiate collaborative multi-agent execution. Agents autonomously clean data, derive non-leaking features, optimize model architectures with Optuna, and generate SHAP explainability insights.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left pt-2">
        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md transition ${
          isDark
            ? "bg-[#12382f] border-[#1e4e42] hover:border-[#eb5e41]/60"
            : "bg-white border-slate-200 hover:border-[#eb5e41]/60 shadow-sm"
        }`}>
          <div className={`p-2 rounded-xl border ${
            isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
          }`}>
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
              1. Loader & EDA
            </h4>
            <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Automated cleaning & distribution heatmaps
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md transition ${
          isDark
            ? "bg-[#12382f] border-[#1e4e42] hover:border-[#eb5e41]/60"
            : "bg-white border-slate-200 hover:border-[#eb5e41]/60 shadow-sm"
        }`}>
          <div className={`p-2 rounded-xl border ${
            isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
              2. Feature Engineer
            </h4>
            <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Categorical encoding & mathematical derivation
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md transition ${
          isDark
            ? "bg-[#12382f] border-[#1e4e42] hover:border-[#eb5e41]/60"
            : "bg-white border-slate-200 hover:border-[#eb5e41]/60 shadow-sm"
        }`}>
          <div className={`p-2 rounded-xl border ${
            isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
          }`}>
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
              3. Hyperparameter Tuner
            </h4>
            <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Optuna Bayesian search & champion export
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md transition ${
          isDark
            ? "bg-[#12382f] border-[#1e4e42] hover:border-[#eb5e41]/60"
            : "bg-white border-slate-200 hover:border-[#eb5e41]/60 shadow-sm"
        }`}>
          <div className={`p-2 rounded-xl border ${
            isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
          }`}>
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
              4. SHAP Explainer
            </h4>
            <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Global feature attributions & interpretability
            </p>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full shadow-sm border ${
        isDark
          ? "text-[#f4f3ee] bg-[#174337] border-[#1e4e42]"
          : "text-slate-700 bg-slate-100 border-slate-200"
      }`}>
        <ArrowLeft className="w-3.5 h-3.5 animate-pulse text-[#eb5e41]" />
        <span>Select or upload a CSV dataset from the left sidebar to begin</span>
      </div>
    </div>
  );
}
