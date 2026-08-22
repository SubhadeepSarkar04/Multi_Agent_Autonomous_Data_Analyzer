"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ZoomIn, Download, Info, X, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
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
          <h3 className={`text-sm font-bold font-serif-display text-base ${
            isDark ? "text-[#f4f3ee]" : "text-slate-900"
          }`}>
            Global Feature Importance (SHAP)
          </h3>
          <p className={`text-xs ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
            Model interpretability and feature attribution computed by Explainer agent
          </p>
        </div>
        {status === "running" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-pulse shadow-sm border ${
            isDark
              ? "text-[#eb5e41] bg-[#174337] border-[#eb5e41]/60"
              : "text-[#eb5e41] bg-orange-50 border-orange-200"
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#eb5e41]" />
            Computing SHAP values...
          </span>
        )}
      </div>

      <div className={`border rounded-2xl overflow-hidden shadow-md transition-colors ${
        isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className={`p-3 border-b flex items-center justify-between ${
          isDark ? "border-[#1e4e42] bg-[#0d2822]" : "border-slate-200 bg-slate-50"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${
              isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
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
                      ? "text-[#98bbaf] hover:text-[#eb5e41] hover:bg-[#174337]"
                      : "text-slate-500 hover:text-[#eb5e41] hover:bg-slate-100"
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
                      ? "text-[#98bbaf] hover:text-[#eb5e41] hover:bg-[#174337]"
                      : "text-slate-500 hover:text-[#eb5e41] hover:bg-slate-100"
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
                  ? "text-[#98bbaf] hover:text-[#eb5e41] hover:bg-[#174337]"
                  : "text-slate-500 hover:text-[#eb5e41] hover:bg-slate-100"
              }`}
              title="Reload Plot"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          className={`p-6 flex items-center justify-center min-h-[320px] relative ${
            isDark ? "bg-[#081d18]" : "bg-slate-100/60"
          } ${imgStatus === "loaded" ? "cursor-pointer" : ""}`}
          onClick={() => {
            if (imgStatus === "loaded") {
              setIsZoomed(true);
            }
          }}
        >
          {/* Loading state */}
          {imgStatus === "loading" && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${
              isDark ? "text-[#98bbaf] bg-[#081d18]/80" : "text-slate-500 bg-white/80"
            }`}>
              <Loader2 className="w-7 h-7 animate-spin text-[#eb5e41]" />
              <span className="text-xs font-semibold text-[#eb5e41]">Loading SHAP summary plot...</span>
            </div>
          )}

          {/* Error state */}
          {imgStatus === "error" && (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className={`p-3 rounded-2xl border ${
                isDark
                  ? "bg-[#2d1215] text-[#f87171] border-[#7f1d1d]/60"
                  : "bg-rose-50 text-rose-600 border-rose-200"
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className={`text-sm font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-800"}`}>
                  SHAP plot not available
                </p>
                <p className={`text-xs max-w-sm ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
                  {status === "running"
                    ? "The Explainer agent has not generated the SHAP summary plot yet."
                    : "The SHAP plot was not generated or could not be found for this run."}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className={`mt-2 flex items-center gap-2 px-3.5 py-2 rounded-xl text-[#eb5e41] text-xs font-semibold border shadow-xs transition cursor-pointer ${
                  isDark
                    ? "bg-[#174337] hover:bg-[#1f5647] border-[#1e4e42]"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
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
        <div className={`p-4 border-t flex items-start gap-3 text-xs ${
          isDark
            ? "bg-[#0d2822] border-[#1e4e42] text-[#98bbaf]"
            : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <Info className="w-4 h-4 text-[#eb5e41] shrink-0 mt-0.5" />
          <div>
            <span className={`font-semibold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
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
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className={`relative max-w-4xl w-full border rounded-2xl overflow-hidden shadow-2xl ${
              isDark ? "bg-[#12382f] border-[#1e4e42]" : "bg-white border-slate-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "border-[#1e4e42] bg-[#0d2822]" : "border-slate-200 bg-slate-50"
            }`}>
              <h4 className={`text-sm font-bold font-serif-display ${
                isDark ? "text-[#f4f3ee]" : "text-slate-900"
              }`}>Global SHAP Feature Importance</h4>
              <button
                onClick={() => setIsZoomed(false)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isDark
                    ? "text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#174337]"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`p-6 flex items-center justify-center max-h-[80vh] overflow-auto ${
              isDark ? "bg-[#081d18]" : "bg-slate-100"
            }`}>
              <img src={url} alt="SHAP Plot Zoom" className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
