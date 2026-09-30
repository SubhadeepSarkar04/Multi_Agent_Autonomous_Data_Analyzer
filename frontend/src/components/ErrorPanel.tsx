"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface ErrorPanelProps {
  lastAgent?: string | null;
  retryCount?: number;
  errorTraceback?: string | null;
}

export default function ErrorPanel({ lastAgent, retryCount = 0, errorTraceback }: ErrorPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (errorTraceback) {
      navigator.clipboard.writeText(errorTraceback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100 text-red-600 border border-red-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#4a453e] tracking-tight">
              Pipeline Execution Terminated at Agent:{" "}
              <span className="font-mono text-red-600 underline">{lastAgent || "Unknown"}</span>
            </h3>
            <p className="text-xs text-[#7a7268] mt-0.5 font-medium">
              The agent exceeded its maximum retry limit ({retryCount} attempts) and safely routed to the failure sink.
            </p>
          </div>
        </div>
      </div>

      {errorTraceback && (
        <div className="border border-red-200 rounded-lg overflow-hidden bg-[#fdf8f0]">
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="p-3 bg-red-100 border-b border-red-200 flex items-center justify-between cursor-pointer text-xs font-semibold text-red-700 select-none"
          >
            <span>Execution Traceback &amp; Diagnostics</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1 rounded text-red-600 hover:bg-red-200 transition flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#658a60]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {isOpen && (
            <pre className="p-4 text-xs font-mono text-red-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 bg-[#fdf8f0]">
              {errorTraceback}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
