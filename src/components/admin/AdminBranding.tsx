import React, { useState, useEffect } from "react";
import { 
  Palette, 
  Sparkles, 
  Bot, 
  BrainCircuit, 
  Zap, 
  Star, 
  Save, 
  Check, 
  RotateCcw, 
  Eye, 
  Smile, 
  Layers,
  Sparkle
} from "lucide-react";
import { SystemSettingsConfig } from "../../types";
import { subscribeToSystemSettings, saveSystemSettings } from "../../firebase";

const THEME_COLORS: Array<{
  id: "indigo" | "emerald" | "violet" | "rose" | "cyan" | "amber" | "blue";
  name: string;
  badge: string;
  gradient: string;
  border: string;
  activeRing: string;
  previewBg: string;
}> = [
  {
    id: "indigo",
    name: "রয়েল ইন্ডিগো (Royal Indigo)",
    badge: "ডিফল্ট",
    gradient: "from-indigo-500 via-purple-500 to-cyan-400",
    border: "border-indigo-500",
    activeRing: "ring-indigo-500",
    previewBg: "bg-indigo-600",
  },
  {
    id: "cyan",
    name: "সাইবার সায়ান (Cyber Cyan)",
    badge: "হাই-টেক",
    gradient: "from-cyan-400 via-teal-400 to-blue-500",
    border: "border-cyan-400",
    activeRing: "ring-cyan-400",
    previewBg: "bg-cyan-500",
  },
  {
    id: "emerald",
    name: "এমারেল্ড গ্রিন (Emerald Green)",
    badge: "প্রকৃতি",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    border: "border-emerald-500",
    activeRing: "ring-emerald-500",
    previewBg: "bg-emerald-600",
  },
  {
    id: "violet",
    name: "ম্যাজেন্টা ভায়োলেট (Deep Violet)",
    badge: "লাক্সারি",
    gradient: "from-fuchsia-500 via-purple-600 to-indigo-500",
    border: "border-purple-500",
    activeRing: "ring-purple-500",
    previewBg: "bg-purple-600",
  },
  {
    id: "rose",
    name: "ক্রিমসন রোজ (Crimson Rose)",
    badge: "ডায়নামিক",
    gradient: "from-rose-500 via-pink-500 to-orange-400",
    border: "border-rose-500",
    activeRing: "ring-rose-500",
    previewBg: "bg-rose-600",
  },
  {
    id: "amber",
    name: "অ্যাম্বার গোল্ড (Royal Gold)",
    badge: "প্রিমিয়াম",
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
    border: "border-amber-500",
    activeRing: "ring-amber-500",
    previewBg: "bg-amber-600",
  },
  {
    id: "blue",
    name: "ওশান ব্লু (Ocean Blue)",
    badge: "ক্লিন",
    gradient: "from-blue-500 via-sky-400 to-indigo-500",
    border: "border-blue-500",
    activeRing: "ring-blue-500",
    previewBg: "bg-blue-600",
  }
];

const AVATAR_ICONS = [
  { id: "bot", label: "রোবট (Bot)", icon: Bot },
  { id: "brain", label: "ব্রেইন (Brain)", icon: BrainCircuit },
  { id: "zap", label: "ইন্টেলিজেন্ট (Zap)", icon: Zap },
  { id: "sparkles", label: "ম্যাজিক (Sparkles)", icon: Sparkles },
  { id: "star", label: "স্টার (Star)", icon: Star }
];

export const AdminBranding: React.FC = () => {
  const [aiBrandName, setAiBrandName] = useState("Sajjat AI");
  const [aiTagline, setAiTagline] = useState("মানুষের সেবায় নিবেদিত সর্বাধুনিক সুপার ইন্টেলিজেন্ট বাংলা এআই সহকারী");
  const [aiThemeColor, setAiThemeColor] = useState<"indigo" | "emerald" | "violet" | "rose" | "cyan" | "amber" | "blue">("indigo");
  const [aiAvatarIcon, setAiAvatarIcon] = useState<"bot" | "brain" | "sparkles" | "zap" | "star">("bot");
  const [aiWelcomeTitle, setAiWelcomeTitle] = useState("স্বাগতম! আমি Sajjat AI");
  const [aiWelcomeSubtitle, setAiWelcomeSubtitle] = useState("আমাকে তৈরি করেছেন Sajjat Mia মানুষের সেবার জন্য। পড়াশোনা, গণিত, বিজ্ঞান, প্রযুক্তি বা যেকোনো প্রশ্নের দ্রুত ও নির্ভুল উত্তরের জন্য আমাকে প্রশ্ন করুন।");
  const [creatorName, setCreatorName] = useState("Sajjat Mia");

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSystemSettings((data) => {
      if (data) {
        if (data.aiBrandName) setAiBrandName(data.aiBrandName);
        if (data.aiTagline) setAiTagline(data.aiTagline);
        if (data.aiThemeColor) setAiThemeColor(data.aiThemeColor);
        if (data.aiAvatarIcon) setAiAvatarIcon(data.aiAvatarIcon);
        if (data.aiWelcomeTitle) setAiWelcomeTitle(data.aiWelcomeTitle);
        if (data.aiWelcomeSubtitle) setAiWelcomeSubtitle(data.aiWelcomeSubtitle);
        if (data.creatorName) setCreatorName(data.creatorName);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Partial<SystemSettingsConfig> = {
        aiBrandName,
        aiTagline,
        aiThemeColor,
        aiAvatarIcon,
        aiWelcomeTitle,
        aiWelcomeSubtitle,
        creatorName,
        updatedAt: new Date().toISOString()
      };

      await saveSystemSettings(payload);

      // Also sync to server in-memory settings
      try {
        await fetch("/api/system-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn("Server system-settings sync:", err);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save branding:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setAiBrandName("Sajjat AI");
    setAiTagline("মানুষের সেবায় নিবেদিত সর্বাধুনিক সুপার ইন্টেলিজেন্ট বাংলা এআই সহকারী");
    setAiThemeColor("indigo");
    setAiAvatarIcon("bot");
    setAiWelcomeTitle("স্বাগতম! আমি Sajjat AI");
    setAiWelcomeSubtitle("আমাকে তৈরি করেছেন Sajjat Mia মানুষের সেবার জন্য। পড়াশোনা, গণিত, বিজ্ঞান, প্রযুক্তি বা যেকোনো প্রশ্নের দ্রুত ও নির্ভুল উত্তরের জন্য আমাকে প্রশ্ন করুন।");
    setCreatorName("Sajjat Mia");
  };

  const currentColorObj = THEME_COLORS.find((c) => c.id === aiThemeColor) || THEME_COLORS[0];
  const CurrentIconComponent = AVATAR_ICONS.find((i) => i.id === aiAvatarIcon)?.icon || Bot;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentColorObj.gradient} p-0.5 shadow-md flex items-center justify-center shrink-0`}>
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              🎨 AI এর ডিজাইন, কালার ও নাম পরিবর্তন
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              অ্যাডমিন প্যানেল থেকে Sajjat AI এর নাম, ট্যাগলাইন, থিম কালার ও ওয়েলকাম স্ক্রিন নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="ডিফল্ট মান ফিরিয়ে আনুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>রিসেট</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              savedSuccess
                ? "bg-emerald-600 hover:bg-emerald-500"
                : `${currentColorObj.previewBg} hover:opacity-90`
            }`}
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? "সংরক্ষিত হয়েছে!" : isSaving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Control Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Identity & Name */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Bot className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Ai এর নাম ও পরিচয় কনফিগারেশন</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  AI এর নাম (AI Brand Name)
                </label>
                <input
                  type="text"
                  value={aiBrandName}
                  onChange={(e) => setAiBrandName(e.target.value)}
                  placeholder="যেমন: Sajjat AI"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  হেডার, চ্যাট বাবলে এবং স্বাগতম স্ক্রিনে এই নামটি প্রদর্শিত হবে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  নির্মাতার নাম (Creator Name)
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="যেমন: Sajjat Mia"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  AI ট্যাগলাইন / স্লোগান (Tagline)
                </label>
                <input
                  type="text"
                  value={aiTagline}
                  onChange={(e) => setAiTagline(e.target.value)}
                  placeholder="যেমন: মানুষের সেবায় নিবেদিত সর্বাধুনিক সুপার ইন্টেলিজেন্ট বাংলা এআই সহকারী"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  হোম স্ক্রিন স্বাগতম বার্তা (Welcome Title)
                </label>
                <input
                  type="text"
                  value={aiWelcomeTitle}
                  onChange={(e) => setAiWelcomeTitle(e.target.value)}
                  placeholder="স্বাগতম! আমি Sajjat AI"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  ভূমিকা ও বিবরণ (Welcome Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={aiWelcomeSubtitle}
                  onChange={(e) => setAiWelcomeSubtitle(e.target.value)}
                  placeholder="আমাকে তৈরি করেছেন Sajjat Mia মানুষের সেবার জন্য..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Theme Color Palette */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">থিম কালার স্কিম (Theme Accent Color)</h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-400">
                {currentColorObj.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_COLORS.map((color) => {
                const isSelected = aiThemeColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setAiThemeColor(color.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? "bg-slate-850 border-white/50 shadow-md ring-2 ring-offset-2 ring-offset-slate-900 " + color.activeRing
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${color.gradient} shadow-xs`} />
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-white text-slate-950 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white">{color.name.split(" ")[0]}</div>
                    <div className="text-[10px] text-slate-400">{color.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Avatar Icon */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">AI অবতার আইকন (Bot Avatar Icon)</h3>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {AVATAR_ICONS.map((item) => {
                const isSelected = aiAvatarIcon === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAiAvatarIcon(item.id as any)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-850 border-white/60 shadow-md text-white ring-2 ring-offset-2 ring-offset-slate-900 " + currentColorObj.activeRing
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? currentColorObj.previewBg : "bg-slate-900"}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Real-Time Live Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 sticky top-20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">লাইভ প্রিভিউ (Live Preview)</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold animate-pulse">
                রিয়েলটাইম
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              ব্যবহারকারীরা আপনার নির্বাচিত ডিজাইন ও কালার এভাবে সরাসরি দেখতে পাবে:
            </p>

            {/* Simulated UI Window */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
              {/* Window Header */}
              <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${currentColorObj.gradient} p-0.5 flex items-center justify-center shrink-0 shadow-xs`}>
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                      <CurrentIconComponent className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black text-white">{aiBrandName}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-1" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${currentColorObj.previewBg}`}>
                    Active Theme
                  </div>
                </div>
              </div>

              {/* Simulated Welcome Canvas */}
              <div className="p-4 text-center space-y-3 bg-gradient-to-b from-slate-950 to-slate-900/60">
                <div className="inline-block relative">
                  <div className={`w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr ${currentColorObj.gradient} p-0.5 shadow-lg shadow-black/40 flex items-center justify-center`}>
                    <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                      <CurrentIconComponent className="w-7 h-7 text-white animate-pulse" />
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">
                    Online
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    {aiWelcomeTitle}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 line-clamp-2 leading-relaxed">
                    {aiWelcomeSubtitle}
                  </p>
                </div>

                {/* Simulated Chat Bubble */}
                <div className="text-left space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-lg bg-gradient-to-tr ${currentColorObj.gradient} p-0.5 flex items-center justify-center shrink-0 mt-0.5`}>
                      <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                        <CurrentIconComponent className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 text-[11px] text-slate-200 max-w-[85%] leading-relaxed shadow-xs">
                      নমস্কার! আমি <strong className="text-white">{aiBrandName}</strong>। আপনি কী বিষয়ে জানতে বা তৈরি করতে চান?
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className={`p-2.5 rounded-2xl rounded-tr-sm text-[11px] text-white max-w-[80%] leading-relaxed shadow-sm ${currentColorObj.previewBg}`}>
                      একটি সুন্দর আসল ছবির প্রম্পট দাও
                    </div>
                  </div>
                </div>

                {/* Simulated Input Buttons */}
                <div className="pt-2 flex items-center justify-between gap-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      🎙️ কল
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      ✨ ছবি
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-white font-bold ${currentColorObj.previewBg}`}>
                    পাঠান ↵
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                savedSuccess
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : `${currentColorObj.previewBg} hover:opacity-90`
              }`}
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? "সফলভাবে সংরক্ষিত হয়েছে!" : isSaving ? "সংরক্ষণ হচ্ছে..." : "এখনই সেভ করুন"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
