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
      <div className={`p-8 text-center border rounded-xl transition-colors ${
        isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
      }`}>
        <BarChart3 className="w-8 h-8 mx-auto text-[#658a60] mb-2" />
        <p className={`text-sm font-medium ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
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
        <div className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-[#9a9386]" : "text-[#756e63]"
            }`}>
              Baseline Model
            </span>
            <div className={`p-2 rounded-lg border ${
              isDark ? "bg-[#181714] text-[#d5cec2] border-[#3c3931]" : "bg-[#f4efe6] text-[#4a453e] border-[#dcd5c9]"
            }`}>
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-extrabold tracking-tight ${
              isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
            }`}>
              {baselineScore !== null ? baselineScore.toFixed(4) : "N/A"}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
              Default Hyperparameters
            </p>
          </div>
        </div>

        {/* Tuned Champion Card */}
        <div className={`border rounded-xl p-5 flex flex-col justify-between relative overflow-hidden transition-colors ${
          isDark
            ? "bg-[#2a261e] border-[#d97706]/70 shadow-xs"
            : "bg-[#fffdf8] border-[#d97706]/70 shadow-xs"
        }`}>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d97706] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#d97706]" />
              Tuned Champion
            </span>
            <div className="p-2 rounded-lg bg-[#d97706] text-white shadow-xs">
              <Award className="w-4 h-4 fill-current text-white" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-3xl font-extrabold text-[#d97706] tracking-tight">
              {tunedScore !== null ? tunedScore.toFixed(4) : "N/A"}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-[#d5cec2]" : "text-[#4a453e]"}`}>
              Optuna Bayesian Optimized Score
            </p>
          </div>
        </div>

        {/* Performance Delta Card */}
        <div className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-[#9a9386]" : "text-[#756e63]"
            }`}>
              Optimization Gain
            </span>
            <div className={`p-2 rounded-lg border ${
              isDark ? "bg-[#658a60]/20 border-[#658a60]/40 text-[#8cb487]" : "bg-[#658a60]/15 border-[#658a60]/30 text-[#3f5f3b]"
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-extrabold tracking-tight ${
              deltaPct && deltaPct >= 0
                ? isDark ? "text-[#8cb487]" : "text-[#3f5f3b]"
                : isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
            }`}>
              {deltaPct !== null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%` : "N/A"}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
              Relative Model Improvement
            </p>
          </div>
        </div>
      </div>

      {/* Best Hyperparameters Table */}
      {bestParams && Object.keys(bestParams).length > 0 && (
        <div className={`border rounded-xl p-5 transition-colors ${
          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-1.5 rounded-lg border ${
              isDark ? "bg-[#181714] text-[#658a60] border-[#3c3931]" : "bg-[#658a60]/15 text-[#3f5f3b] border-[#658a60]/30"
            }`}>
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className={`text-sm font-bold ${
              isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
            }`}>
              Best Hyperparameters Discovered
            </h3>
          </div>
          <div className={`overflow-x-auto rounded-lg border ${
            isDark ? "border-[#3c3931]" : "border-[#dcd5c9]"
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${
                  isDark
                    ? "border-[#3c3931] text-[#9a9386] bg-[#181714]"
                    : "border-[#dcd5c9] text-[#4a453e] bg-[#f4efe6]"
                }`}>
                  <th className="py-2.5 px-3.5 font-bold">Parameter</th>
                  <th className="py-2.5 px-3.5 font-bold">Tuned Value</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark
                  ? "divide-[#3c3931] text-[#d5cec2]"
                  : "divide-[#ede8df] text-[#2d2925]"
              }`}>
                {Object.entries(bestParams).map(([k, v]) => (
                  <tr key={k} className={`transition ${
                    isDark ? "hover:bg-[#2c2a24]" : "hover:bg-[#faf8f5]"
                  }`}>
                    <td className={`py-2.5 px-3.5 font-mono font-medium ${
                      isDark ? "text-[#9a9386]" : "text-[#756e63]"
                    }`}>{k}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[#d97706] font-bold">
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
