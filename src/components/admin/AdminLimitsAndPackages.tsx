import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Award,
  Zap,
  DollarSign
} from "lucide-react";
import { PremiumPackage, SystemSettingsConfig } from "../../types";
import { 
  subscribeToPackages, 
  savePackage, 
  deletePackage,
  subscribeToSystemSettings,
  saveSystemSettings 
} from "../../firebase";

export const AdminLimitsAndPackages: React.FC = () => {
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsConfig | null>(null);
  const [freeDailyLimitInput, setFreeDailyLimitInput] = useState<number>(25);
  const [isSavingDailyLimit, setIsSavingDailyLimit] = useState(false);
  
  // Package form state
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PremiumPackage | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState(150);
  const [formValidity, setFormValidity] = useState(1);
  const [formLimit, setFormLimit] = useState(100);
  const [formIsUnlimited, setFormIsUnlimited] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load packages and system settings
  useEffect(() => {
    const unsubPkg = subscribeToPackages((pkgs) => {
      setPackages(pkgs);
    });
    const unsubSettings = subscribeToSystemSettings((settings) => {
      setSystemSettings(settings);
      if (settings && typeof settings.defaultFreeDailyLimit === "number") {
        setFreeDailyLimitInput(settings.defaultFreeDailyLimit);
      }
    });
    return () => {
      unsubPkg();
      unsubSettings();
    };
  }, []);

  const handleSaveFreeDailyLimit = async () => {
    setIsSavingDailyLimit(true);
    setErrorMsg(null);
    try {
      await saveSystemSettings({
        defaultFreeDailyLimit: Number(freeDailyLimitInput)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "দৈনিক ফ্রি লিমিট সেভ করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSavingDailyLimit(false);
    }
  };

  // Seed default packages if none exist
  const seedDefaultPackages = async () => {
    try {
      const defaults: PremiumPackage[] = [
        { id: "pkg_1m", name: "1 Month", price: 150, validityMonths: 1, messageLimit: 99999, isUnlimited: true, enabled: true, createdAt: Date.now() },
        { id: "pkg_2m", name: "2 Months", price: 290, validityMonths: 2, messageLimit: 99999, isUnlimited: true, enabled: true, createdAt: Date.now() + 1 },
        { id: "pkg_3m", name: "3 Months", price: 580, validityMonths: 3, messageLimit: 99999, isUnlimited: true, enabled: true, createdAt: Date.now() + 2 },
        { id: "pkg_6m", name: "6 Months", price: 1100, validityMonths: 6, messageLimit: 99999, isUnlimited: true, enabled: true, createdAt: Date.now() + 3 },
        { id: "pkg_1y", name: "1 Year", price: 1500, validityMonths: 12, messageLimit: 99999, isUnlimited: true, enabled: true, createdAt: Date.now() + 4 },
      ];
      for (const p of defaults) {
        await savePackage(p);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg("ডিফল্ট প্যাকেজ সেভ করতে ব্যর্থ: " + err.message);
    }
  };

  const handleTogglePackageEnabled = async (pkg: PremiumPackage) => {
    try {
      await savePackage({
        ...pkg,
        enabled: !pkg.enabled
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleSystemLimit = async () => {
    if (!systemSettings) return;
    try {
      const currentVal = !!systemSettings.aiLimitSystemEnabled;
      const newVal = !currentVal;

      await saveSystemSettings({
        aiLimitSystemEnabled: newVal
      });

      // Also sync to server memory
      try {
        await fetch("/api/system-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiLimitSystemEnabled: newVal })
        });
      } catch (e) {
        console.warn("Server sync failed:", e);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle limit system.");
    }
  };

  const handleOpenAdd = () => {
    setEditingPkg(null);
    setFormName("");
    setFormPrice(150);
    setFormValidity(1);
    setFormLimit(100);
    setFormIsUnlimited(false);
    setFormEnabled(true);
    setErrorMsg(null);
    setShowForm(true);
  };

  const handleOpenEdit = (pkg: PremiumPackage) => {
    setEditingPkg(pkg);
    setFormName(pkg.name);
    setFormPrice(pkg.price);
    setFormValidity(pkg.validityMonths);
    setFormLimit(pkg.messageLimit);
    setFormIsUnlimited(!!pkg.isUnlimited);
    setFormEnabled(!!pkg.enabled);
    setErrorMsg(null);
    setShowForm(true);
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("প্যাকেজের নাম দেওয়া আবশ্যক।");
      return;
    }
    
    try {
      const payload: PremiumPackage = {
        id: editingPkg ? editingPkg.id : `pkg_${Date.now()}`,
        name: formName.trim(),
        price: Number(formPrice),
        validityMonths: Number(formValidity),
        messageLimit: formIsUnlimited ? 99999 : Number(formLimit),
        isUnlimited: formIsUnlimited,
        enabled: formEnabled,
        createdAt: editingPkg ? editingPkg.createdAt : Date.now()
      };

      await savePackage(payload);
      setShowForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "প্যাকেজ সংরক্ষণ করতে ব্যর্থ হয়েছে।");
    }
  };

  const handleDeletePkg = async (pkgId: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই প্রিমিয়াম প্যাকেজটি মুছে ফেলতে চান?")) return;
    try {
      await deletePackage(pkgId);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete package.");
    }
  };

  const isEnabled = systemSettings?.aiLimitSystemEnabled ?? false;

  return (
    <div className="space-y-6">
      {/* Header and Master Switch */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">AI লিমিট ও প্যাকেজ সিস্টেম</h2>
            </div>
            <p className="text-xs text-slate-400">
              ব্যবহারকারীদের AI ব্যবহারের দৈনিক লিমিট নিয়ন্ত্রণ ও প্রিমিয়াম প্যাকেজ ক্রয় মেকানিজম।
            </p>
          </div>
          
          {/* Master Toggle Button */}
          <button
            onClick={handleToggleSystemLimit}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
              isEnabled 
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isEnabled ? "bg-white animate-pulse" : "bg-slate-500"}`} />
            <span>AI Limit System: {isEnabled ? "ON (সক্রিয়)" : "OFF (নিষ্ক্রিয়)"}</span>
          </button>
        </div>

        {/* Informative Note based on switch state */}
        <div className={`p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed ${
          isEnabled 
            ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300" 
            : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
        }`}>
          {isEnabled ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <span className="font-bold">সিস্টেম সক্রিয় রয়েছে:</span> সকল সাধারণ ইউজারদের জন্য নির্ধারিত দৈনিক লিমিট কার্যকর থাকবে। লিমিট অতিক্রম করলে প্রিমিয়াম প্যাকেজ কেনার জন্য প্রোমোট করা হবে। অ্যাডমিন ম্যানুয়ালি যেকোনো ইউজারের লিমিট ওভাররাইড করতে পারবেন।
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">সিস্টেম নিষ্ক্রিয় রয়েছে:</span> সকল ব্যবহারকারী স্বাভাবিকভাবে সম্পূর্ণ ফ্রিতে আনলিমিটেড AI ফিচার ব্যবহার করতে পারবেন। কোনো লিমিট উইন্ডো বা প্রিমিয়াম ক্রয় সংক্রান্ত UI কোনো সাধারণ ব্যবহারকারীর স্ক্রিনে প্রদর্শিত হবে না।
              </div>
            </>
          )}
        </div>

        {/* Daily Limit Amount Config (When Enabled) */}
        {isEnabled && (
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                ডিফল্ট ফ্রি দৈনিক লিমিট (Free Daily Message Limit)
              </label>
              <p className="text-[11px] text-slate-400">
                ফ্রি ইউজাররা প্রতিদিন সর্বোচ্চ কতটি এআই মেসেজ পাঠাতে পারবে তা নির্ধারণ করুন।
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={1}
                max={1000}
                value={freeDailyLimitInput}
                onChange={(e) => setFreeDailyLimitInput(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white text-center font-mono outline-none"
              />
              <span className="text-xs text-slate-400">টি / দিন</span>
              <button
                type="button"
                onClick={handleSaveFreeDailyLimit}
                disabled={isSavingDailyLimit}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>সেভ</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-2xl text-center">
          ✓ পরিবর্তনসমূহ ডেটাবেজে সফলভাবে সংরক্ষিত হয়েছে!
        </div>
      )}

      {/* Package Management Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>প্রিমিয়াম প্যাকেজ তালিকা (Premium Packages)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              ইউজার প্যানেলে প্রদর্শিত হওয়ার জন্য প্যাকেজ সমূহ কনফিগার করুন।
            </p>
          </div>
          <div className="flex items-center gap-2">
            {packages.length === 0 && (
              <button
                type="button"
                onClick={seedDefaultPackages}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>⚡ ডিফল্ট ৫টি প্যাকেজ লোড করুন</span>
              </button>
            )}
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্যাকেজ তৈরি</span>
            </button>
          </div>
        </div>

        {/* Table/List of Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.length === 0 ? (
            <div className="col-span-full text-center py-10 space-y-3">
              <p className="text-xs text-slate-400">কোনো প্রিমিয়াম প্যাকেজ পাওয়া যায়নি।</p>
              <button
                type="button"
                onClick={seedDefaultPackages}
                className="px-4 py-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer hover:bg-amber-500/30 transition-all inline-flex items-center gap-2"
              >
                <span>⚡ ডিফল্ট প্যাকেজ তালিকা (1m: ৳150, 2m: ৳290, 3m: ৳580, 6m: ৳1100, 1y: ৳1500) তৈরি করুন</span>
              </button>
            </div>
          ) : (
            packages.map((pkg, pIdx) => (
              <div 
                key={pkg.id ? `pkg_${pkg.id}` : `pkg_idx_${pIdx}`} 
                className={`p-5 rounded-2xl border bg-slate-950/80 space-y-4 flex flex-col justify-between transition-all ${
                  pkg.enabled ? "border-slate-800" : "border-slate-800 opacity-60"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{pkg.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">মেয়াদ: {pkg.validityMonths} মাস</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePackageEnabled(pkg)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105 ${
                        pkg.enabled 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                      title={pkg.enabled ? "বন্ধ করতে ক্লিক করুন" : "চালু করতে ক্লিক করুন"}
                    >
                      {pkg.enabled ? "সক্রিয় (Active)" : "বন্ধ (Disabled)"}
                    </button>
                  </div>

                  <div className="flex items-baseline gap-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400">মূল্য:</span>
                    <span className="text-xs font-bold text-indigo-400">৳{pkg.price} BDT</span>
                  </div>

                  <div className="text-[10px] text-slate-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>লিমিট: {pkg.isUnlimited ? "আনলিমিটেড মেসেজ" : `প্রতিদিন সর্বোচ্চ ${pkg.messageLimit}টি মেসেজ`}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-900 flex items-center justify-end gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-all cursor-pointer"
                    title="সম্পাদনা করুন"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePkg(pkg.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-all cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Package Form Modal / Card */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{editingPkg ? "প্যাকেজ সম্পাদনা করুন" : "নতুন প্রিমিয়াম প্যাকেজ তৈরি"}</span>
              </h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePkg} className="space-y-4 text-xs">
              {/* Package Name */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">প্যাকেজের নাম (Package Name)</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="যেমন: ১ মাস প্রিমিয়াম প্যাকেজ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Price & Validity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-300">মূল্য (৳ BDT)</label>
                  <input 
                    type="number"
                    required
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-300">মেয়াদ (মাস)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={formValidity}
                    onChange={(e) => setFormValidity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Limit Type */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">মেসেজ লিমিট ধরণ</label>
                <div className="flex items-center gap-4 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input 
                      type="radio" 
                      name="limitType" 
                      checked={!formIsUnlimited} 
                      onChange={() => setFormIsUnlimited(false)}
                      className="accent-indigo-500"
                    />
                    <span>দৈনিক লিমিট আছে</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input 
                      type="radio" 
                      name="limitType" 
                      checked={formIsUnlimited} 
                      onChange={() => setFormIsUnlimited(true)}
                      className="accent-indigo-500"
                    />
                    <span>আনলিমিটেড (Unlimited AI)</span>
                  </label>
                </div>
              </div>

              {/* Message Limit Input */}
              {!formIsUnlimited && (
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-300">দৈনিক মেসেজ সংখ্যা (Daily Messages)</label>
                  <input 
                    type="number"
                    required
                    min={10}
                    value={formLimit}
                    onChange={(e) => setFormLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300">স্ট্যাটাস (ইউজার চয়েস-এ দেখাবে)</span>
                <button
                  type="button"
                  onClick={() => setFormEnabled(prev => !prev)}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    formEnabled ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    formEnabled ? "translate-x-5.5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>প্যাকেজ সংরক্ষণ করুন</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
