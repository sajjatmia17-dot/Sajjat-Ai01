import React, { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Search, 
  Bot, 
  X, 
  Cloud, 
  HelpCircle,
  Shield, 
  Clock,
  History,
  Lock,
  Sparkles,
  Heart,
  FileCode,
  LogOut
} from "lucide-react";
import { ChatSession, UserProfile, ModalType } from "../types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onClearAllSessions?: () => void;
  user: UserProfile | null;
  onOpenModal: (type: ModalType) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAllSessions,
  user,
  onOpenModal,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) => {
    const titleMatch = (s.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const messageMatch = s.messages.some((m) =>
      (m.text || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    return titleMatch || messageMatch;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header & Quick Action */}
        <div className="p-3.5 border-b border-slate-800 space-y-2.5">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between lg:hidden pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-sm">Sajjat AI মেনু</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* + New Chat Button */}
          <button
            id="new-chat-btn"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন চ্যাট শুরু করুন</span>
          </button>

          {/* 🔍 Search History Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search History (আগের চ্যাট খুঁজুন)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="মুছুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 🕘 Chat History List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>🕘 Chat History</span>
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              {filteredSessions.length}
            </span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-500">
              <Clock className="w-7 h-7 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs text-slate-400 font-medium">কোনো চ্যাট পাওয়া যায়নি</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {searchQuery ? "ভিন্ন শব্দ দিয়ে সার্চ করুন।" : "নতুন প্রশ্ন করে কথোপকথন শুরু করুন।"}
              </p>
            </div>
          ) : (
            filteredSessions.map((session, sIdx) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id ? `sidebar_sess_${session.id}_${sIdx}` : `sidebar_sess_idx_${sIdx}`}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/40 shadow-xs"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent"
                  }`}
                >
                  <MessageSquare
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <p className={`text-xs truncate ${isActive ? "font-semibold text-white" : "font-medium"}`}>
                      {session.title || "নতুন কথোপকথন"}
                    </p>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {new Date(session.updatedAt || session.createdAt).toLocaleDateString("bn-BD", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Single Chat Delete Button */}
                  <button
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all absolute right-2 top-1/2 -translate-y-1/2"
                    title="এই চ্যাটটি মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ☰ Left Menu Navigation & Actions */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 space-y-1">
          {/* 🎨 AI Image Studio */}
          <button
            onClick={() => {
              onOpenModal("image_generator");
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all shadow-xs"
            title="Sajjat AI দিয়ে যেকোনো ছবি তৈরি করুন"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🎨</span>
              <span>ছবি তৈরি (AI Art Studio)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 font-bold text-purple-400">
              NEW
            </span>
          </button>

          {/* 🗑️ Clear Chat */}
          {sessions.length > 0 && onClearAllSessions && (
            <button
              onClick={() => {
                onClearAllSessions();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="সব চ্যাট মুছে ফেলুন"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>🗑️ Clear Chat (সব চ্যাট মুছুন)</span>
            </button>
          )}

          {/* 🔒 Privacy Policy */}
          <button
            onClick={() => {
              onOpenModal("privacy");
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            title="গোপনীয়তা নীতি দেখুন"
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>🔒 Privacy (গোপনীয়তা নীতি)</span>
          </button>

          {/* ❓ Help Center */}
          <button
            onClick={() => {
              onOpenModal("help");
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
            title="সহায়তা কেন্দ্র ও নির্দেশিকা"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>❓ Help Center (সহায়তা কেন্দ্র)</span>
          </button>
        </div>

        {/* User Account / Cloud Sync Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90">
          {user ? (
            <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    user.displayName ? user.displayName[0].toUpperCase() : "U"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user.displayName || "ব্যবহারকারী"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    onOpenModal("profile");
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  প্রোফাইল
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="লগআউট করুন"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenModal("auth");
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>ক্লাউড সিঙ্ক করতে লগইন করুন</span>
            </button>
          )}

          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
            <span>Sajjat Mia দ্বারা প্রস্তুতকৃত</span>
            <span className="flex items-center gap-1 text-rose-400/80">
              <Heart className="w-2.5 h-2.5 fill-current" />
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
