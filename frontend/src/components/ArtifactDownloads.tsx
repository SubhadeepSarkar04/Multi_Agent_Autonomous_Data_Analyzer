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
        <h3 className="text-sm font-bold text-[#0F2922]">Export & Deployment Artifacts</h3>
        <p className="text-xs text-[#2D5245]">Download production-ready model weights and cleaned datasets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cleaned Dataset Card */}
        <div className="bg-[#EAF5EE] border border-[#A3C9B2] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#D1FAE5] text-[#059669] border border-[#059669]/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F2922]">Cleaned & Encoded Dataset</h4>
              <p className="text-[11px] text-[#2D5245] mt-0.5">
                Deduplicated, missing-value imputed, and feature engineered.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#059669] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for inspection</span>
              </div>
            </div>
          </div>

          <a
            href={csvUrl}
            download={csvFilename}
            className="mt-4 flex items-center justify-center gap-2 bg-[#DCEEE3] hover:bg-[#CFE6D7] text-[#059669] py-2.5 px-3 rounded-xl text-xs font-bold border border-[#A3C9B2] shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Cleaned CSV
          </a>
        </div>

        {/* Champion Model (.joblib) Card */}
        <div className="bg-[#EAF5EE] border border-[#A3C9B2] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#D1FAE5] text-[#059669] border border-[#059669]/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F2922]">Champion Model Weights</h4>
              <p className="text-[11px] text-[#2D5245] mt-0.5">
                Serialized joblib model tuned with best Optuna parameters.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#059669] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Scikit-Learn / Joblib export</span>
              </div>
            </div>
          </div>

          <a
            href={modelUrl}
            download="champion_model.joblib"
            className="mt-4 flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            Download Model (.joblib)
          </a>
        </div>
      </div>
    </div>
  );
}
