import React, { useState, useRef, useEffect } from "react";
import { 
  Zap, 
  BrainCircuit, 
  Sparkles, 
  ChevronDown, 
  Check, 
  Cpu, 
  Info,
  Clock,
  Flame
} from "lucide-react";
import { GeminiModelId, GeminiModelInfo, AVAILABLE_MODELS } from "../types";

interface ModelSelectorProps {
  selectedModel: GeminiModelId;
  onSelectModel: (modelId: GeminiModelId) => void;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getModelIcon = (id: GeminiModelId) => {
    switch (id) {
      case "gemini-3.1-flash-lite":
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "gemini-3.8-flash":
        return <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />;
      case "gemini-flash-latest":
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="model-selector-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all border ${
          compact
            ? "px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border-slate-700/70 text-slate-200 text-xs shadow-xs"
            : "px-3 py-2 bg-slate-900 hover:bg-slate-850 border-indigo-500/30 hover:border-indigo-500/60 text-slate-100 text-xs shadow-sm hover:shadow-indigo-500/10"
        }`}
        title="Sajjat AI মডেল পরিবর্তন করুন"
      >
        <div className="flex items-center gap-1.5">
          {getModelIcon(current.id)}
          <span className="font-semibold text-white tracking-tight">
            {current.name}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700/60">
            {current.badge.split(" ")[0]}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Sajjat AI মডেল নির্বাচন
            </span>
            <span className="text-[10px] text-slate-400">সহজ ও দ্রুত উত্তর</span>
          </div>

          <div className="space-y-1 pt-1">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/50 shadow-xs"
                      : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    {getModelIcon(model.id)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate">
                        {model.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-indigo-300 px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30 whitespace-nowrap">
                        {model.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>

                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 text-emerald-400 font-mono">
                        <Clock className="w-3 h-3" />
                        {model.speed}
                      </span>
                      <span>•</span>
                      <span className="truncate text-slate-400">
                        {model.bestFor}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0 mt-1">
                      <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-950/50 rounded-xl mt-1">
            <Info className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>কোনো মডেল ডাউন থাকলে সিস্টেম স্বয়ংক্রিয়ভাবে দ্রুততম ব্যাকআপ ব্যবহার করবে।</span>
          </div>
        </div>
      )}
    </div>
  );
};
