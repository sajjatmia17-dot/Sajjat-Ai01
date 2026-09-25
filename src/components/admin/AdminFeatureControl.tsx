import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  Sparkles, 
  ImageIcon, 
  PhoneCall, 
  FileUp, 
  Radio, 
  Volume2, 
  BookOpen, 
  Bell, 
  Save, 
  Check, 
  Layers,
  ShieldAlert
} from "lucide-react";
import { SystemSettingsConfig } from "../../types";
import { getBackendBaseUrl } from "../../api";
import { subscribeToSystemSettings, saveSystemSettings } from "../../firebase";

export const AdminFeatureControl: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsConfig>({
    aiEnabled: true,
    voiceEnabled: true,
    liveVoiceEnabled: true,
    imageGenerationEnabled: true,
    imageEditingEnabled: true,
    fileUploadEnabled: true,
    imageUploadEnabled: true,
    webSearchEnabled: true,
    readAloudEnabled: true,
    bookLibraryEnabled: true,
    userNotificationsEnabled: true,
    chatHistoryEnabled: true,
    notificationsEnabled: true,
    activeProvider: "gemini",
    activeModel: "gemini-3.8-flash",
    temperature: 0.7
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSystemSettings((data) => {
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    });
    return () => unsub();
  }, []);

  const handleToggle = async (key: keyof SystemSettingsConfig) => {
    const currentVal = settings[key];
    const newVal = currentVal === undefined ? true : !currentVal;

    // Optimistic UI update
    setSettings((prev) => ({
      ...prev,
      [key]: newVal
    }));

    try {
      // Instantly persist to Firebase RTDB
      await saveSystemSettings({ [key]: newVal });

      // Sync to server in-memory settings
      try {
        await fetch(`${getBackendBaseUrl()}/api/system-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: newVal })
        });
      } catch (e) {
        console.warn("Server system-settings sync failed:", e);
      }
    } catch (err: any) {
      console.error("Failed to save feature toggle:", err);
      // Revert if error occurs
      setSettings((prev) => ({
        ...prev,
        [key]: currentVal
      }));
      alert("ফিচার পরিবর্তন সেভ করতে ব্যর্থ হয়েছে: " + (err?.message || "Error"));
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await saveSystemSettings(settings);
      
      // Also update server memory
      try {
        await fetch(`${getBackendBaseUrl()}/api/system-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings)
        });
      } catch (e) {
        console.warn("Server sync error:", e);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("ফিচার কন্ট্রোল সংরক্ষণে ত্রুটি: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const featureList = [
    {
      key: "imageGenerationEnabled" as keyof SystemSettingsConfig,
      label: "🖼️ ছবি তৈরি (Image Generation)",
      desc: "ইউজাররা চ্যাটে বা ইমেজ স্টুডিওতে নতুন ছবি তৈরি করতে পারবে।",
      icon: Sparkles,
      color: "purple",
      activeBg: "bg-purple-600"
    },
    {
      key: "imageEditingEnabled" as keyof SystemSettingsConfig,
      label: "✏️ ছবি এডিটিং (Image Editing)",
      desc: "আপলোডকৃত ছবি নির্বাচন করে কাস্টম নির্দেশনা দিয়ে এডিট করা যাবে।",
      icon: ImageIcon,
      color: "cyan",
      activeBg: "bg-cyan-600"
    },
    {
      key: "liveVoiceEnabled" as keyof SystemSettingsConfig,
      label: "🎙️ লাইভ ভয়েস (Live Voice Call)",
      desc: "সরাসরি রিয়েল-টাইমে ভয়েস কল এবং কথা বলার সুবিধা।",
      icon: PhoneCall,
      color: "emerald",
      activeBg: "bg-emerald-600"
    },
    {
      key: "fileUploadEnabled" as keyof SystemSettingsConfig,
      label: "📎 ফাইল আপলোড (File Attachments)",
      desc: "পিডিএফ, কোড, টেক্সট এবং অন্যান্য ফাইল চ্যাটে আপলোড সুবিধা।",
      icon: FileUp,
      color: "indigo",
      activeBg: "bg-indigo-600"
    },
    {
      key: "webSearchEnabled" as keyof SystemSettingsConfig,
      label: "🌐 ওয়েব সার্চ (Web Grounding)",
      desc: "গুগল সার্চ ও লাইভ ইন্টারনেটের সাম্প্রতিক তথ্যের অনুসন্ধান।",
      icon: Radio,
      color: "amber",
      activeBg: "bg-amber-600"
    },
    {
      key: "readAloudEnabled" as keyof SystemSettingsConfig,
      label: "🔊 রিড আউড (Read Aloud TTS)",
      desc: "এআই-এর যেকোনো উত্তরের পাশে সাউন্ড আইকনে স্পিচ রিডিং।",
      icon: Volume2,
      color: "blue",
      activeBg: "bg-blue-600"
    },
    {
      key: "bookLibraryEnabled" as keyof SystemSettingsConfig,
      label: "📚 বই ও পিডিএফ লাইব্রেরি (Book / PDF Library)",
      desc: "ইউজার প্যানেলে ফ্রি বুক ও পিডিএফ পড়ার বুকশেলফ প্রদর্শন।",
      icon: BookOpen,
      color: "teal",
      activeBg: "bg-teal-600"
    },
    {
      key: "userNotificationsEnabled" as keyof SystemSettingsConfig,
      label: "🔔 ইউজার নোটিফিকেশন (User Notifications)",
      desc: "হেডারে বেল আইকন ও অ্যাডমিনের পাঠানো নোটিফিকেশন অ্যালার্ট।",
      icon: Bell,
      color: "rose",
      activeBg: "bg-rose-600"
    },
    {
      key: "aiLimitSystemEnabled" as keyof SystemSettingsConfig,
      label: "💎 এআই মেসেজ লিমিট ও প্রিমিয়াম সিস্টেম (AI Message Limits & Premium)",
      desc: "চালু থাকলে ফ্রি ইউজারদের দৈনিক কোটা প্রযোজ্য হবে এবং হেডারে 'প্রিমিয়াম' বাটন ও প্যাকেজ ক্রয় অপশন দেখাবে। বন্ধ থাকলে কোনো লিমিট থাকবে না ও প্রিমিয়াম বাটন হাইড থাকবে।",
      icon: ShieldAlert,
      color: "amber",
      activeBg: "bg-amber-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              🔘 ফিচার কন্ট্রোল (Feature Control)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal border border-indigo-500/30">
                Master Switchboard
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ইউজার প্যানেলের সকল প্রধান প্রধান ফিচার অন বা অফ করুন। সুইচে ক্লিক করার সাথে সাথে রিয়েল-টাইমে আপডেট হবে।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>সেভ হচ্ছে...</span>
            </>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>সেভ হয়েছে!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>পরিবর্তনগুলো সেভ করুন</span>
            </>
          )}
        </button>
      </div>

      {/* Feature Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featureList.map((feat) => {
          const IconComp = feat.icon;
          const isEnabled = settings[feat.key] !== false;

          return (
            <div 
              key={feat.key}
              className={`p-5 rounded-3xl border transition-all duration-200 flex items-start justify-between gap-4 ${
                isEnabled 
                  ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm" 
                  : "bg-slate-950/60 border-slate-900 opacity-75"
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 text-${feat.color}-400`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{feat.label}</h3>
                </div>
                <p className="text-xs text-slate-400 pl-1">{feat.desc}</p>
                <div className="pt-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isEnabled 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? "bg-emerald-400" : "bg-rose-400"}`} />
                    {isEnabled ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Disabled)"}
                  </span>
                </div>
              </div>

              {/* Switch */}
              <button
                type="button"
                onClick={() => handleToggle(feat.key)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer shrink-0 mt-1 ${
                  isEnabled ? feat.activeBg : "bg-slate-800 border border-slate-700"
                }`}
              >
                <span 
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  }`} 
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
