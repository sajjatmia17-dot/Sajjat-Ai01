import React from "react";
import { X, Shield, Lock, EyeOff, Server, CheckCircle2 } from "lucide-react";
import { AppContentConfig } from "../types";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  appContent?: AppContentConfig | null;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  appContent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">গোপনীয়তা নীতি (Privacy Policy)</h3>
              <p className="text-xs text-slate-400">Sajjat Ai v3.9 • আপনার তথ্যের সুরক্ষা ও স্বচ্ছতা আমাদের অগ্রাধিকার</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <Lock className="w-4 h-4 text-emerald-400" />
              ১. ব্যক্তিগত তথ্যের সুরক্ষা
            </h4>
            <p>
              {appContent?.privacyPolicyIntro || "Sajjat Ai ব্যবহারকারীর তথ্যের সম্পূর্ণ সুরক্ষা নিশ্চিত করে। Firebase Authentication ও Realtime Database-এর মাধ্যমে প্রতিটি ব্যবহারকারীর কথোপকথন ও প্রোফাইল আলাদা আলাদা UID (Unique Identifier) দিয়ে বিচ্ছিন্নভাবে সংরক্ষিত থাকে। একজন ব্যবহারকারীর ব্যক্তিগত চ্যাট হিস্টোরি অন্য কোনো সাধারণ ব্যবহারকারী দেখতে বা পরিবর্তন করতে পারেন না।"}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <EyeOff className="w-4 h-4 text-indigo-400" />
              ২. AI প্রসেসিং, থার্ড-পার্টি API ও ডেটা ব্যবহার
            </h4>
            <p>
              আপনি যখন Sajjat Ai-এ টেক্সট চ্যাট, লাইভ ভয়েস, ছবি তৈরি, ইউনিভার্সাল সার্চ অথবা স্ক্রিন শেয়ারিং ব্যবহার করেন, তখন উত্তর তৈরির জন্য আপনার প্রম্পট বা অনুমোদিত কনটেন্ট নিরাপদ <span className="text-cyan-300 font-semibold">সার্ভার-সাইড (Server-side)</span> গেটওয়ের মাধ্যমে অ্যাডমিন কর্তৃক নির্ধারিত অনুমোদিত থার্ড-পার্টি AI ও সার্চ প্রোভাইডার API-তে (যেমন: Google, OpenRouter, xAI, DeepSeek, Anthropic বা কাস্টম এন্টারপ্রাইজ এন্ডপয়েন্ট) প্রসেস করা হয়।
            </p>
            <p className="text-slate-400">
              • সকল API Key শুধুমাত্র সার্ভারে এনক্রিপ্টেড/সুরক্ষিত পরিবেশে থাকে—কোনো ব্রাউজারে প্রকাশ করা হয় না।<br />
              • মাইক্রোফোন ও স্ক্রিন শেয়ারিং কেবল আপনার স্পষ্ট ব্রাউজার অনুমতির (Permission) পরেই সক্রিয় হয় এবং আপনি যেকোনো সময় বন্ধ করতে পারেন।
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <Server className="w-4 h-4 text-cyan-400" />
              ৩. ক্লাউড স্টোরেজ ও সেশন সিঙ্ক
            </h4>
            <p>
              অ্যাপটির স্বাভাবিক কার্যক্ষমতা, থিম পছন্দ এবং চ্যাট সিঙ্কের জন্য ব্রাউজার লোকাল স্টোরেজ এবং Firebase Realtime Database ব্যবহার করা হয়। আপনি চাইলে যেকোনো সময় আপনার চ্যাট হিস্টোরি মুছে ফেলতে পারবেন।
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              ৪. স্বত্বাধিকার ও যোগাযোগ
            </h4>
            <p>
              Sajjat Ai সম্পূর্ণভাবে Sajjat Mia দ্বারা পরিকল্পিত, পরিচালিত ও নির্মিত। গোপনীয়তা নীতি সংক্রান্ত যেকোনো তথ্যের জন্য সরাসরি ইমেইল করুন: <span className="text-cyan-400 font-mono">sajjatmia17@gmail.com</span> অথবা ফোন করুন: <span className="text-cyan-400 font-mono">01836496585</span>।
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            বুঝেছি ও বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
