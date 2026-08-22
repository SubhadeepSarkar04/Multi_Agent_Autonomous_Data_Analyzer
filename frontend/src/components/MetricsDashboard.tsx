"use client";

import React from "react";
import { TrendingUp, Award, Zap, SlidersHorizontal, BarChart3 } from "lucide-react";

interface MetricsDashboardProps {
  metrics?: Record<string, any> | null;
  problemType: string;
}

export default function MetricsDashboard({ metrics, problemType }: MetricsDashboardProps) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="p-8 text-center bg-[#EAF5EE] border border-[#A3C9B2] rounded-2xl shadow-xs">
        <BarChart3 className="w-8 h-8 mx-auto text-[#059669] mb-2 opacity-80" />
        <p className="text-sm text-[#2D5245]">Metrics are being calculated by the Tuner agent...</p>
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
        <div className="bg-[#EAF5EE] border border-[#A3C9B2] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D5245]">Baseline Model</span>
            <div className="p-2 rounded-xl bg-[#DCEEE3] border border-[#A3C9B2] text-[#059669]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#0F2922]">
              {baselineScore !== null ? baselineScore.toFixed(4) : "N/A"}
            </div>
            <p className="text-xs text-[#2D5245] mt-1 font-semibold">Default Hyperparameters</p>
          </div>
        </div>

        {/* Tuned Champion Card */}
        <div className="bg-[#D8F2E2] border-2 border-[#059669] rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#059669]">Tuned Champion</span>
            <div className="p-2 rounded-xl bg-[#059669] text-white shadow-2xs">
              <Award className="w-4 h-4 fill-current text-white" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-2xl font-bold text-[#064E3B]">
              {tunedScore !== null ? tunedScore.toFixed(4) : "N/A"}
            </div>
            <p className="text-xs text-[#059669] mt-1 font-bold">Optuna Optimized Score</p>
          </div>
        </div>

        {/* Performance Delta Card */}
        <div className="bg-[#EAF5EE] border border-[#A3C9B2] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D5245]">Optimization Gain</span>
            <div className="p-2 rounded-xl bg-[#D1FAE5] text-[#059669]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-bold ${deltaPct && deltaPct >= 0 ? "text-[#059669]" : "text-[#0F2922]"}`}>
              {deltaPct !== null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%` : "N/A"}
            </div>
            <p className="text-xs text-[#2D5245] mt-1 font-semibold">Relative Improvement</p>
          </div>
        </div>
      </div>

      {/* Best Hyperparameters Table */}
      {bestParams && Object.keys(bestParams).length > 0 && (
        <div className="bg-[#EAF5EE] border border-[#A3C9B2] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-[#D1FAE5] text-[#059669]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0F2922]">Best Hyperparameters Discovered</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#A3C9B2]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#A3C9B2] text-[#0F2922] bg-[#DCEEE3]">
                  <th className="py-2.5 px-3.5 font-bold">Parameter</th>
                  <th className="py-2.5 px-3.5 font-bold">Tuned Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#A3C9B2] text-[#0F2922]">
                {Object.entries(bestParams).map(([k, v]) => (
                  <tr key={k} className="hover:bg-[#DCEEE3]/60 transition">
                    <td className="py-2.5 px-3.5 font-mono text-[#0F2922] font-semibold">{k}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[#059669] font-bold">
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
