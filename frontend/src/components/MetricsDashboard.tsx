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
      <div className="p-8 text-center bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl shadow-xs">
        <BarChart3 className="w-8 h-8 mx-auto text-[#CA651B] mb-2 opacity-80" />
        <p className="text-sm text-[#574E47]">Metrics are being calculated by the Tuner agent...</p>
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
        <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#574E47]">Baseline Model</span>
            <div className="p-2 rounded-xl bg-[#E5DDD0] border border-[#C8BCAB] text-[#CA651B]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#1C1917]">
              {baselineScore !== null ? baselineScore.toFixed(4) : "N/A"}
            </div>
            <p className="text-xs text-[#574E47] mt-1 font-semibold">Default Hyperparameters</p>
          </div>
        </div>

        {/* Tuned Champion Card */}
        <div className="bg-gradient-to-br from-[#FAC61B]/20 via-[#FAF6F0] to-[#CA651B]/15 border border-[#CA651B] rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#CA651B]">Tuned Champion</span>
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#CA651B] to-[#FAC61B] text-white shadow-xs">
              <Award className="w-4 h-4 fill-current text-white" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-2xl font-bold text-[#1C1917]">
              {tunedScore !== null ? tunedScore.toFixed(4) : "N/A"}
            </div>
            <p className="text-xs text-[#CA651B] mt-1 font-bold">Optuna Optimized Score</p>
          </div>
        </div>

        {/* Performance Delta Card */}
        <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#574E47]">Optimization Gain</span>
            <div className="p-2 rounded-xl bg-[#08979D]/15 text-[#08979D]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-bold ${deltaPct && deltaPct >= 0 ? "text-[#08979D]" : "text-[#1C1917]"}`}>
              {deltaPct !== null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%` : "N/A"}
            </div>
            <p className="text-xs text-[#574E47] mt-1 font-semibold">Relative Improvement</p>
          </div>
        </div>
      </div>

      {/* Best Hyperparameters Table */}
      {bestParams && Object.keys(bestParams).length > 0 && (
        <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-[#FAC61B]/25 text-[#CA651B]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1C1917]">Best Hyperparameters Discovered</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#C8BCAB]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#C8BCAB] text-[#1C1917] bg-[#E5DDD0]">
                  <th className="py-2.5 px-3.5 font-bold">Parameter</th>
                  <th className="py-2.5 px-3.5 font-bold">Tuned Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8BCAB] text-[#1C1917]">
                {Object.entries(bestParams).map(([k, v]) => (
                  <tr key={k} className="hover:bg-[#E5DDD0]/50 transition">
                    <td className="py-2.5 px-3.5 font-mono text-[#1C1917] font-semibold">{k}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[#CA651B] font-bold">
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
