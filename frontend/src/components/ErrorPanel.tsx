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
    <div className="bg-[#FFE4E6] border border-[#BE123C]/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#EAF5EE] text-[#BE123C] border border-[#BE123C]/20 shadow-2xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F2922]">
              Pipeline Execution Terminated at Agent: <span className="font-mono text-[#BE123C] underline">{lastAgent || "Unknown"}</span>
            </h3>
            <p className="text-xs text-[#2D5245] mt-0.5 font-medium">
              The agent exceeded its maximum retry limit ({retryCount} attempts) and routed to the terminal failure sink.
            </p>
          </div>
        </div>
      </div>

      {errorTraceback && (
        <div className="border border-[#A3C9B2] rounded-xl overflow-hidden bg-[#EAF5EE] shadow-2xs">
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="p-3 bg-[#DCEEE3] border-b border-[#A3C9B2] flex items-center justify-between cursor-pointer text-xs font-bold text-[#0F2922] select-none"
          >
            <span>Execution Traceback & Diagnostics</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1 rounded text-[#0F2922] hover:bg-[#CCE5D6] transition flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {isOpen && (
            <pre className="p-4 text-xs font-mono text-[#BE123C] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 bg-[#EAF5EE]">
              {errorTraceback}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
