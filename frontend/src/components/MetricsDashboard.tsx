"use client";

import React from "react";
import { TrendingUp, Award, Zap, SlidersHorizontal, BarChart3 } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";

interface MetricsDashboardProps {
  metrics?: Record<string, any> | null;
  problemType: string;
}

export default function MetricsDashboard({ metrics, problemType }: MetricsDashboardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className={`p-8 text-center border rounded-2xl shadow-md transition-colors ${
        isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200"
      }`}>
        <BarChart3 className="w-8 h-8 mx-auto text-[#eb5e41] mb-2 opacity-80" />
        <p className={`text-sm font-medium ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
          Metrics are being calculated by the Tuner agent...
        </p>
      </div>
    );
  }

  const baseline = typeof metrics.baseline === "object" ? metrics.baseline : null;
  const tuned = typeof metrics.tuned === "object" ? metrics.tuned : null;
  const bestParams = metrics.best_params || metrics.best_parameters || null;

  // Extract score values
  const getScore = (obj: any): number | null => {
    if (!obj) return null;
    for (const key of ["val_score", "score", "accuracy", "f1", "r2", "rmse"]) {
      if (typeof obj[key] === "number") return obj[key];
    }
    const vals = Object.values(obj).filter((v) => typeof v === "number");
    return vals.length > 0 ? (vals[0] as number) : null;
  };

  const baselineScore = getScore(baseline);
  const tunedScore = getScore(tuned);

  let deltaPct: number | null = null;
  if (baselineScore !== null && tunedScore !== null && baselineScore !== 0) {
    deltaPct = ((tunedScore - baselineScore) / Math.abs(baselineScore)) * 100;
  }

  return (
    <div className="space-y-6">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline Card */}
        <div className={`border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-[#6b9386]" : "text-slate-400"
            }`}>
              Baseline Model
            </span>
            <div className={`p-2 rounded-xl border ${
              isDark ? "bg-[#174337] text-[#98bbaf] border-[#1e4e42]" : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-extrabold tracking-tight font-serif-display ${
              isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              {baselineScore !== null ? baselineScore.toFixed(4) : "N/A"}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Default Hyperparameters
            </p>
          </div>
        </div>

        {/* Tuned Champion Card */}
        <div className={`border-2 border-[#eb5e41] rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors ${
          isDark
            ? "bg-[#174337] shadow-[0_0_20px_rgba(235,94,65,0.15)]"
            : "bg-orange-50/60 shadow-[0_4px_18px_rgba(235,94,65,0.12)]"
        }`}>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#eb5e41] flex items-center gap-1.5 font-sans">
              <Award className="w-3.5 h-3.5 text-[#eb5e41]" />
              Tuned Champion
            </span>
            <div className="p-2 rounded-xl bg-[#eb5e41] text-white shadow-md shadow-[#eb5e41]/30">
              <Award className="w-4 h-4 fill-current text-white" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-3xl font-extrabold text-[#eb5e41] tracking-tight font-serif-display">
              {tunedScore !== null ? tunedScore.toFixed(4) : "N/A"}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-[#f4f3ee]" : "text-slate-700"}`}>
              Optuna Bayesian Optimized Score
            </p>
          </div>
        </div>

        {/* Performance Delta Card */}
        <div className={`border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-[#6b9386]" : "text-slate-400"
            }`}>
              Optimization Gain
            </span>
            <div className={`p-2 rounded-xl border ${
              isDark ? "bg-[#0f2e26] border-[#34d399]/30 text-[#34d399]" : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-extrabold tracking-tight font-serif-display ${
              deltaPct && deltaPct >= 0
                ? "text-[#34d399]"
                : isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              {deltaPct !== null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%` : "N/A"}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
              Relative Model Improvement
            </p>
          </div>
        </div>
      </div>

      {/* Best Hyperparameters Table */}
      {bestParams && Object.keys(bestParams).length > 0 && (
        <div className={`border rounded-2xl p-5 shadow-md transition-colors ${
          isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-1.5 rounded-lg border ${
              isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
            }`}>
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className={`text-sm font-bold font-serif-display text-base ${
              isDark ? "text-[#f4f3ee]" : "text-slate-900"
            }`}>
              Best Hyperparameters Discovered
            </h3>
          </div>
          <div className={`overflow-x-auto rounded-xl border ${
            isDark ? "border-[#1e4e42]" : "border-slate-200"
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${
                  isDark
                    ? "border-[#1e4e42] text-[#98bbaf] bg-[#0d2822]"
                    : "border-slate-200 text-slate-600 bg-slate-50"
                }`}>
                  <th className="py-2.5 px-3.5 font-bold">Parameter</th>
                  <th className="py-2.5 px-3.5 font-bold">Tuned Value</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark
                  ? "divide-[#1e4e42] text-[#f4f3ee]"
                  : "divide-slate-100 text-slate-800"
              }`}>
                {Object.entries(bestParams).map(([k, v]) => (
                  <tr key={k} className={`transition ${
                    isDark ? "hover:bg-[#174337]/60" : "hover:bg-slate-50"
                  }`}>
                    <td className={`py-2.5 px-3.5 font-mono font-medium ${
                      isDark ? "text-[#98bbaf]" : "text-slate-600"
                    }`}>{k}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[#eb5e41] font-bold">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
