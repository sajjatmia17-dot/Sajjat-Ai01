import React, { useState } from "react";
import { 
  FileCode, 
  X, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Laptop, 
  Smartphone, 
  ShieldCheck, 
  Zap,
  Code
} from "lucide-react";
import { downloadSajjatAIHTMLFile } from "../utils/htmlGenerator";

interface HtmlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HtmlViewerModal: React.FC<HtmlViewerModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "code">("overview");
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadSajjatAIHTMLFile();
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const handleLoadAndCopyCode = async () => {
    try {
      let text = htmlCode;
      if (!text) {
        setIsLoadingCode(true);
        const res = await fetch("/Sajjat_AI.html");
        text = await res.text();
        setHtmlCode(text);
        setIsLoadingCode(false);
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy", err);
      setIsLoadingCode(false);
    }
  };

  const handleOpenCodeTab = async () => {
    setActiveTab("code");
    if (!htmlCode) {
      setIsLoadingCode(true);
      try {
        const res = await fetch("/Sajjat_AI.html");
        const text = await res.text();
        setHtmlCode(text);
      } catch (err) {
        console.error("Failed to fetch code preview", err);
      } finally {
        setIsLoadingCode(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Sajjat AI HTML ফাইল</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Standalone v3.9
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                একক (Single-file) অফলাইন ও অনলাইন রেডি HTML ভার্সন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            বিবরণ ও ডাউনলোড
          </button>
          <button
            onClick={handleOpenCodeTab}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            HTML কোড ভিউয়ার
          </button>
        </div>

        {activeTab === "overview" ? (
          <div className="py-3 space-y-4">
            {/* Download & Launch Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? "ডাউনলোড হচ্ছে..." : "📥 HTML ডাউনলোড করুন"}</span>
              </button>

              <a
                href="/Sajjat_AI.html"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-slate-600"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>🌐 ব্রাউজারে সরাসরি খুলুন</span>
              </a>
            </div>

            {/* Quick Copy Action */}
            <button
              onClick={handleLoadAndCopyCode}
              disabled={isLoadingCode}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer hover:bg-slate-850"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">সম্পূর্ণ HTML কোড কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-400" />
                  <span>{isLoadingCode ? "কোড লোড হচ্ছে..." : "📋 সম্পূর্ণ HTML কোড ক্লিপবোর্ডে কপি করুন"}</span>
                </>
              )}
            </button>

            {/* Features Highlight */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                HTML ফাইলের প্রধান বৈশিষ্ট্যসমূহ:
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>সম্পূর্ণ স্বয়ংসম্পূর্ণ (Standalone):</strong> কোনো Node.js বা সার্ভার প্রয়োজন নেই; যেকোনো ব্রাউজারে ডাবল ক্লিক করলেই চলবে।</span>
                </li>
                <li className="flex items-start gap-2">
                  <Laptop className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>মডার্ন UI ও স্টাইলিং:</strong> Tailwind CSS, Lucide Icons এবং Markdown পার্সার ইনবিল্ট যুক্ত রয়েছে।</span>
                </li>
                <li className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>মোবাইল ও পিসি ফ্রেন্ডলি:</strong> সম্পূর্ণ রেসপনসিভ ডিজাইন, ডার্ক মোড ও লাইট মোড সাপোর্ট।</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Sajjat AI নলেজ বেইজ:</strong> নির্মাতা Sajjat Mia এর স্বত্বাধিকারী ভেরিফাইড উত্তর এবং ইন্টেলিজেন্ট চ্যাট ইঞ্জিন।</span>
                </li>
              </ul>
            </div>

            {/* How to use */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
              <strong className="text-white block mb-1">💡 কীভাবে ব্যবহার করবেন?</strong>
              ১. উপরের <strong>"HTML ডাউনলোড করুন"</strong> বাটনে ক্লিক করে <code className="bg-indigo-950/80 px-1 py-0.5 rounded text-cyan-300">Sajjat_AI.html</code> সেভ করুন।<br />
              ২. ফাইলটিতে ডাবল ক্লিক করলেই গুগল ক্রোম, এজ বা ফায়ারফক্সে এটি অফলাইনে বা অনলাইনে চলতে শুরু করবে!
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                ফাইল: Sajjat_AI.html ({htmlCode ? `${Math.round(htmlCode.length / 1024)} KB` : "লোড হচ্ছে..."})
              </span>
              <button
                onClick={handleLoadAndCopyCode}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "কপি হয়েছে" : "কোড কপি"}</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 max-h-72 overflow-y-auto font-mono text-[11px] text-emerald-400 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
              {isLoadingCode ? (
                <div className="py-8 text-center text-slate-400">কোড লোড হচ্ছে...</div>
              ) : (
                <pre><code>{htmlCode || "কোড দেখা যাচ্ছে না, অনুগ্রহ করে 'বিবরণ ও ডাউনলোড' ট্যাব থেকে সরাসরি ডাউনলোড করুন।"}</code></pre>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            নির্মাতা: <strong className="text-slate-400">Sajjat Mia</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
