"use client";

import React from "react";
import { Sparkles, Database, Sliders, LineChart, ArrowLeft, Cpu } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 max-w-2xl mx-auto space-y-6">
      <div className="p-4 rounded-3xl bg-[#D1FAE5] text-[#059669] border border-[#A3C9B2] shadow-xs">
        <Cpu className="w-10 h-10 text-[#059669]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#0F2922] tracking-tight">Autonomous Data Scientist Dashboard</h2>
        <p className="text-sm text-[#2D5245] leading-relaxed">
          Upload a dataset in the sidebar to trigger collaborative multi-agent AutoML. The agents will inspect, clean, engineer features, tune models, and generate explainability artifacts autonomously.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left pt-2">
        <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#A3C9B2] flex items-start gap-3 shadow-xs hover:border-[#059669] transition">
          <div className="p-2 rounded-xl bg-[#D1FAE5] text-[#059669]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F2922]">1. Loader & EDA</h4>
            <p className="text-[11px] text-[#2D5245] mt-0.5">Automated cleaning & distribution heatmaps</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#A3C9B2] flex items-start gap-3 shadow-xs hover:border-[#059669] transition">
          <div className="p-2 rounded-xl bg-[#D1FAE5] text-[#059669]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F2922]">2. Feature Engineering</h4>
            <p className="text-[11px] text-[#2D5245] mt-0.5">Encoding & non-leaking feature derivation</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#A3C9B2] flex items-start gap-3 shadow-xs hover:border-[#059669] transition">
          <div className="p-2 rounded-xl bg-[#D1FAE5] text-[#059669]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F2922]">3. Hyperparameter Tuner</h4>
            <p className="text-[11px] text-[#2D5245] mt-0.5">Optuna Bayesian optimization & model export</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#A3C9B2] flex items-start gap-3 shadow-xs hover:border-[#059669] transition">
          <div className="p-2 rounded-xl bg-[#D1FAE5] text-[#059669]">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F2922]">4. SHAP Explainer</h4>
            <p className="text-[11px] text-[#2D5245] mt-0.5">Global feature attribution & importance</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-[#047857] bg-[#D1FAE5] border border-[#059669]/40 px-4 py-2 rounded-full shadow-2xs">
        <ArrowLeft className="w-3.5 h-3.5 animate-pulse text-[#059669]" />
        <span>Select or upload a CSV dataset from the left sidebar to begin</span>
      </div>
    </div>
  );
}
