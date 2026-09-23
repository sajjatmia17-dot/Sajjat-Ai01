import React from "react";
import { 
  Settings, 
  X, 
  Check, 
  Moon, 
  Sun, 
  Zap, 
  BrainCircuit, 
  Sparkles, 
  Shield, 
  Clock, 
  Cpu, 
  Info,
  CheckCircle2,
  Sliders,
  Palette,
  FileCode,
  Download
} from "lucide-react";
import { GeminiModelId, AVAILABLE_MODELS } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: GeminiModelId;
  onSelectModel: (model: GeminiModelId) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenHtmlViewer?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  theme,
  onToggleTheme,
  onOpenHtmlViewer,
}) => {
  if (!isOpen) return null;

  const getModelIcon = (id: GeminiModelId) => {
    switch (id) {
      case "gemini-3.1-flash-lite":
        return <Zap className="w-4 h-4 text-amber-400" />;
      case "gemini-3.8-flash":
        return <BrainCircuit className="w-4 h-4 text-indigo-400" />;
      case "gemini-flash-latest":
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      default:
        return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                সেটিংস (Settings)
              </h3>
              <p className="text-xs text-slate-400">
                মডেল নির্বাচন ও অ্যাপ্লিকেশন পছন্দসমূহ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-6">
          {/* Section 1: Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Sajjat AI মডেল নির্বাচন</span>
              </label>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                সরাসরি সক্রিয়
              </span>
            </div>

            <div className="space-y-2">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel(model.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 relative group ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10 text-white"
                        : "bg-slate-950/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5 group-hover:border-slate-700">
                      {getModelIcon(model.id)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-white truncate">
                          {model.name}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 shrink-0">
                          {model.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-2">
                        {model.description}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {model.speed}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 truncate">
                          {model.bestFor}
                        </span>
                      </div>
                    </div>

                    {/* Checkmark */}
                    <div className="shrink-0 self-center pl-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "border-slate-700 bg-slate-900/80 text-transparent"
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Appearance & Theme */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>থিম ও ডিসপ্লে (Theme & Appearance)</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => theme !== "dark" && onToggleTheme()}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === "dark"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-xs"
                    : "bg-slate-950/60 border-slate-800 hover:bg-slate-850 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block text-white">ডার্ক মোড</span>
                    <span className="text-[10px] text-slate-400">অন্ধকার ব্যাকগ্রাউন্ড</span>
                  </div>
                </div>
                {theme === "dark" && <Check className="w-4 h-4 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => theme !== "light" && onToggleTheme()}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  theme === "light"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-xs"
                    : "bg-slate-950/60 border-slate-800 hover:bg-slate-850 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block text-white">লাইট মোড</span>
                    <span className="text-[10px] text-slate-400">উজ্জ্বল ব্যাকগ্রাউন্ড</span>
                  </div>
                </div>
                {theme === "light" && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            </div>
          </div>

          {/* Section 3: App Information */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">অ্যাপ্লিকেশন:</span>
              <span className="text-indigo-300 font-bold">Sajjat AI Assistant</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">নির্মাতা ও স্বত্বাধিকারী:</span>
              <span className="text-cyan-400 font-medium">Sajjat Mia</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">প্রযুক্তিগত ভিত্তি:</span>
              <span className="text-emerald-400 font-mono text-[11px]">Sajjat AI Core Engine</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            সম্পন্ন (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
