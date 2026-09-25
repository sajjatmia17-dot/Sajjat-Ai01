import React, { useState, useEffect } from "react";
import { 
  Mic, 
  PhoneCall, 
  Image as ImageIcon, 
  Sparkles, 
  FileUp, 
  Sliders, 
  Check, 
  Save, 
  AlertCircle, 
  Zap, 
  Volume2, 
  Radio, 
  RefreshCw, 
  Play, 
  Square, 
  Layers
} from "lucide-react";
import { SystemSettingsConfig } from "../../types";
import { getBackendBaseUrl } from "../../api";
import { subscribeToSystemSettings, saveSystemSettings } from "../../firebase";

const VOICE_PERSONAS = [
  { id: "Zephyr", name: "Zephyr (ডিফল্ট)", desc: "শান্ত, প্রফেশনাল ও স্বাভাবিক কণ্ঠ" },
  { id: "Kore", name: "Kore", desc: "মধুর, শান্ত ও বিনয়ী কণ্ঠ" },
  { id: "Puck", name: "Puck", desc: "প্রাণবন্ত, দ্রুত ও হাস্যোজ্জ্বল কণ্ঠ" },
  { id: "Charon", name: "Charon", desc: "গম্ভীর, আত্মবিশ্বাসী ও ভারী কণ্ঠ" },
  { id: "Fenrir", name: "Fenrir", desc: "দৃঢ়, স্পষ্ট ও বলিষ্ঠ ব্যক্তিত্ব" },
  { id: "Aoede", name: "Aoede", desc: "সুরেলা, চমৎকার ও মিষ্টি নারী কণ্ঠ" },
];

const IMAGE_ENGINES = [
  {
    id: "gemini-3.1-flash-image",
    name: "✨ Sajjat AI 3.1 Flash Image (Pro Studio)",
    desc: "সাজ্জাদ এআই-এর অফিশিয়াল ইমেজ জেনারেশন ইঞ্জিন। নিখুঁত বাংলা প্রম্পট অনুধাবন, বাস্তব আলো ও সর্বোচ্চ ডিটেইলড ছবি।",
    badge: "Sajjat AI অফিশিয়াল",
    speed: "HD / 1K"
  },
  {
    id: "gemini-3.1-flash-lite-image",
    name: "⚡ Sajjat AI 3.1 Flash Lite Image",
    desc: "উচ্চ গতির লাইটওয়েট সাজ্জাদ এআই ইমেজ জেনারেশন ইঞ্জিন। দ্রুত ছবি প্রসেসিং ও অপটিমাইজড পারফরম্যান্স।",
    badge: "Sajjat AI লাইট",
    speed: "Fast"
  }
];

export const AdminVoiceAndFiles: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsConfig>({
    aiEnabled: true,
    voiceEnabled: true,
    liveVoiceEnabled: true,
    liveVoiceNotice: "লাইভ ভয়েস চ্যাট সাময়িকভাবে রক্ষণাবেক্ষণের জন্য বন্ধ রয়েছে।",
    liveVoiceName: "Zephyr",
    liveVoiceSpeed: "1.0",
    liveVoiceInstruction: "You are Sajjat AI, speaking fluently in natural Bengali or English. Keep answers conversational and concise.",
    imageGenerationEnabled: true,
    imageModelPreset: "gemini-3.1-flash-image",
    imageGenerationNotice: "ছবি তৈরি ফিচারটি বর্তমানে সাময়িক রক্ষণাবেক্ষণের কারণে স্থগিত রয়েছে।",
    imageDefaultAspectRatio: "1:1",
    imageWatermarkEnabled: true,
    imageWatermarkText: "Sajjat AI",
    imageUploadEnabled: true,
    fileUploadEnabled: true,
    chatHistoryEnabled: true,
    notificationsEnabled: true,
    activeProvider: "gemini",
    activeModel: "gemini-3.8-flash",
    temperature: 0.7
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allowedExtensions, setAllowedExtensions] = useState(".pdf, .txt, .js, .py, .html, .css, .json, .docx");
  
  // Test Image Generator in Admin
  const [testPrompt, setTestPrompt] = useState("একটি সুন্দর বাংলাদেশি নদী ও সূর্যাস্তের আসল ছবি");
  const [testImageResult, setTestImageResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testDuration, setTestDuration] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSystemSettings((data) => {
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    });
    return () => unsub();
  }, []);

  const handleToggle = (key: keyof SystemSettingsConfig) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSystemSettings(settings);

      // Also sync to server in-memory settings
      try {
        await fetch(`${getBackendBaseUrl()}/api/system-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings)
        });
      } catch (err) {
        console.warn("Server system-settings sync:", err);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Save system settings error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunImageTest = async () => {
    if (!testPrompt.trim() || testLoading) return;
    setTestLoading(true);
    setTestError(null);
    setTestImageResult(null);
    const startTime = Date.now();

    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: testPrompt,
          aspectRatio: settings.imageDefaultAspectRatio || "1:1",
          engine: settings.imageModelPreset || "flux",
          style: "photorealistic"
        })
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setTestDuration(elapsed);

      if (data.success && (data.imageUrl || data.directUrl)) {
        setTestImageResult(data.imageUrl || data.directUrl);
      } else {
        throw new Error(data.error || "ছবি তৈরি ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      setTestError(err?.message || "ছবি তৈরি করা যায়নি।");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Save Sticky Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sliders className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              🎙️ লাইভ ভয়েস চ্যাট ও ছবি তৈরি নিয়ন্ত্রণ
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ইউজার প্যানেলে মেসেজ সেন্ড করার পাশের লাইভ কল বাটন ও ছবি তৈরির অপশন অ্যাডমিন থেকে সক্রিয়/নিষ্ক্রিয় ও নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 self-end sm:self-center cursor-pointer ${
            savedSuccess
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-indigo-600 hover:bg-indigo-500 active:scale-95"
          }`}
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? "সংরক্ষিত হয়েছে!" : isSaving ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ করুন"}</span>
        </button>
      </div>

      {/* SECTION 1: LIVE VOICE CHAT CONTROL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                লাইভ ভয়েস চ্যাট নিয়ন্ত্রণ (Live Voice Chat Call Feature)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-normal">
                  কল বাটন
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                মেসেজ ইনপুটের পাশে কল বাটনের মতো অপশন যার মাধ্যমে ব্যবহারকারী Ai-এর সাথে সরাসরি কথা বলে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${settings.liveVoiceEnabled !== false ? "text-emerald-400" : "text-rose-400"}`}>
              {settings.liveVoiceEnabled !== false ? "চালু (ACTIVE)" : "বন্ধ (DISABLED)"}
            </span>
            <button
              type="button"
              onClick={() => handleToggle("liveVoiceEnabled")}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                settings.liveVoiceEnabled !== false ? "bg-emerald-500" : "bg-slate-800 border border-slate-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                  settings.liveVoiceEnabled !== false ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Voice Persona Selection */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              Ai-এর লাইভ ভয়েস বদলান (Voice Persona)
            </label>
            <select
              value={settings.liveVoiceName || "Zephyr"}
              onChange={(e) => setSettings((prev) => ({ ...prev, liveVoiceName: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {VOICE_PERSONAS.map((vp) => (
                <option key={vp.id} value={vp.id}>
                  {vp.name} — {vp.desc}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              নির্বাচিত ভয়েসে Ai ব্যবহারকারীর সাথে বাংলা ও ইংরেজিতে কথা বলবে।
            </p>
          </div>

          {/* Voice Speech Speed */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              কথা বলার গতি (Speaking Tempo)
            </label>
            <select
              value={settings.liveVoiceSpeed || "1.0"}
              onChange={(e) => setSettings((prev) => ({ ...prev, liveVoiceSpeed: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="0.8">ধীর ও গম্ভীর (0.8x Slow)</option>
              <option value="0.9">মৃদু ধীর (0.9x Relaxed)</option>
              <option value="1.0">স্বাভাবিক ও পরিষ্কার (1.0x Normal)</option>
              <option value="1.1">উচ্ছ্বসিত ও সপ্রতিভ (1.1x Energetic)</option>
              <option value="1.2">দ্রুত (1.2x Fast)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              ব্যবহারকারীর সাথে কথা বলার সময় কণ্ঠের টেম্পো ও ন্যাচারাল স্পিড।
            </p>
          </div>

          {/* Maintenance Notice Message */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              লাইভ ভয়েস বন্ধ থাকাকালীন ইউজার নোটিশ বার্তা (Disabled Notice)
            </label>
            <input
              type="text"
              value={settings.liveVoiceNotice || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, liveVoiceNotice: e.target.value }))}
              placeholder="লাইভ ভয়েস চ্যাট সাময়িকভাবে রক্ষণাবেক্ষণের জন্য বন্ধ রয়েছে।"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">
              অ্যাডমিন থেকে ফিচার বন্ধ থাকলে ইউজার কলে চাপ দিলে এই বার্তাটি দেখতে পাবে।
            </p>
          </div>

          {/* Custom Voice Instruction */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-200">
              কাস্টম লাইভ ভয়েস নির্দেশনা (Live Voice System Instructions)
            </label>
            <textarea
              rows={2}
              value={settings.liveVoiceInstruction || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, liveVoiceInstruction: e.target.value }))}
              placeholder="যেমন: কথা বলার সময় মিষ্টি ও আন্তরিক আচরণ বজায় রাখবে এবং বাংলা ব্যাকরণ নির্ভুল রাখবে..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: AI IMAGE GENERATOR STUDIO CONTROL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                ছবি তৈরির অপশন নিয়ন্ত্রণ (AI Image Generation Control)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-normal">
                  সেন্ড বাটনের পাশে ✨ বাটন
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ইউজাররা প্রম্পট দিলে নিখুঁত আসল ছবি যাতে দ্রুত তৈরি হয় তা অ্যাডমিন থেকে নিয়ন্ত্রণ করুন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${settings.imageGenerationEnabled !== false ? "text-emerald-400" : "text-rose-400"}`}>
              {settings.imageGenerationEnabled !== false ? "চালু (ACTIVE)" : "বন্ধ (DISABLED)"}
            </span>
            <button
              type="button"
              onClick={() => handleToggle("imageGenerationEnabled")}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                settings.imageGenerationEnabled !== false ? "bg-emerald-500" : "bg-slate-800 border border-slate-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                  settings.imageGenerationEnabled !== false ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Engine Model Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200">
            ছবি তৈরির ইঞ্জিন ও স্পিড মডেল (AI Image Synthesis Engine)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {IMAGE_ENGINES.map((eng) => {
              const isSelected = (settings.imageModelPreset || "flux") === eng.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, imageModelPreset: eng.id as any }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{eng.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono">
                      {eng.speed}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {eng.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* Default Aspect Ratio */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-200">
              ডিফল্ট সাইজ ও রেশিও (Aspect Ratio)
            </label>
            <select
              value={settings.imageDefaultAspectRatio || "1:1"}
              onChange={(e) => setSettings((prev) => ({ ...prev, imageDefaultAspectRatio: e.target.value as any }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
            >
              <option value="1:1">১:১ (স্কয়ার / ৭৬৮x৭৬৮ - আল্ট্রা ফাস্ট)</option>
              <option value="16:9">১৬:৯ (ওয়াইড ল্যান্ডস্কেপ / ৮৯৬x৫১২)</option>
              <option value="9:16">৯:১৬ (মোবাইল পোর্ট্রেট / ৫১২x৮৯৬)</option>
            </select>
          </div>

          {/* Watermark Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-200">
                ওয়াটারমার্ক ব্র্যান্ডিং (Watermark)
              </label>
              <button
                type="button"
                onClick={() => handleToggle("imageWatermarkEnabled")}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.imageWatermarkEnabled !== false ? "bg-purple-600" : "bg-slate-800"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.imageWatermarkEnabled !== false ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <input
              type="text"
              value={settings.imageWatermarkText || "Sajjat AI"}
              onChange={(e) => setSettings((prev) => ({ ...prev, imageWatermarkText: e.target.value }))}
              placeholder="যেমন: Sajjat AI"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Image Maintenance Notice */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-200">
              ছবি তৈরি বন্ধের নোটিশ বার্তা
            </label>
            <input
              type="text"
              value={settings.imageGenerationNotice || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, imageGenerationNotice: e.target.value }))}
              placeholder="ছবি তৈরি সাময়িকভাবে বন্ধ আছে।"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Live Admin Fast Speed & Realism Test Box */}
        <div className="p-4.5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white">ছবি তৈরির স্পিড ও কোয়ালিটি লাইভ টেস্ট (Admin Fast Tester)</h4>
            </div>
            {testDuration && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                ⚡ সময় লেগেছে: {testDuration} ms (~{(testDuration / 1000).toFixed(2)} সেকেন্ড)
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="যেকোনো দৃশ্যের আসল ছবি তৈরির প্রম্পট লিখুন..."
              className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleRunImageTest}
              disabled={testLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {testLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{testLoading ? "জেনারেট হচ্ছে..." : "টেস্ট জেনারেট করুন"}</span>
            </button>
          </div>

          {testError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{testError}</span>
            </div>
          )}

          {testImageResult && (
            <div className="mt-2 flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <img
                src={testImageResult}
                alt="Admin Test Result"
                className="w-40 h-40 object-cover rounded-lg border border-slate-700 shadow-md"
              />
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>আসল ছবি সফলভাবে প্রস্তুত হয়েছে!</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  ইঞ্জিন: <span className="font-mono text-purple-300 font-bold">{settings.imageModelPreset || "flux"}</span>
                </p>
                <p className="text-slate-400 text-[10px]">
                  ইউজাররা প্রম্পট দিলে সাথে সাথে এই আসল বাস্তব ছবি দেখতে পাবে।
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: FILE & IMAGE ATTACHMENT CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              ফাইল ও ইমেজ আপলোড পারমিশন (File & Attachment Controls)
            </h3>
            <p className="text-xs text-slate-400">
              ব্যবহারকারীদের ফাইল ও ছবি বিশ্লেষণ পারমিশন নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">Image Analysis (ছবি বিশ্লেষণ)</p>
              <p className="text-[11px] text-slate-400">ছবি আপলোড করে সরাসরি AI থেকে বিবরণ ও সমাধান নেওয়া</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle("imageUploadEnabled")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.imageUploadEnabled ? "bg-indigo-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.imageUploadEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">File & Code Attachment (কোড ও ফাইল আপলোড)</p>
              <p className="text-[11px] text-slate-400">পিডিএফ, কোড ও টেক্সট ফাইল আপলোড সুবিধা</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle("fileUploadEnabled")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.fileUploadEnabled ? "bg-indigo-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.fileUploadEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-200">
              অনুমোদিত ফাইল ফরম্যাটসমূহ (Allowed File Extensions)
            </label>
            <input
              type="text"
              value={allowedExtensions}
              onChange={(e) => setAllowedExtensions(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
