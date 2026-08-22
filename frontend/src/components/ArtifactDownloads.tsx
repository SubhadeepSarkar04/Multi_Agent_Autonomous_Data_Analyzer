"use client";

import React from "react";
import { Download, FileSpreadsheet, Box, CheckCircle2 } from "lucide-react";
import { getArtifactUrl, getModelDownloadUrl } from "../lib/api";
import { useTheme } from "../lib/ThemeContext";

interface ArtifactDownloadsProps {
  runId: string;
  cleanedCsvPath?: string | null;
  modelPath?: string | null;
}

export default function ArtifactDownloads({ runId, cleanedCsvPath, modelPath }: ArtifactDownloadsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const csvFilename = cleanedCsvPath ? cleanedCsvPath.split(/[\\/]/).pop() || "cleaned_dataset.csv" : "cleaned_dataset.csv";
  const csvUrl = getArtifactUrl(runId, csvFilename);
  const modelUrl = getModelDownloadUrl(runId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-sm font-bold font-serif-display text-base ${
          isDark ? "text-[#f4f3ee]" : "text-slate-900"
        }`}>
          Export & Deployment Artifacts
        </h3>
        <p className={`text-xs ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
          Download production-ready serialized model weights and preprocessed datasets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cleaned Dataset Card */}
        <div className={`border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl border ${
              isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
                Cleaned & Encoded Dataset
              </h4>
              <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
                Deduplicated, missing-value imputed, and feature engineered.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#34d399] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for inspection (.csv)</span>
              </div>
            </div>
          </div>

          <a
            href={csvUrl}
            download={csvFilename}
            className={`mt-4 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border shadow-xs transition cursor-pointer ${
              isDark
                ? "bg-[#174337] hover:bg-[#1f5647] text-[#f4f3ee] border-[#1e4e42]"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#eb5e41]" />
            Download Cleaned CSV
          </a>
        </div>

        {/* Champion Model (.joblib) Card */}
        <div className={`border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#eb5e41] text-white shadow-md shadow-[#eb5e41]/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
                Champion Model Weights
              </h4>
              <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
                Serialized joblib model trained with Optuna optimal parameters.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#eb5e41] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Scikit-Learn / Joblib ready</span>
              </div>
            </div>
          </div>

          <a
            href={modelUrl}
            download="champion_model.joblib"
            className="mt-4 flex items-center justify-center gap-2 bg-[#eb5e41] hover:bg-[#d94b2c] text-white py-2.5 px-3 rounded-xl text-xs font-semibold shadow-md shadow-[#eb5e41]/20 transition cursor-pointer active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            Download Model (.joblib)
          </a>
        </div>
      </div>
    </div>
  );
}
