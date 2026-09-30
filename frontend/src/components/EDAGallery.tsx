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
          <h3 className={`text-base font-bold tracking-tight ${
            isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"
          }`}>
            Exploratory Data Analysis (EDA)
          </h3>
          <p className={`text-xs ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
            Automated feature distributions and correlation heatmaps rendered by Loader & EDA agent
          </p>
        </div>
        {status === "running" && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isDark
              ? "text-[#f59e0b] bg-[#d97706]/20 border-[#d97706]/40"
              : "text-[#b45309] bg-[#d97706]/15 border-[#d97706]/30"
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d97706]" />
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
              className={`group relative border rounded-xl overflow-hidden transition duration-150 ${
                isDark
                  ? "bg-[#23221d] border-[#3c3931] hover:border-[#658a60]"
                  : "bg-white border-[#dcd5c9] hover:border-[#658a60]"
              }`}
            >
              <div className={`p-3 border-b flex items-center justify-between ${
                isDark ? "border-[#3c3931] bg-[#181714]" : "border-[#dcd5c9] bg-[#f4efe6]"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    isDark ? "bg-[#252420] text-[#658a60] border-[#3c3931]" : "bg-white text-[#3f5f3b] border-[#dcd5c9]"
                  }`}>
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-xs font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
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
                            ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                            : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
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
                            ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                            : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
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
                className={`p-4 flex items-center justify-center min-h-[260px] relative ${
                  isDark ? "bg-[#181714]" : "bg-[#faf8f5]"
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
                    isDark ? "text-[#9a9386] bg-[#181714]" : "text-[#756e63] bg-white"
                  }`}>
                    <Loader2 className="w-6 h-6 animate-spin text-[#658a60]" />
                    <span className="text-xs font-semibold text-[#658a60]">Loading plot...</span>
                  </div>
                )}

                {/* Error state */}
                {imgStatus === "error" && (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                    <div className={`p-2.5 rounded-lg border ${
                      isDark
                        ? "bg-rose-950/50 text-rose-400 border-rose-900/50"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-bold ${isDark ? "text-[#f4f1ea]" : "text-[#2d2925]"}`}>
                        Plot not available
                      </p>
                      <p className={`text-[11px] max-w-[220px] ${isDark ? "text-[#9a9386]" : "text-[#756e63]"}`}>
                        {status === "running"
                          ? "Still being rendered by the EDA agent."
                          : "File was not generated or could not be found."}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRetry(filename, e)}
                      className={`mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
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
                  className={`max-h-72 object-contain rounded-md transition duration-200 ${
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActiveModalImg(null)}
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
              }`}>{activeModalImg.title}</h4>
              <button
                onClick={() => setActiveModalImg(null)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isDark
                    ? "text-[#9a9386] hover:text-[#f4f1ea] hover:bg-[#2c2a24]"
                    : "text-[#756e63] hover:text-[#2d2925] hover:bg-[#ede8df]"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`p-6 flex items-center justify-center max-h-[80vh] overflow-auto ${
              isDark ? "bg-[#181714]" : "bg-[#faf8f5]"
            }`}>
              <img
                src={activeModalImg.url}
                alt={activeModalImg.title}
                className="max-h-[70vh] object-contain rounded-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
