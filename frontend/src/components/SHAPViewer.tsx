"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ZoomIn, Download, Info, X, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { getArtifactUrl } from "../lib/api";

interface SHAPViewerProps {
  runId: string;
  shapPlotPath?: string | null;
  status?: string;
}

export default function SHAPViewer({ runId, shapPlotPath, status }: SHAPViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryToken, setRetryToken] = useState<number>(0);

  const filename = shapPlotPath
    ? shapPlotPath.split(/[\\/]/).pop() || "shap_summary_plot.png"
    : "shap_summary_plot.png";

  const baseUrl = getArtifactUrl(runId, filename);
  const url = retryToken ? `${baseUrl}?t=${retryToken}` : baseUrl;

  useEffect(() => {
    setImgStatus("loading");
    setRetryToken(0);
  }, [runId, shapPlotPath]);

  const handleRetry = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRetryToken(Date.now());
    setImgStatus("loading");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1C1917]">Global Feature Importance (SHAP)</h3>
          <p className="text-xs text-[#574E47]">
            Model interpretability and feature attribution computed by Explainer agent
          </p>
        </div>
        {status === "running" && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#CA651B] bg-[#FAC61B]/25 border border-[#FAC61B]/50 px-3 py-1 rounded-full animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CA651B]" />
            Computing SHAP values...
          </span>
        )}
      </div>

      <div className="bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3 border-b border-[#C8BCAB] flex items-center justify-between bg-[#E5DDD0]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FAC61B]/25 text-[#CA651B]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#1C1917]">SHAP Summary Plot</span>
          </div>
          <div className="flex items-center gap-1.5">
            {imgStatus === "loaded" && (
              <>
                <button
                  onClick={() => setIsZoomed(true)}
                  className="p-1.5 rounded-lg text-[#574E47] hover:text-[#CA651B] hover:bg-[#DDD4C5] transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <a
                  href={url}
                  download="shap_summary_plot.png"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-[#574E47] hover:text-[#CA651B] hover:bg-[#DDD4C5] transition cursor-pointer"
                  title="Download Plot"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </>
            )}
            <button
              onClick={handleRetry}
              className="p-1.5 rounded-lg text-[#574E47] hover:text-[#CA651B] hover:bg-[#DDD4C5] transition cursor-pointer"
              title="Reload Plot"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          className={`p-6 flex items-center justify-center bg-[#ECE4D8] min-h-[320px] relative ${
            imgStatus === "loaded" ? "cursor-pointer" : ""
          }`}
          onClick={() => {
            if (imgStatus === "loaded") {
              setIsZoomed(true);
            }
          }}
        >
          {/* Loading state */}
          {imgStatus === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#574E47] bg-[#ECE4D8]/80">
              <Loader2 className="w-7 h-7 animate-spin text-[#CA651B]" />
              <span className="text-xs font-bold text-[#CA651B]">Loading SHAP summary plot...</span>
            </div>
          )}

          {/* Error state */}
          {imgStatus === "error" && (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="p-3 rounded-2xl bg-[#B83E16]/10 text-[#B83E16] border border-[#B83E16]/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1C1917]">SHAP plot not available</p>
                <p className="text-xs text-[#574E47] max-w-sm">
                  {status === "running"
                    ? "The Explainer agent has not generated the SHAP summary plot yet."
                    : "The SHAP plot was not generated or could not be found for this run."}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="mt-2 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF6F0] hover:bg-[#E5DDD0] text-[#CA651B] text-xs font-bold border border-[#C8BCAB] shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Loading
              </button>
            </div>
          )}

          {/* Main image */}
          <img
            src={url}
            alt="SHAP Feature Importance"
            onLoad={() => setImgStatus("loaded")}
            onError={() => setImgStatus("error")}
            className={`max-h-96 object-contain rounded-lg shadow-sm hover:scale-[1.01] transition duration-200 ${
              imgStatus === "loaded" ? "opacity-100" : "opacity-0 absolute"
            }`}
          />
        </div>

        {/* Explainability guide box */}
        <div className="p-4 bg-[#E5DDD0] border-t border-[#C8BCAB] flex items-start gap-3 text-xs text-[#574E47]">
          <Info className="w-4 h-4 text-[#CA651B] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#1C1917]">How to interpret SHAP values: </span>
            Features are ranked by their global influence on model predictions. Red dots represent high feature values,
            and blue dots represent low feature values. Horizontal position indicates whether that value pushed the prediction
            higher or lower.
          </div>
        </div>
      </div>

      {/* Lightbox Zoom */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#FAF6F0] border border-[#C8BCAB] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#C8BCAB] flex items-center justify-between bg-[#E5DDD0]">
              <h4 className="text-sm font-bold text-[#1C1917]">Global SHAP Feature Importance</h4>
              <button
                onClick={() => setIsZoomed(false)}
                className="p-1.5 rounded-lg text-[#574E47] hover:text-[#1C1917] hover:bg-[#DDD4C5] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-[#ECE4D8] max-h-[80vh] overflow-auto">
              <img src={url} alt="SHAP Plot Zoom" className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
