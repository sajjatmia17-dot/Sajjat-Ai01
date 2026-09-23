import React from "react";
import { 
  Bell, 
  X, 
  CheckCheck, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  Rocket, 
  CheckCircle2,
  Clock
} from "lucide-react";
import { AppNotification, UserProfile } from "../types";
import { markNotificationAsRead } from "../firebase";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  user: UserProfile | null;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  user,
}) => {
  if (!isOpen) return null;

  // Filter notifications for this user (or all users)
  const userNotifications = notifications.filter((notif) => {
    if (notif.target === "all") return true;
    if (user && notif.target === "user") {
      return notif.targetUserId === user.uid || notif.targetUserEmail?.toLowerCase() === user.email.toLowerCase();
    }
    return false;
  });

  const getIsRead = (notif: AppNotification) => {
    if (!user) return false;
    return Boolean(notif.readBy && notif.readBy[user.uid]);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    for (const notif of userNotifications) {
      if (!getIsRead(notif)) {
        await markNotificationAsRead(notif.id, user.uid);
      }
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (user && !getIsRead(notif)) {
      await markNotificationAsRead(notif.id, user.uid);
    }
  };

  const getTypeDetails = (type: AppNotification["type"]) => {
    switch (type) {
      case "feature":
        return {
          icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
          badge: "নতুন ফিচার",
          badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        };
      case "update":
        return {
          icon: <Rocket className="w-4 h-4 text-indigo-400" />,
          badge: "সিস্টেম আপডেট",
          badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        };
      case "alert":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          badge: "জরুরি সতর্কতা",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "announcement":
      default:
        return {
          icon: <Info className="w-4 h-4 text-amber-400" />,
          badge: "ঘোষণা",
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
    }
  };

  const formatDate = (val: string | number) => {
    try {
      const d = typeof val === "number" ? new Date(val) : new Date(val);
      return d.toLocaleDateString("bn-BD", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "কিছুক্ষণ আগে";
    }
  };

  const unreadCount = userNotifications.filter(n => !getIsRead(n)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-slate-900 rounded-full" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  বিজ্ঞপ্তি ও নোটিফিকেশন
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {unreadCount} টি অপঠিত
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Sajjat AI এর সর্বশেষ আপডেট ও বার্তা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && user && (
              <button
                onClick={handleMarkAllRead}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                title="সবগুলো পঠিত করুন"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">সব পঠিত</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
          {userNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">কোনো নতুন নোটিফিকেশন নেই</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                অ্যাডমিন বা সিস্টেম থেকে নতুন কোনো ঘোষণা বা আপডেট আসলে এখানে দেখা যাবে।
              </p>
            </div>
          ) : (
            userNotifications.map((notif, nIdx) => {
              const isRead = getIsRead(notif);
              const typeDetails = getTypeDetails(notif.type);

              return (
                <div
                  key={notif.id ? `user_notif_${notif.id}_${nIdx}` : `user_notif_idx_${nIdx}`}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isRead
                      ? "bg-slate-950/50 border-slate-800/80 hover:border-slate-700 opacity-80"
                      : "bg-slate-950 border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-950/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${typeDetails.badgeClass}`}>
                        {typeDetails.icon}
                        {typeDetails.badge}
                      </span>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {notif.message}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      প্রেরক: <strong className="text-cyan-400">{notif.senderName || "Sajjat Mia (Admin)"}</strong>
                    </span>
                    {isRead ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> পঠিত
                      </span>
                    ) : (
                      <span className="text-indigo-400 font-medium">ক্লিক করে পঠিত করুন</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
