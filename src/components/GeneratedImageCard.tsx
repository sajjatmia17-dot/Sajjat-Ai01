import React, { useState, useEffect } from "react";
import { Download, Maximize2, Sparkles, Copy, Check, RefreshCw, X } from "lucide-react";
import { applySajjatAiWatermark, downloadWatermarkedImage } from "../utils/imageWatermark";

interface GeneratedImageCardProps {
  imageUrl: string;
  prompt?: string;
  onRegenerate?: (prompt: string) => void;
}

export const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({
  imageUrl,
  prompt,
  onRegenerate,
}) => {
  const [watermarkedSrc, setWatermarkedSrc] = useState<string>(imageUrl);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsProcessing(true);

    applySajjatAiWatermark(imageUrl, {
      logoText: "Sajjat AI",
      subText: "Official AI Artwork",
      position: "bottom-right",
      quality: 0.95,
    })
      .then((watermarkedData) => {
        if (isMounted) {
          setWatermarkedSrc(watermarkedData);
          setIsProcessing(false);
        }
      })
      .catch((err) => {
        console.warn("Watermark error:", err);
        if (isMounted) {
          setWatermarkedSrc(imageUrl);
          setIsProcessing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  const handleDownload = () => {
    setIsDownloading(true);
    const fileName = `Sajjat_AI_${Date.now()}.jpg`;
    downloadWatermarkedImage(watermarkedSrc, fileName);
    setTimeout(() => setIsDownloading(false), 800);
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="my-3 max-w-lg w-full rounded-2xl overflow-hidden border border-indigo-500/30 bg-slate-950/90 shadow-xl shadow-indigo-950/30 group/imgcard animate-in fade-in transition-all">
        {/* Card Header Tag */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-indigo-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Sajjat AI তৈরি করেছে</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
            ⚡ HD Image
          </span>
        </div>

        {/* Image Display Area */}
        <div className="relative aspect-square sm:aspect-auto max-h-[420px] w-full bg-slate-900 flex items-center justify-center overflow-hidden">
          {isProcessing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[11px] text-cyan-300 mt-2">Sajjat AI লোগো যোগ করা হচ্ছে...</span>
            </div>
          )}

          <img
            src={watermarkedSrc}
            alt={prompt || "Sajjat AI Generated Image"}
            className="w-full h-full object-cover sm:object-contain transition-transform duration-500 group-hover/imgcard:scale-[1.02]"
            loading="lazy"
          />

          {/* Quick Overlay action on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/imgcard:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
            <span className="text-[11px] text-slate-200 font-medium truncate max-w-[200px]">
              {prompt}
            </span>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-xl bg-slate-900/90 text-white hover:bg-indigo-600 transition-colors shadow-md text-xs flex items-center gap-1 cursor-pointer"
                title="বড় করে দেখুন"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Prompt Information & Action Buttons Footer */}
        <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 space-y-2.5">
          {prompt && (
            <div className="flex items-start justify-between gap-2 text-xs text-slate-300 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                <span className="text-cyan-400 font-medium">প্রম্পট:</span> {prompt}
              </p>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 transition-colors"
                title="প্রম্পট কপি করুন"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? "ডাউনলোড হচ্ছে..." : "লোগোসহ ডাউনলোড"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">বড় করুন</span>
              </button>
            </div>

            {onRegenerate && prompt && (
              <button
                type="button"
                onClick={() => onRegenerate(prompt)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 text-xs flex items-center gap-1 border border-slate-700/60 hover:border-indigo-500/40 transition-all cursor-pointer"
                title="একই বর্ণনায় নতুন ছবি আঁকুন"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>পুনরায় আঁকুন</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <h3 className="text-sm font-bold text-slate-100">Sajjat AI HD Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ডাউনলোড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Fullscreen Image */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black max-h-[75vh]">
              <img
                src={watermarkedSrc}
                alt={prompt || "Sajjat AI Art"}
                className="max-h-[75vh] w-auto object-contain rounded-2xl"
              />
            </div>

            {prompt && (
              <p className="text-xs text-slate-400 mt-3 text-center max-w-xl">
                {prompt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
