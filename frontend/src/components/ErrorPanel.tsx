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
    <div className="bg-[#2d1215] border border-[#7f1d1d]/60 rounded-2xl p-5 space-y-4 shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#3f161a] text-[#f87171] border border-[#7f1d1d]/60 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#f4f3ee] font-serif-display text-base">
              Pipeline Execution Terminated at Agent: <span className="font-mono text-[#f87171] underline">{lastAgent || "Unknown"}</span>
            </h3>
            <p className="text-xs text-[#98bbaf] mt-0.5 font-medium">
              The agent exceeded its maximum retry limit ({retryCount} attempts) and safely routed to the failure sink.
            </p>
          </div>
        </div>
      </div>

      {errorTraceback && (
        <div className="border border-[#7f1d1d]/60 rounded-xl overflow-hidden bg-[#180a0c] shadow-xs">
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="p-3 bg-[#261013] border-b border-[#7f1d1d]/60 flex items-center justify-between cursor-pointer text-xs font-semibold text-[#f87171] select-none"
          >
            <span>Execution Traceback & Diagnostics</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1 rounded text-[#f87171] hover:bg-[#3f161a] transition flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {isOpen && (
            <pre className="p-4 text-xs font-mono text-[#fca5a5] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 bg-[#180a0c]">
              {errorTraceback}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
