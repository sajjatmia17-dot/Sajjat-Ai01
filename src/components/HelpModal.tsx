import React from "react";
import { 
  HelpCircle, 
  X, 
  MessageSquare, 
  Sliders, 
  Mic, 
  Paperclip, 
  Trash2, 
  Search, 
  Shield, 
  Sparkles,
  Zap,
  BrainCircuit,
  Command,
  UserCheck
} from "lucide-react";
import { AppContentConfig } from "../types";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appContent?: AppContentConfig | null;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, appContent }) => {
  if (!isOpen) return null;

  const items = appContent?.helpCenterItems && appContent.helpCenterItems.length > 0 
    ? appContent.helpCenterItems 
    : [
        {
          id: "1",
          title: "মডেল পরিবর্তন (Settings ⚙️)",
          description: "উপরের ⚙️ Settings থেকে আপনার প্রয়োজন অনুযায়ী Sajjat AI 3.1 Flash Lite (সবচেয়ে দ্রুত), Sajjat AI 3.8 Flash (কোডিং ও বিশ্লেষণী) বা Sajjat AI Flash Latest বেছে নিতে পারেন।",
        },
        {
          id: "2",
          title: "হিস্টোরি সার্চ (Search History)",
          description: "বাম পাশের ☰ মেনুর ভিতরে সার্চ বক্সে কি-ওয়ার্ড লিখে আপনার আগের যেকোনো কথোপকথন নিমিষেই খুঁজে বের করুন।",
        },
        {
          id: "3",
          title: "চ্যাট মুছুন (Clear Chat & Delete)",
          description: "মেনুর 🗑️ Clear Chat বোতাম দিয়ে সমস্ত হিস্টোরি ক্লিয়ার করতে পারেন অথবা যেকোনো চ্যাটের পাশের ট্র্যাশ আইকন দিয়ে সিঙ্গেল চ্যাট মুছতে পারেন।",
        },
        {
          id: "4",
          title: "ভয়েস ও ফাইল ইনপুট",
          description: "মাইক্রোফোন আইকনে ক্লিক করে বাংলায় কথা বলে প্রশ্ন করতে পারেন এবং পেপারক্লিপ ও ছবি আইকন দিয়ে ফাইল বা কোড আপলোড করতে পারেন।",
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                সহায়তা কেন্দ্র (Help Center)
              </h3>
              <p className="text-xs text-slate-400">
                {appContent?.helpCenterIntro || "Sajjat AI ব্যবহারের নিয়ম ও গাইডলাইন"}
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
        <div className="py-4 space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Intro */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
            <h4 className="font-bold text-indigo-300 text-sm mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Sajjat AI কী?
            </h4>
            <p className="text-slate-300">
              <strong className="text-white">Sajjat AI</strong> হলো একটি অত্যন্ত দ্রুত, স্মার্ট এবং নির্ভরযোগ্য কৃত্রিম বুদ্ধিমত্তা সহকারী। এটিকে মানুষের কল্যাণে ও সঠিক সেবা প্রদানের জন্য তৈরি করেছেন <strong className="text-cyan-300">Sajjat Mia</strong>।
            </p>
          </div>

          {/* Section 2: Features Grid */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              প্রধান ফিচারসমূহ ও ব্যবহারবিধি:
            </h4>

            {items.map((item, idx) => (
              <div key={item.id ? `help_item_${item.id}` : `help_item_${idx}`} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-100">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>{item.title}</span>
                </div>
                <p className="text-slate-400 text-[11px] whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Section 3: Keyboard Shortcuts */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5 text-indigo-400" />
              কীবোর্ড শর্টকাট:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-lg">
                <span className="text-slate-400">মেসেজ পাঠান:</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 font-mono text-[10px]">Enter</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-lg">
                <span className="text-slate-400">নতুন লাইন:</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 font-mono text-[10px]">Shift + Enter</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            বুঝেছি (Got It)
          </button>
        </div>
      </div>
    </div>
  );
};
