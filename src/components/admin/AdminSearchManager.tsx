import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Video,
  Music,
  Image as ImageIcon,
  Globe,
  FileText,
  Download,
  RefreshCw,
  Trash2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { UniversalSearchAdminConfig, UniversalSearchStatsResponse } from "../../types";
import {
  clearUniversalSearchLogsApi,
  fetchUniversalSearchStatsApi,
  updateUniversalSearchConfigApi,
} from "../../api";
import { saveSystemSettings, subscribeToSystemSettings } from "../../firebase";

const DEFAULT_SEARCH_CONFIG: UniversalSearchAdminConfig = {
  enabled: true,
  youtubeEnabled: true,
  webSearchEnabled: true,
  videoSearchEnabled: true,
  audioSearchEnabled: true,
  imageSearchEnabled: true,
  websiteSearchEnabled: true,
  documentSearchEnabled: true,
  downloadPermissionEnabled: true,
};

export const AdminSearchManager: React.FC = () => {
  const [config, setConfig] = useState<UniversalSearchAdminConfig>(DEFAULT_SEARCH_CONFIG);
  const [stats, setStats] = useState<UniversalSearchStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const res = await fetchUniversalSearchStatsApi();
    if (res) {
      setStats(res);
      if (res.config) {
        setConfig((prev) => ({ ...prev, ...res.config }));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Also keep Firebase RTDB universalSearch config synced
  useEffect(() => {
    const unsub = subscribeToSystemSettings((sys) => {
      if (sys?.universalSearch) {
        setConfig((prev) => ({ ...prev, ...sys.universalSearch }));
      }
    });
    return () => unsub();
  }, []);

  const handleToggle = async (key: keyof UniversalSearchAdminConfig) => {
    const nextConfig: UniversalSearchAdminConfig = {
      ...config,
      [key]: !config[key],
    };
    setConfig(nextConfig);
    setStatusMessage(null);

    try {
      await updateUniversalSearchConfigApi(nextConfig);
      await saveSystemSettings({
        universalSearch: nextConfig,
        webSearchEnabled: nextConfig.webSearchEnabled,
      });
      setStatusMessage("সার্চ ও মিডিয়া সেটিংস সফলভাবে আপডেট হয়েছে।");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setConfig(config);
      setStatusMessage(`সেভ করতে ত্রুটি হয়েছে: ${err?.message || "Error"}`);
    }
  };

  const handleClearLogs = async () => {
    const ok = await clearUniversalSearchLogsApi();
    setConfirmClear(false);
    if (ok) {
      setStatusMessage("সার্চ হিস্টোরি এবং এরর লগ পরিষ্কার করা হয়েছে।");
      loadStats();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const toggleItems: Array<{
    key: keyof UniversalSearchAdminConfig;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }> = [
    {
      key: "enabled",
      title: "মাস্টার ইউনিভার্সাল সার্চ সিস্টেম",
      desc: "সম্পূর্ণ ইন্টারনেট সার্চ, মিডিয়া, ডকুমেন্ট ও ওয়েবসাইট ইন্টেলিজেন্স সক্রিয় বা বন্ধ করুন।",
      icon: Search,
      accent: "text-indigo-400",
    },
    {
      key: "webSearchEnabled",
      title: "Google ও ওয়েব / সংবাদ সার্চ (Search API)",
      desc: "Google Search Grounding, সংবাদ ও বহু-উৎস তথ্য বিশ্লেষণ সক্রিয় রাখুন।",
      icon: Globe,
      accent: "text-cyan-400",
    },
    {
      key: "youtubeEnabled",
      title: "YouTube ভিডিও ইন্টিগ্রেশন",
      desc: "YouTube ভিডিও খোঁজা, যাচাই এবং অ্যাপের ভিতরে এম্বেড প্লেয়ার চালু রাখুন।",
      icon: Youtube,
      accent: "text-rose-400",
    },
    {
      key: "videoSearchEnabled",
      title: "ভিডিও সার্চ ও প্লেয়ার",
      desc: "YouTube, Dailymotion ও Internet Archive থেকে ভিডিও খোঁজা ও চালানো।",
      icon: Video,
      accent: "text-rose-300",
    },
    {
      key: "audioSearchEnabled",
      title: "অডিও, গান ও পডকাস্ট সার্চ",
      desc: "বাংলা ও আন্তর্জাতিক গান, পডকাস্ট, অডিওবুক ও ইন-অ্যাপ মিউজিক প্লেয়ার।",
      icon: Music,
      accent: "text-purple-400",
    },
    {
      key: "imageSearchEnabled",
      title: "অনলাইন ছবি ও গ্রাফিক্স সার্চ",
      desc: "Wikimedia Commons, Pexels ও Pixabay থেকে আসল ছবি ও লাইসেন্স তথ্য খোঁজা।",
      icon: ImageIcon,
      accent: "text-emerald-400",
    },
    {
      key: "documentSearchEnabled",
      title: "ডকুমেন্ট, PDF ও গবেষণা পত্র সার্চ",
      desc: "arXiv, OpenAlex ও Internet Archive থেকে PDF বই এবং রিসার্চ পেপার খোঁজা।",
      icon: FileText,
      accent: "text-amber-400",
    },
    {
      key: "websiteSearchEnabled",
      title: "পাবলিক ওয়েবসাইট বিশ্লেষণ",
      desc: "ব্যবহারকারীর দেওয়া লিংকের বিষয়বস্তু পড়া ও সারসংক্ষেপ তৈরি করা (লগইন/পেওয়াল বাদে)।",
      icon: Globe,
      accent: "text-sky-400",
    },
    {
      key: "downloadPermissionEnabled",
      title: "বৈধ ওপেন-লাইসেন্স ডাউনলোড অনুমতি",
      desc: "শুধুমাত্র অনুমোদিত CC/Public Domain অডিও, ভিডিও, ছবি ও PDF ডাউনলোড বাটন দেখান।",
      icon: Download,
      accent: "text-emerald-300",
    },
  ];

  const envList = [
    { label: "GEMINI_API_KEY (Search Grounding)", ready: Boolean(stats?.envStatus.geminiConfigured) },
    { label: "YOUTUBE_API_KEY (Optional Official API)", ready: Boolean(stats?.envStatus.youtubeApiConfigured) },
    { label: "GOOGLE_SEARCH_API_KEY + CX (Optional CSE)", ready: Boolean(stats?.envStatus.googleSearchApiConfigured) },
    { label: "PEXELS_API_KEY (Optional Stock Images)", ready: Boolean(stats?.envStatus.pexelsConfigured) },
    { label: "PIXABAY_API_KEY (Optional Stock Images)", ready: Boolean(stats?.envStatus.pixabayConfigured) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <span>Universal Search ও মিডিয়া ম্যানেজমেন্ট</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            সার্চ ইঞ্জিন, অডিও/ভিডিও/ছবি/PDF কন্ট্রোল, API ব্যবহার ও ডাউনলোড অনুমতি পরিচালনা করুন
          </p>
        </div>

        <button
          type="button"
          onClick={loadStats}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>তথ্য রিফ্রেশ করুন</span>
        </button>
      </div>

      {statusMessage && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[11px] text-slate-400">মোট সার্চ অনুসন্ধান</p>
          <p className="text-2xl font-black text-white tabular-nums">
            {stats?.usage.totalSearches ?? 0}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[11px] text-slate-400">ভিডিও ও অডিও সার্চ</p>
          <p className="text-2xl font-black text-indigo-300 tabular-nums">
            {(stats?.usage.byIntent?.video ?? 0) + (stats?.usage.byIntent?.audio ?? 0)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[11px] text-slate-400">ওয়েব, সংবাদ ও ডকুমেন্ট</p>
          <p className="text-2xl font-black text-cyan-300 tabular-nums">
            {(stats?.usage.byIntent?.web ?? 0) +
              (stats?.usage.byIntent?.news ?? 0) +
              (stats?.usage.byIntent?.document ?? 0) +
              (stats?.usage.byIntent?.website ?? 0)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[11px] text-slate-400">শনাক্তকৃত ত্রুটি (Errors)</p>
          <p className="text-2xl font-black text-rose-400 tabular-nums">
            {stats?.usage.errorCount ?? 0}
          </p>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>সার্চ ও মিডিয়া ফিচার কন্ট্রোল (Real-Time Switches)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {toggleItems.map((item) => {
            const IconComp = item.icon;
            const active = Boolean(config[item.key]);
            return (
              <div
                key={item.key}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                    <IconComp className={`w-4 h-4 ${item.accent}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(item.key)}
                  aria-label={item.title}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer ${
                    active ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Environment Readiness & Quota/Call Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2.5 border-b border-slate-800">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>ব্যাকএন্ড এনভায়রনমেন্ট ও API স্ট্যাটাস</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            সকল গোপন API Key নিরাপদভাবে সার্ভার এনভায়রনমেন্ট ভেরিয়েবলে রাখা হয়েছে।
          </p>
          <div className="space-y-2">
            {envList.map((env) => (
              <div
                key={env.label}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <span className="font-mono text-[11px] text-slate-300">{env.label}</span>
                <span
                  className={`text-[11px] font-bold ${
                    env.ready ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {env.ready ? "সক্রিয় (Configured)" : "পাবলিক ফলব্যাক সক্রিয়"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2.5 border-b border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>API ব্যবহার ও কোটা পরিসংখ্যান (API Usage)</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {Object.entries(stats?.usage.apiCalls || {}).map(([provider, count]) => (
              <div
                key={provider}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <span className="font-mono text-[11px] text-slate-300 truncate">{provider}</span>
                <span className="font-bold text-cyan-300 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search History & Error Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search History */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>ইউজার সার্চ হিস্টোরি ({stats?.history.length ?? 0})</span>
            </h3>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> লগ মুছুন
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  নিশ্চিত মুছুন
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {!stats?.history.length ? (
              <p className="text-xs text-slate-500 py-8 text-center">এখনো কোনো সার্চ রেকর্ড নেই।</p>
            ) : (
              stats.history.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white truncate">{h.query}</span>
                    <span className="text-[10px] font-mono text-indigo-300 shrink-0 uppercase">
                      {h.intent}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {[
                      h.userName || "Guest",
                      `${h.resultCount}টি ফলাফল`,
                      `${h.latencyMs}ms`,
                      new Date(h.timestamp).toLocaleTimeString("bn-BD", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    ].join(" · ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error Monitoring */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2.5 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Error Monitoring ও ব্যর্থ সংযোগ ({stats?.errors.length ?? 0})</span>
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {!stats?.errors.length ? (
              <p className="text-xs text-emerald-400/90 py-8 text-center">
                কোনো সার্চ এরর পাওয়া যায়নি। সকল উৎস সচল আছে।
              </p>
            ) : (
              stats.errors.map((err) => (
                <div
                  key={err.id}
                  className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-rose-300">{err.provider}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(err.timestamp).toLocaleTimeString("bn-BD")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{err.message}</p>
                  <p className="text-[10px] text-slate-500 truncate">Query: {err.query}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
