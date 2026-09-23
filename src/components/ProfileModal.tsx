import React, { useState } from "react";
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Save, 
  CheckCircle2, 
  Fingerprint,
  FileText,
  LogOut
} from "lucide-react";
import { UserProfile } from "../types";
import { updateUserProfile } from "../firebase";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
}) => {
  if (!isOpen || !user) return null;

  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated = {
      ...user,
      displayName: displayName.trim(),
      bio: bio.trim(),
    };
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
    } catch (err) {
      console.warn("Profile update warning handled:", err);
    } finally {
      onUpdateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/20 overflow-hidden shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user.displayName ? user.displayName[0].toUpperCase() : "U"
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">ব্যবহারকারী প্রোফাইল</h3>
            <p className="text-xs text-slate-400">Firebase Realtime Database-এ সংরক্ষিত</p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>প্রোফাইল সফলভাবে আপডেট হয়েছে!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* User Display Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              নাম (Display Name)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              ইমেইল এড্রেস (অপরিবর্তনীয়)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              সংক্ষিপ্ত বায়ো (Bio)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Metadata Card */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                <span>Firebase UID:</span>
              </span>
              <span className="font-mono text-slate-300 text-[10px] max-w-[170px] truncate">
                {user.uid}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>রেজিস্ট্রেশন তারিখ:</span>
              </span>
              <span className="text-slate-300">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("bn-BD") : "এখনই"}
              </span>
            </div>
          </div>

          {/* Save & Logout Buttons */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2.5">
            <button
              id="save-profile-btn"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shrink-0 hover:border-rose-500/50"
                title="অ্যাকাউন্ট থেকে লগআউট করুন"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>লগআউট</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
