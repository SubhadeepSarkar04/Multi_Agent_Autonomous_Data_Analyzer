"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ZoomIn, Download, Info, X, RefreshCw, Loader2, EyeOff } from "lucide-react";
import { getArtifactUrl } from "../lib/api";
import { useTheme } from "../lib/ThemeContext";

interface SHAPViewerProps {
  runId: string;
  shapPlotPath?: string | null;
  status?: string;
}

export default function SHAPViewer({ runId, shapPlotPath, status }: SHAPViewerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
          <h3 className={`text-base font-bold tracking-tight ${
            isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
          }`}>
            Global Feature Importance (SHAP)
          </h3>
          <p className={`text-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
            Model interpretability and feature attribution computed by Explainer agent
          </p>
        </div>
        {status === "running" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#f59e0b] bg-[#d97706]/20 border-[#d97706]/40"
              : "text-[#b45309] bg-[#d97706]/15 border-[#d97706]/30"
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d97706]" />
            Computing SHAP values...
          </span>
        )}
      </div>

      <div className={`border rounded-xl overflow-hidden transition-colors ${
        isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
      }`}>
        <div className={`p-3 border-b flex items-center justify-between ${
          isDark ? "border-[#3c3931] bg-[#181714]" : "border-[#dcd5c9] bg-[#f4efe6]"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${
              isDark ? "bg-[#252420] text-[#d97706] border-[#3c3931]" : "bg-white text-[#d97706] border-[#dcd5c9]"
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
              SHAP Summary Plot
            </span>
          </div>
          <div className="flex items-center gap-1">
            {imgStatus === "loaded" && (
              <>
                <button
                  onClick={() => setIsZoomed(true)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isDark
                      ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                      : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                  }`}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <a
                  href={url}
                  download="shap_summary_plot.png"
                  target="_blank"
                  rel="noreferrer"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isDark
                      ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                      : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                  }`}
                  title="Download Plot"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </>
            )}
            <button
              onClick={handleRetry}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isDark
                  ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                  : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
              }`}
              title="Reload Plot"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          className={`p-6 flex items-center justify-center min-h-[320px] relative ${
            isDark ? "bg-[#181714]" : "bg-[#faf8f5]"
          } ${imgStatus === "loaded" ? "cursor-pointer" : ""}`}
          onClick={() => {
            if (imgStatus === "loaded") {
              setIsZoomed(true);
            }
          }}
        >
          {imgStatus === "loading" && (
            <div className="flex flex-col items-center gap-3 text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#d97706]" />
              <p className={`text-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                Generating SHAP explainability plot...
              </p>
            </div>
          )}

          {imgStatus === "error" && (
            <div className="flex flex-col items-center gap-3 text-center py-8">
              <div className={`p-3 rounded-lg border ${
                isDark ? "bg-[#252420] text-[#7a7469] border-[#3c3931]" : "bg-white text-[#948c80] border-[#dcd5c9]"
              }`}>
                <EyeOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
                  No SHAP Plot Available
                </p>
                <p className={`text-[11px] max-w-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                  {status === "running"
                    ? "The Explainer agent has not generated the SHAP summary plot yet."
                    : "The SHAP plot was not generated or could not be found for this run."}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className={`mt-2 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  isDark
                    ? "bg-[#252420] hover:bg-[#2c2a24] text-[#f4f1ea] border-[#3c3931]"
                    : "bg-white hover:bg-[#ede8df] text-[#2d2925] border-[#dcd5c9]"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          <img
            src={url}
            alt="SHAP Feature Importance"
            onLoad={() => setImgStatus("loaded")}
            onError={() => setImgStatus("error")}
            className={`max-h-96 object-contain rounded-md transition duration-200 ${
              imgStatus === "loaded" ? "opacity-100" : "opacity-0 absolute"
            }`}
          />
        </div>

        {/* Explainability guide box */}
        <div className={`p-4 border-t flex items-start gap-3 text-xs ${
          isDark
            ? "bg-[#181714] border-[#3c3931] text-[#9a9386]"
            : "bg-[#f4efe6] border-[#dcd5c9] text-[#4a453e]"
        }`}>
          <Info className="w-4 h-4 text-[#658a60] shrink-0 mt-0.5" />
          <div>
            <span className={`font-semibold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
              How to interpret SHAP values:{" "}
            </span>
            Features are ranked by global influence on predictions. Red points represent high feature values,
            and blue points represent low feature values. Horizontal position indicates whether that feature pushes the prediction
            higher or lower.
          </div>
        </div>
      </div>

      {/* Lightbox Zoom */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className={`relative max-w-4xl w-full border rounded-xl overflow-hidden ${
              isDark ? "bg-[#23221d] border-[#3c3931]" : "bg-white border-[#dcd5c9]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "border-[#3c3931] bg-[#181714]" : "border-[#dcd5c9] bg-[#f4efe6]"
            }`}>
              <h4 className={`text-sm font-bold ${
                isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
              }`}>Global SHAP Feature Importance</h4>
              <button
                onClick={() => setIsZoomed(false)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isDark
                    ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                    : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`p-6 flex items-center justify-center ${isDark ? "bg-[#181714]" : "bg-[#faf8f5]"}`}>
              <img src={url} alt="SHAP Plot Zoomed" className="max-h-[75vh] object-contain rounded-md" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
