"use client";

import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  ZoomIn,
  X,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getArtifactUrl } from "../lib/api";
import { useTheme } from "../lib/ThemeContext";

interface EDAGalleryProps {
  runId: string;
  edaPlotPaths?: string[] | null;
  status?: string;
}

export default function EDAGallery({ runId, edaPlotPaths, status }: EDAGalleryProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [activeModalImg, setActiveModalImg] = useState<{ url: string; title: string } | null>(null);
  const [imgStatuses, setImgStatuses] = useState<Record<string, "loading" | "loaded" | "error">>({});
  const [retryTokens, setRetryTokens] = useState<Record<string, number>>({});

  // Defaults if empty
  const plotList =
    edaPlotPaths && edaPlotPaths.length > 0
      ? edaPlotPaths
      : ["eda_target_dist.png", "eda_correlation.png"];

  // Reset statuses when runId or plotList changes
  useEffect(() => {
    setImgStatuses({});
    setRetryTokens({});
  }, [runId, JSON.stringify(edaPlotPaths)]);

  const formatTitle = (path: string) => {
    const filename = path.split(/[\\/]/).pop() || path;
    return filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase();
  };

  const handleRetry = (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRetryTokens((prev) => ({ ...prev, [filename]: Date.now() }));
    setImgStatuses((prev) => ({ ...prev, [filename]: "loading" }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-bold font-serif-display text-base ${
            isDark ? "text-[#f4f3ee]" : "text-slate-900"
          }`}>
            Exploratory Data Analysis (EDA)
          </h3>
          <p className={`text-xs ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
            Automated feature distributions and correlation heatmaps rendered by Loader & EDA agent
          </p>
        </div>
        {status === "running" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-pulse shadow-sm border ${
            isDark
              ? "text-[#eb5e41] bg-[#174337] border-[#eb5e41]/60"
              : "text-[#eb5e41] bg-orange-50 border-orange-200"
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#eb5e41]" />
            Generating plots...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plotList.map((path, idx) => {
          const title = formatTitle(path);
          const filename = path.split(/[\\/]/).pop() || path;
          const retryKey = retryTokens[filename];
          const baseUrl = getArtifactUrl(runId, filename);
          const url = retryKey ? `${baseUrl}?t=${retryKey}` : baseUrl;
          const imgStatus = imgStatuses[filename] || "loading";

          return (
            <div
              key={`${filename}-${idx}`}
              className={`group relative border rounded-2xl overflow-hidden shadow-md transition duration-150 ${
                isDark
                  ? "bg-[#12382f] border-[#1e4e42] hover:border-[#eb5e41]/60"
                  : "bg-white border-slate-200 hover:border-[#eb5e41]/60 shadow-sm"
              }`}
            >
              <div className={`p-3 border-b flex items-center justify-between ${
                isDark ? "border-[#1e4e42] bg-[#0d2822]" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    isDark ? "bg-[#174337] text-[#eb5e41] border-[#1e4e42]" : "bg-orange-50 text-[#eb5e41] border-orange-200"
                  }`}>
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-900"}`}>
                    {title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {imgStatus === "loaded" && (
                    <>
                      <button
                        onClick={() => setActiveModalImg({ url, title })}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isDark
                            ? "text-[#98bbaf] hover:text-[#eb5e41] hover:bg-[#174337]"
                            : "text-slate-500 hover:text-[#eb5e41] hover:bg-slate-100"
                        }`}
                        title="Enlarge Image"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={url}
                        download={filename}
                        target="_blank"
                        rel="noreferrer"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isDark
                            ? "text-[#98bbaf] hover:text-[#eb5e41] hover:bg-[#174337]"
                            : "text-slate-500 hover:text-[#eb5e41] hover:bg-slate-100"
                        }`}
                        title="Download Image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                  <button
                    onClick={(e) => handleRetry(filename, e)}
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
                className={`p-4 flex items-center justify-center min-h-[260px] relative ${
                  isDark ? "bg-[#081d18]" : "bg-slate-100/60"
                } ${imgStatus === "loaded" ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (imgStatus === "loaded") {
                    setActiveModalImg({ url, title });
                  }
                }}
              >
                {/* Loading state */}
                {imgStatus === "loading" && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${
                    isDark ? "text-[#98bbaf] bg-[#081d18]/80" : "text-slate-500 bg-white/80"
                  }`}>
                    <Loader2 className="w-6 h-6 animate-spin text-[#eb5e41]" />
                    <span className="text-xs font-semibold text-[#eb5e41]">Loading plot...</span>
                  </div>
                )}

                {/* Error state */}
                {imgStatus === "error" && (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                    <div className={`p-2.5 rounded-xl border ${
                      isDark
                        ? "bg-[#2d1215] text-[#f87171] border-[#7f1d1d]/60"
                        : "bg-rose-50 text-rose-600 border-rose-200"
                    }`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-bold ${isDark ? "text-[#f4f3ee]" : "text-slate-800"}`}>
                        Plot not available
                      </p>
                      <p className={`text-[11px] max-w-[220px] ${isDark ? "text-[#98bbaf]" : "text-slate-500"}`}>
                        {status === "running"
                          ? "Still being rendered by the EDA agent."
                          : "File was not generated or could not be found."}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRetry(filename, e)}
                      className={`mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#eb5e41] text-xs font-semibold border shadow-xs transition cursor-pointer ${
                        isDark
                          ? "bg-[#174337] hover:bg-[#1f5647] border-[#1e4e42]"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}

                {/* Main image */}
                <img
                  src={url}
                  alt={title}
                  onLoad={() => {
                    setImgStatuses((prev) => ({ ...prev, [filename]: "loaded" }));
                  }}
                  onError={() => {
                    setImgStatuses((prev) => ({ ...prev, [filename]: "error" }));
                  }}
                  className={`max-h-72 object-contain rounded-lg shadow-sm group-hover:scale-[1.01] transition duration-200 ${
                    imgStatus === "loaded" ? "opacity-100" : "opacity-0 absolute"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Zoom Modal */}
      {activeModalImg && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveModalImg(null)}
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
              }`}>{activeModalImg.title}</h4>
              <button
                onClick={() => setActiveModalImg(null)}
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
              <img
                src={activeModalImg.url}
                alt={activeModalImg.title}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
