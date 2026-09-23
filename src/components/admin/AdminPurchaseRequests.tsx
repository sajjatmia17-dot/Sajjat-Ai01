import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Check, 
  X, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ExternalLink,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { PurchaseRequest } from "../../types";
import { subscribeToPurchaseRequests, updatePurchaseRequestStatus } from "../../firebase";

export const AdminPurchaseRequests: React.FC = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Rejection modal state
  const [rejectingReq, setRejectingReq] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToPurchaseRequests((reqs) => {
      setRequests(reqs);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (req: PurchaseRequest) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে ${req.userName}-এর জন্য "${req.packageName}" অনুমোদন (Approve) করতে চান?`)) return;
    setProcessingId(req.id);
    setErrorMsg(null);
    try {
      await updatePurchaseRequestStatus(req.id, "approved");
      setActionSuccess("অনুরোধটি সফলভাবে অনুমোদিত হয়েছে এবং ইউজারের লিমিট আপডেট করা হয়েছে!");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "অনুমোদন করতে ব্যর্থ হয়েছে।");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (req: PurchaseRequest) => {
    setRejectingReq(req);
    setRejectionReason("");
    setErrorMsg(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      setErrorMsg("বাতিল করার সুনির্দিষ্ট কারণ অবশ্যই দিতে হবে।");
      return;
    }

    setProcessingId(rejectingReq.id);
    setErrorMsg(null);
    try {
      await updatePurchaseRequestStatus(rejectingReq.id, "rejected", rejectionReason.trim());
      setRejectingReq(null);
      setActionSuccess("অনুরোধটি বাতিল (Rejected) করা হয়েছে।");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "অনুরোধ বাতিল করতে ব্যর্থ হয়েছে।");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter and search
  const filteredRequests = requests.filter((req) => {
    const matchesFilter = filter === "all" || req.status === filter;
    const matchesSearch = 
      req.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.senderNumber?.includes(searchQuery) ||
      req.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.packageName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Card */}
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-amber-400">অপেক্ষমাণ পেমেন্ট</p>
            <h3 className="text-xl font-black text-white">
              {requests.filter(r => r.status === "pending").length} টি
            </h3>
          </div>
          <Clock className="w-8 h-8 text-amber-500/50 shrink-0" />
        </div>

        {/* Approved Card */}
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-emerald-400">অনুমোদিত পেমেন্ট</p>
            <h3 className="text-xl font-black text-white">
              {requests.filter(r => r.status === "approved").length} টি
            </h3>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/50 shrink-0" />
        </div>

        {/* Total Volume */}
        <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-indigo-400">মোট বিক্রয় পরিমাণ</p>
            <h3 className="text-xl font-black text-white">
              ৳ {requests.filter(r => r.status === "approved").reduce((sum, r) => sum + Number(r.amount || 0), 0)} BDT
            </h3>
          </div>
          <CreditCard className="w-8 h-8 text-indigo-500/50 shrink-0" />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-2xl text-center">
          {actionSuccess}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Control Filters and Search */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start">
            {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  filter === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "pending" ? "🔔 পেন্ডিং" : tab === "approved" ? "✓ অনুমোদিত" : tab === "rejected" ? "✗ বাতিল" : "সব অনুরোধ"}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="নাম, ইমেইল বা ট্রানজেকশন আইডি..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
              কোনো পারচেজ বা পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি!
            </div>
          ) : (
            filteredRequests.map((req, rIdx) => (
              <div 
                key={req.id ? `req_${req.id}` : `req_idx_${rIdx}`} 
                className={`p-5 rounded-2xl border bg-slate-950/80 space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  req.status === "pending" 
                    ? "border-amber-500/20 bg-gradient-to-r from-amber-950/5 to-transparent" 
                    : req.status === "approved"
                    ? "border-emerald-500/20"
                    : "border-rose-500/20"
                }`}
              >
                {/* Left Side: Request Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-white">{req.userName}</span>
                    <span className="text-[10px] font-mono text-slate-400">({req.userEmail})</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                        : req.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {req.status === "pending" ? "পেন্ডিং (Pending)" : req.status === "approved" ? "অনুমোদিত" : "বাতিল করা হয়েছে"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Selected Package */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] space-y-0.5">
                      <p className="text-slate-400 font-semibold">প্যাকেজ ও মূল্য:</p>
                      <p className="font-bold text-indigo-300">{req.packageName}</p>
                      <p className="font-semibold text-slate-200">৳ {req.amount} BDT (মেয়াদ: {req.validityMonths} মাস)</p>
                    </div>

                    {/* Transaction Detail */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] space-y-0.5">
                      <p className="text-slate-400 font-semibold">পেমেন্ট মেথড ও নাম্বার:</p>
                      <p className="font-bold text-cyan-400 uppercase">{req.paymentMethod}</p>
                      <p className="font-semibold text-slate-200">সেন্ডার: {req.senderNumber}</p>
                    </div>

                    {/* Trx ID */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] space-y-0.5">
                      <p className="text-slate-400 font-semibold">ট্রানজেকশন আইডি:</p>
                      <p className="font-bold text-amber-400 font-mono tracking-tight select-all">{req.transactionId}</p>
                      <p className="text-slate-500 text-[10px]">
                        তারিখ: {new Date(req.createdAt).toLocaleDateString("bn-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {req.status === "rejected" && req.rejectionReason && (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl text-rose-400 text-[11px] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>বাতিল করার কারণ: <span className="font-semibold">{req.rejectionReason}</span></span>
                    </div>
                  )}
                </div>

                {/* Right Side: Action Buttons (Only for Pending) */}
                {req.status === "pending" && (
                  <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 md:self-center">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>অনুমোদন করুন</span>
                    </button>
                    <button
                      onClick={() => handleOpenReject(req)}
                      disabled={processingId === req.id}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>বাতিল করুন</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>অনুরোধ বাতিল করার কারণ</span>
              </h3>
              <button 
                onClick={() => setRejectingReq(null)} 
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              অনুরোধটি বাতিল করার সুনির্দিষ্ট কারণটি লিখুন। এটি ইউজার প্যানেলে ব্যবহারকারী দেখতে পাবেন যাতে তারা সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করতে পারেন।
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">বাতিলের কারণ (Rejection Reason)</label>
                <input 
                  type="text"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="যেমন: ভুল ট্রানজেকশন আইডি দেওয়া হয়েছে / পেমেন্ট পাওয়া যায়নি"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-2.5 text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={processingId === rejectingReq.id}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-60"
              >
                {processingId === rejectingReq.id ? "প্রসেস হচ্ছে..." : "✗ নিশ্চিতভাবে বাতিল করুন"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
