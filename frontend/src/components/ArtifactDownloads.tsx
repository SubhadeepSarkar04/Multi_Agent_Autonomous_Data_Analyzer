"use client";

import React from "react";
import { Download, FileSpreadsheet, Box, CheckCircle2 } from "lucide-react";
import { getArtifactUrl, getModelDownloadUrl } from "../lib/api";

interface ArtifactDownloadsProps {
  runId: string;
  cleanedCsvPath?: string | null;
  modelPath?: string | null;
}

export default function ArtifactDownloads({ runId, cleanedCsvPath, modelPath }: ArtifactDownloadsProps) {
  const csvFilename = cleanedCsvPath ? cleanedCsvPath.split(/[\\/]/).pop() || "cleaned_dataset.csv" : "cleaned_dataset.csv";
  const csvUrl = getArtifactUrl(runId, csvFilename);
  const modelUrl = getModelDownloadUrl(runId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#1C1917]">Export & Deployment Artifacts</h3>
        <p className="text-xs text-[#574E47]">Download production-ready model weights and cleaned datasets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cleaned Dataset Card */}
        <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#08979D]/15 text-[#08979D] border border-[#08979D]/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1C1917]">Cleaned & Encoded Dataset</h4>
              <p className="text-[11px] text-[#574E47] mt-0.5">
                Deduplicated, missing-value imputed, and feature engineered.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#08979D] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for inspection</span>
              </div>
            </div>
          </div>

          <a
            href={csvUrl}
            download={csvFilename}
            className="mt-4 flex items-center justify-center gap-2 bg-[#E5DDD0] hover:bg-[#DDD4C5] text-[#08979D] py-2.5 px-3 rounded-xl text-xs font-bold border border-[#C8BCAB] shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Cleaned CSV
          </a>
        </div>

        {/* Champion Model (.joblib) Card */}
        <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#CA651B]/15 text-[#CA651B] border border-[#CA651B]/30">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1C1917]">Champion Model Weights</h4>
              <p className="text-[11px] text-[#574E47] mt-0.5">
                Serialized joblib model tuned with best Optuna parameters.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#CA651B] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Scikit-Learn / Joblib export</span>
              </div>
            </div>
          </div>

          <a
            href={modelUrl}
            download="champion_model.joblib"
            className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#CA651B] to-[#FAC61B] hover:from-[#d56d22] hover:to-[#fbc92b] text-[#1C1917] py-2.5 px-3 rounded-xl text-xs font-bold shadow-md shadow-[#CA651B]/20 transition cursor-pointer active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5 text-[#1C1917]" />
            Download Model (.joblib)
          </a>
        </div>
      </div>
    </div>
  );
}
