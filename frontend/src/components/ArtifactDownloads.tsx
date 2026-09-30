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
        <h3 className={`text-base font-bold tracking-tight ${
          isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
        }`}>
          Export & Deployment Artifacts
        </h3>
        <p className={`text-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
          Download production-ready serialized model weights and preprocessed datasets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cleaned Dataset Card */}
        <div className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-lg border ${
              isDark ? "bg-[#252420] text-[#658a60] border-[#3c3931]" : "bg-[#658a60]/15 text-[#3f5f3b] border-[#658a60]/30"
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
                Cleaned & Encoded Dataset
              </h4>
              <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                Deduplicated, missing-value imputed, and feature engineered.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#658a60] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for inspection (.csv)</span>
              </div>
            </div>
          </div>

          <a
            href={csvUrl}
            download={csvFilename}
            className={`mt-4 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isDark
                ? "bg-[#252420] hover:bg-[#2c2a24] text-[#f4f1ea] border-[#3c3931]"
                : "bg-[#faf8f5] hover:bg-[#ede8df] text-[#2d2925] border-[#dcd5c9]"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#658a60]" />
            Download Cleaned CSV
          </a>
        </div>

        {/* Champion Model (.joblib) Card */}
        <div className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#658a60] text-white shadow-xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
                Champion Model Weights
              </h4>
              <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                Serialized joblib model trained with Optuna optimal parameters.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#658a60] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Scikit-Learn / Joblib ready</span>
              </div>
            </div>
          </div>

          <a
            href={modelUrl}
            download="champion_model.joblib"
            className="mt-4 flex items-center justify-center gap-2 bg-[#658a60] hover:bg-[#53744e] text-white py-2.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-[0.99] shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            Download Model (.joblib)
          </a>
        </div>
      </div>
    </div>
  );
}
