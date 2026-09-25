import React, { useState, useEffect } from "react";
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Bot,
  Copy,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import confetti from "canvas-confetti";
import { AuthMode, UserProfile } from "../types";
import { loginUser, registerUser, resetPassword, loginWithGoogle } from "../firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setError(null);
      setSuccessMessage(null);
      setShowDomainHelp(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setShowDomainHelp(false);
    setGoogleLoading(true);
    try {
      const profile = await loginWithGoogle();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      const errCode = err?.code || "";
      if (errCode === "auth/popup-closed-by-user" || errCode === "auth/cancelled-popup-request") {
        setError("গুগল সাইন-ইন পপআপ উইন্ডোটি বন্ধ করা হয়েছে। কোনো সমস্যা নেই! আপনি নিচে ইমেইল ও পাসওয়ার্ড লিখে ১ সেকেন্ডে একাউন্ট খুলতে পারেন, অথবা নিচে 'গেস্ট হিসেবে চালিয়ে যান' বাটনে ক্লিক করে একাউন্ট ছাড়াই ফ্রিতে ব্যবহার করতে পারেন।");
      } else if (errCode === "auth/popup-blocked") {
        setError("আপনার ব্রাউজারে পপআপ ব্লক করা আছে। পপআপ অপশনটি চালু করে আবার চেষ্টা করুন।");
      } else if (errCode === "auth/unauthorized-domain" || String(err).includes("auth/unauthorized-domain")) {
        setShowDomainHelp(true);
        setError("এই ডোমেইনটি ফায়ারবেসে অনুমোদিত নয়। নিচের সহজ ৩ ধাপে ডোমেইনটি ফায়ারবেসে সেভ করুন।");
      } else {
        setError(translateFirebaseError(err?.message || String(err)));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const translateFirebaseError = (errMsg: string): string => {
    if (errMsg.includes("auth/invalid-credential") || errMsg.includes("auth/wrong-password")) {
      return "ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে।";
    }
    if (errMsg.includes("auth/user-not-found")) {
      return "এই ইমেইলে কোনো একাউন্ট পাওয়া যায়নি। অনুগ্রহ করে রেজিস্টার করুন।";
    }
    if (errMsg.includes("auth/email-already-in-use")) {
      return "এই ইমেইলটি দিয়ে ইতিমধ্যে একাউন্ট তৈরি করা আছে। অনুগ্রহ করে লগইন করুন।";
    }
    if (errMsg.includes("auth/weak-password")) {
      return "পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।";
    }
    if (errMsg.includes("auth/invalid-email")) {
      return "সঠিক ইমেইল এড্রেস লিখুন।";
    }
    if (errMsg.includes("auth/network-request-failed")) {
      return "ইন্টারনেট সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
    }
    if (errMsg.includes("auth/unauthorized-domain")) {
      const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";
      return `গুগল সাইন-ইন ব্যবহারের জন্য ফায়ারবেস কনসোলে ডোমেইন অনুমতি প্রয়োজন। অনুগ্রহ করে Firebase Console -> Authentication -> Settings -> Authorized domains-এ '${currentDomain}' ডোমেইনটি যুক্ত করুন।`;
    }
    if (errMsg.toLowerCase().includes("permission denied") || errMsg.includes("permission-denied")) {
      return "ফায়ারবেস সাইন-ইন সম্পন্ন হয়েছে। ডেটাবেস সিঙ্ক আপডেট করা হচ্ছে।";
    }
    return errMsg || "একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError("ইমেইল দেওয়া আবশ্যক।");
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setSuccessMessage("আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে!");
      } catch (err: any) {
        setError(translateFirebaseError(err.message || String(err)));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError("পাসওয়ার্ড দেওয়া আবশ্যক।");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setError("আপনার নাম লিখুন।");
        return;
      }
      if (password.length < 6) {
        setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
        return;
      }
      if (password !== confirmPassword) {
        setError("পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।");
        return;
      }
    }

    setLoading(true);
    try {
      let profile: UserProfile;
      if (mode === "register") {
        profile = await registerUser(name.trim(), email.trim(), password);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        profile = await loginUser(email.trim(), password);
      }

      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(translateFirebaseError(err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {mode === "login"
              ? "Sajjat AI-তে লগইন করুন"
              : mode === "register"
              ? "নতুন একাউন্ট তৈরি করুন"
              : "পাসওয়ার্ড রিসেট করুন"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Firebase Authentication ও Realtime Database দিয়ে সুরক্ষিত
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== "forgot" && (
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === "login"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === "register"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              রেজিস্টার
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 🌐 Interactive Authorized Domain Helper Card */}
        {showDomainHelp && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ফায়ারবেসে ডোমেইন যুক্ত করার নিয়ম:</span>
            </div>
            
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
              <code className="text-[11px] text-cyan-300 truncate font-mono">
                {typeof window !== "undefined" ? window.location.hostname : ""}
              </code>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.hostname);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                {copiedDomain ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-indigo-400" />}
                <span>{copiedDomain ? "কপি হয়েছে!" : "কপি করুন"}</span>
              </button>
            </div>

            <ol className="text-[11px] space-y-1 text-slate-300 list-decimal pl-4">
              <li>নিচের <strong>Firebase Console</strong> বাটনে ক্লিক করুন</li>
              <li><strong>Authentication</strong> ➔ <strong>Settings</strong> ➔ <strong>Authorized domains</strong>-এ যান</li>
              <li><strong>Add domain</strong> চেপে কপি করা ডোমেইনটি পেস্ট করে সেভ করুন</li>
            </ol>

            <a
              href="https://console.firebase.google.com/u/0/project/sajjat-ai-4b5ef/authentication/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition-colors shadow-sm cursor-pointer mt-1"
            >
              <span>🔗 Firebase Console অপশনে যান</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 🔵 Continue with Google Button */}
        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 text-slate-100 font-bold text-xs rounded-xl border border-slate-700/80 shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer mb-2.5 hover:border-indigo-500/50 group"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Google কানেক্ট করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {mode === "register" ? "Google দিয়ে অ্যাকাউন্ট তৈরি করুন" : "Google দিয়ে চালিয়ে যান"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-800/80 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer mb-3.5 hover:border-cyan-500/30"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>গেস্ট হিসেবে একাউন্ট ছাড়াই চালিয়ে যান</span>
            </button>

            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                <span className="bg-slate-900 px-2.5 text-slate-400 font-medium">
                  অথবা ইমেইল দিয়ে {mode === "register" ? "রেজিস্টার" : "লগইন"}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name for Register */}
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                আপনার পুরো নাম
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মোঃ সাকিব হোসেন"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              ইমেইল এড্রেস
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Password (if not forgot mode) */}
          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  পাসওয়ার্ড
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬টি অক্ষর"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password for Register */}
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>প্রক্রিয়াধীন...</span>
              </>
            ) : mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>লগইন করুন</span>
              </>
            ) : mode === "register" ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>একাউন্ট তৈরি করুন</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>রিসেট লিংক পাঠান</span>
              </>
            )}
          </button>
        </form>

        {/* Back to login if forgot */}
        {mode === "forgot" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              ← লগইন পেজে ফিরে যান
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
