"use client";

import React from "react";
import { Database, ArrowLeft } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";

export default function EmptyState() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex min-h-[460px] items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isDark
              ? "bg-[#2a2720] text-[#d97706] border border-[#3a3428]"
              : "bg-[#ede9e0] text-[#658a60] border border-[#c8c3b8]"
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold tracking-tight ${
              isDark ? "text-[#e8e2d8]" : "text-[#4a453e]"
            }`}>
              No analysis selected
            </h2>
            <p className={`mt-0.5 text-sm ${isDark ? "text-[#a09a8e]" : "text-[#7a7268]"}`}>
              Upload a dataset above or choose a previous analysis from the sidebar.
            </p>
          </div>
        </div>

        <div className={`mt-6 overflow-hidden rounded-xl border ${isDark ? "border-[#3a3428]" : "border-[#d6d0c6]"}`}>
          <div className={`grid grid-cols-[32px_1fr] items-center gap-3 px-4 py-3 text-sm ${
            isDark ? "bg-[#2a2720] text-[#c8c2b6]" : "bg-[#ede9e0] text-[#4a453e]"
          }`}>
            <span className="font-mono text-xs text-[#658a60]">01</span><span>Review data quality and target distribution</span>
          </div>
          <div className={`grid grid-cols-[32px_1fr] items-center gap-3 border-t px-4 py-3 text-sm ${
            isDark ? "border-[#3a3428] bg-[#1e1c18] text-[#a09a8e]" : "border-[#d6d0c6] bg-[#f4f1ea] text-[#7a7268]"
          }`}>
            <span className="font-mono text-xs text-[#658a60]">02</span><span>Prepare features and fit a candidate model</span>
          </div>
          <div className={`grid grid-cols-[32px_1fr] items-center gap-3 border-t px-4 py-3 text-sm ${
            isDark ? "border-[#3a3428] bg-[#1e1c18] text-[#a09a8e]" : "border-[#d6d0c6] bg-[#f4f1ea] text-[#7a7268]"
          }`}>
            <span className="font-mono text-xs text-[#658a60]">03</span><span>Compare metrics and inspect feature explanations</span>
          </div>
        </div>

        <div className={`mt-5 flex items-center gap-2 text-xs ${isDark ? "text-[#a09a8e]" : "text-[#7a7268]"}`}>
          <ArrowLeft className="w-3.5 h-3.5 text-[#d97706]" />
          <span>Use the upload area above to begin.</span>
        </div>
      </div>
    </div>
  );
}
