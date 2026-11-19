import React, { useState, useEffect } from "react";
import { Bell, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { requestWebPushPermission } from "../utils/fcmWebPush";

interface WebPushPopupProps {
  userUid?: string;
}

export const WebPushPopup: React.FC<WebPushPopupProps> = ({ userUid }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "requesting" | "enabled" | "denied">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = localStorage.getItem("sajjat_push_popup_dismissed");
      const perm = Notification.permission;
      if (perm === "granted") {
        setStatus("enabled");
        return;
      }
      if (perm === "denied") {
        setStatus("denied");
        return;
      }
      if (!dismissed) {
        // Show popup after 3 seconds for new users
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleAllow = async () => {
    setStatus("requesting");
    try {
      const token = await requestWebPushPermission(userUid || "guest");
      if (token) {
        setStatus("enabled");
        setIsOpen(false);
      } else {
        setStatus("denied");
      }
    } catch {
      setStatus("denied");
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem("sajjat_push_popup_dismissed", "true");
    } catch {}
  };

  if (!isOpen || status === "enabled" || status === "denied") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 text-slate-100 flex items-start gap-3.5">
      <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
        <Bell className="w-5 h-5 animate-bounce" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            Enable Notifications
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300">
              Sajjat Ai
            </span>
          </h4>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          জরুরি আপডেট, এআই মেসেজ এবং অ্যাডমিন অ্যানাউন্সমেন্ট সরাসরি আপনার ডিভাইসের নোটিফিকেশন বারে পেতে Allow করুন।
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleAllow}
            disabled={status === "requesting"}
            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
            <span>{status === "requesting" ? "অনুমতি চাওয়া হচ্ছে..." : "Allow Notifications"}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
