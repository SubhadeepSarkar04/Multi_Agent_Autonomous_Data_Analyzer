"use client";

import React from "react";
import { Sparkles, Database, Sliders, LineChart, ArrowLeft, Cpu } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 max-w-2xl mx-auto space-y-6">
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#FAC61B]/25 to-[#CA651B]/20 text-[#CA651B] border border-[#C8BCAB] shadow-xs">
        <Cpu className="w-10 h-10 text-[#CA651B]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#1C1917] tracking-tight">Autonomous Data Scientist Dashboard</h2>
        <p className="text-sm text-[#574E47] leading-relaxed">
          Upload a dataset in the sidebar to trigger collaborative multi-agent AutoML. The agents will inspect, clean, engineer features, tune models, and generate explainability artifacts autonomously.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left pt-2">
        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#C8BCAB] flex items-start gap-3 shadow-xs hover:border-[#CA651B] transition">
          <div className="p-2 rounded-xl bg-[#08979D]/15 text-[#08979D]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1C1917]">1. Loader & EDA</h4>
            <p className="text-[11px] text-[#574E47] mt-0.5">Automated cleaning & distribution heatmaps</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#C8BCAB] flex items-start gap-3 shadow-xs hover:border-[#CA651B] transition">
          <div className="p-2 rounded-xl bg-[#CA651B]/15 text-[#CA651B]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1C1917]">2. Feature Engineering</h4>
            <p className="text-[11px] text-[#574E47] mt-0.5">Encoding & non-leaking feature derivation</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#C8BCAB] flex items-start gap-3 shadow-xs hover:border-[#CA651B] transition">
          <div className="p-2 rounded-xl bg-[#FAC61B]/25 text-[#CA651B]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1C1917]">3. Hyperparameter Tuner</h4>
            <p className="text-[11px] text-[#574E47] mt-0.5">Optuna Bayesian optimization & model export</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#C8BCAB] flex items-start gap-3 shadow-xs hover:border-[#CA651B] transition">
          <div className="p-2 rounded-xl bg-[#B83E16]/15 text-[#B83E16]">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1C1917]">4. SHAP Explainer</h4>
            <p className="text-[11px] text-[#574E47] mt-0.5">Global feature attribution & importance</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917] bg-[#FAC61B]/25 border border-[#FAC61B]/60 px-4 py-2 rounded-full shadow-2xs">
        <ArrowLeft className="w-3.5 h-3.5 animate-pulse text-[#CA651B]" />
        <span>Select or upload a CSV dataset from the left sidebar to begin</span>
      </div>
    </div>
  );
}
