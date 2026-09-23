import React, { useState } from "react";
import { Lock, Mail, ShieldAlert, X, Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, ArrowRight } from "lucide-react";
import { loginAdmin, resetPassword, auth, loginAdminWithCurrentSession, isAdmin } from "../firebase";
import { UserProfile } from "../types";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminUser: UserProfile) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("sajjatmia17@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCurrentSessionAdmin = auth.currentUser && auth.currentUser.email && isAdmin(auth.currentUser.email);

  const handleQuickSessionLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await loginAdminWithCurrentSession();
      if (profile) {
        onSuccess(profile);
        onClose();
      } else {
        setError("বিদ্যমান সেশন পাওয়া যায়নি। পাসওয়ার্ড দিয়ে লগইন করুন।");
      }
    } catch (err: any) {
      setError(err?.message || "সেশন ভেরিফিকেশন ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setInfoMessage(null);
    setResetLoading(true);
    try {
      await resetPassword(email.trim());
      setInfoMessage(`পাসওয়ার্ড রিসেট লিংক ${email.trim()} ইমেইলে পাঠানো হয়েছে! আপনার ইনবক্স চেক করে নতুন পাসওয়ার্ড সেট করুন।`);
    } catch (err: any) {
      setError(err?.message || "পাসওয়ার্ড রিসেট ইমেইল পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const adminProfile = await loginAdmin(email, password);
      onSuccess(adminProfile);
      onClose();
    } catch (err: any) {
      console.error("Admin login error:", err);
      setError(err?.message || "লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল ও পাসওয়ার্ড প্রদান করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl p-6 sm:p-7 text-slate-100 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-16 bg-indigo-500/20 blur-2xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Admin Authentication
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Secret Access
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sajjat AI অ্যাডমিন কন্ট্রোল প্যানেল লগইন
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

        {/* Active session quick enter */}
        {isCurrentSessionAdmin && (
          <div className="mt-4 p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-semibold text-cyan-300">অ্যাডমিন হিসেবে সাইন-ইন আছেন</p>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{auth.currentUser?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleQuickSessionLogin}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>সরাসরি প্রবেশ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleLogin} className="py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 leading-relaxed">
                <span>{infoMessage}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              অ্যাডমিন ইমেইল (Admin Email)
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sajjatmia17@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-2xl px-4 py-2.5 pl-10 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                অ্যাডমিন পাসওয়ার্ড (Admin Password)
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                {resetLoading ? "পাঠানো হচ্ছে..." : "পাসওয়ার্ড রিসেট"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="আপনার অ্যাডমিন পাসওয়ার্ড লিখুন"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-2xl px-4 py-2.5 pl-10 pr-10 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>নিরাপদ অ্যাডমিন অ্যাক্সেস</span>
            </div>
            <p className="text-slate-400 leading-normal">
              লগইন করার পর আপনি সকল ইউজার, এআই সেটিংস, রিয়েলটাইম নোটিফিকেশন ও কন্টেন্ট নিয়ন্ত্রণ করতে পারবেন।
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>যাচাই করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Admin Panel-এ প্রবেশ করুন</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
