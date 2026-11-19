import React, { useState, useEffect } from "react";
import {
  Lock,
  Mail,
  ShieldAlert,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  loginAdmin,
  loginAdminWithGoogle,
  resetPassword,
  auth,
  loginAdminWithCurrentSession,
  verifyBackendAdminPasscode,
  isAdmin,
  ADMIN_EMAIL,
} from "../firebase";
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
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [firebasePassword, setFirebasePassword] = useState("");
  const [panelPasscode, setPanelPasscode] = useState("");
  const [showFirebasePassword, setShowFirebasePassword] = useState(false);
  const [showPanelPasscode, setShowPanelPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [sessionProfile, setSessionProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPanelPasscode("");
      setFirebasePassword("");
      setError(null);
      setInfoMessage(null);
      setSessionProfile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCurrentSessionAdmin =
    Boolean(sessionProfile) ||
    (Boolean(auth.currentUser?.email) &&
      isAdmin(auth.currentUser?.email) &&
      Boolean(auth.currentUser?.emailVerified));

  const handleVerifyPasscodeAndEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = panelPasscode.trim();
    if (!trimmedCode) {
      setError("অ্যাডমিন প্যানেল পাসওয়ার্ড লিখুন।");
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const check = await verifyBackendAdminPasscode(trimmedCode);
      if (!check.authorized) {
        setError(check.reason || "ভুল অ্যাডমিন প্যানেল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।");
        return;
      }

      const profile = sessionProfile || (await loginAdminWithCurrentSession());
      if (profile) {
        setPanelPasscode("");
        onSuccess(profile);
        onClose();
      } else {
        setError("সার্ভার-সাইড অ্যাডমিন সেশন যাচাই ব্যর্থ হয়েছে। Google দিয়ে পুনরায় সাইন-ইন করুন।");
      }
    } catch (err: any) {
      setError(err?.message || "পাসওয়ার্ড যাচাই করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setInfoMessage(null);
    setGoogleLoading(true);
    try {
      const profile = await loginAdminWithGoogle();
      setSessionProfile(profile);
      setInfoMessage(`Google অ্যাকাউন্ট (${profile.email}) যাচাই হয়েছে। এবার অ্যাডমিন প্যানেল পাসওয়ার্ড দিন।`);
    } catch (err: any) {
      setError(err?.message || "Google দিয়ে অ্যাডমিন ভেরিফিকেশন ব্যর্থ হয়েছে।");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError(`Access Denied: শুধুমাত্র ${ADMIN_EMAIL} এর জন্য রিসেট প্রযোজ্য।`);
      return;
    }
    setError(null);
    setInfoMessage(null);
    setResetLoading(true);
    try {
      await resetPassword(email.trim());
      setInfoMessage(
        `পাসওয়ার্ড রিসেট লিংক ${email.trim()} ইমেইলে পাঠানো হয়েছে! ইনবক্স চেক করে নতুন পাসওয়ার্ড সেট করুন।`
      );
    } catch (err: any) {
      setError(err?.message || "পাসওয়ার্ড রিসেট ইমেইল পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const adminProfile = await loginAdmin(email, firebasePassword);
      setSessionProfile(adminProfile);
      setInfoMessage(`অ্যাকাউন্ট (${adminProfile.email}) যাচাই হয়েছে। এবার অ্যাডমিন প্যানেল পাসওয়ার্ড দিন।`);
    } catch (err: any) {
      setError(err?.message || "লগইন ব্যর্থ হয়েছে। সঠিক ভেরিফায়েড অ্যাডমিন তথ্য দিন।");
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Admin Verification
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  2-Step Lock
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                কেবল {ADMIN_EMAIL} + অ্যাডমিন পাসওয়ার্ড
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

        <div className="pt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed">{infoMessage}</span>
            </div>
          )}

          {/* STEP 2: Verified sajjatmia17@gmail.com -> Enter Admin Panel Password */}
          {isCurrentSessionAdmin ? (
            <form onSubmit={handleVerifyPasscodeAndEnter} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs min-w-0">
                  <p className="font-semibold text-cyan-300">ভেরিফায়েড অ্যাডমিন সেশন সক্রিয়</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {sessionProfile?.email || auth.currentUser?.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  অ্যাডমিন প্যানেল পাসওয়ার্ড (Admin Passcode)
                </label>
                <div className="relative">
                  <input
                    type={showPanelPasscode ? "text" : "password"}
                    inputMode="numeric"
                    autoFocus
                    required
                    value={panelPasscode}
                    onChange={(e) => setPanelPasscode(e.target.value)}
                    placeholder="অ্যাডমিন প্যানেল পাসওয়ার্ড দিন (••••)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 pl-10 pr-10 text-sm tracking-widest text-slate-100 placeholder-slate-500 outline-none"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPanelPasscode((prev) => !prev)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPanelPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>সার্ভার পাসওয়ার্ড যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>যাচাই ও Admin Panel-এ প্রবেশ</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 1: Verify sajjatmia17@gmail.com Identity First */
            <>
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={loading || googleLoading}
                className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 text-white text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Google টোকেন যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>ধাপ ১: Google দিয়ে সাইন-ইন ({ADMIN_EMAIL})</span>
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-slate-900 px-2.5 text-slate-400 font-medium">
                    অথবা ভেরিফায়েড ইমেইল লগইন
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailPasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    অ্যাডমিন ইমেইল
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={ADMIN_EMAIL}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 pl-10 text-xs text-slate-100 placeholder-slate-500 outline-none"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Firebase অ্যাকাউন্ট পাসওয়ার্ড
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
                      type={showFirebasePassword ? "text" : "password"}
                      required
                      value={firebasePassword}
                      onChange={(e) => setFirebasePassword(e.target.value)}
                      placeholder="আপনার Firebase অ্যাকাউন্ট পাসওয়ার্ড"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 pl-10 pr-10 text-xs text-slate-100 placeholder-slate-500 outline-none"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowFirebasePassword((prev) => !prev)}
                      className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showFirebasePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>সার্ভার টোকেন যাচাই করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-cyan-300" />
                      <span>পরবর্তী ধাপ: অ্যাডমিন পাসওয়ার্ড</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
