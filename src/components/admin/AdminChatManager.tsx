import React, { useState } from "react";
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  Eye, 
  Clock, 
  User, 
  Bot, 
  Calendar,
  Sparkles,
  BarChart3,
  FileText
} from "lucide-react";
import { AdminUserData, ChatSession } from "../../types";

interface AdminChatManagerProps {
  users: AdminUserData[];
  onDeleteSession?: (userId: string, sessionId: string) => void;
}

export const AdminChatManager: React.FC<AdminChatManagerProps> = ({ users, onDeleteSession }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  // Flatten all sessions across users
  const allSessionsWithUser: Array<{
    user: AdminUserData;
    session: ChatSession;
  }> = [];

  for (const u of users) {
    if (u.chats) {
      for (const [sId, s] of Object.entries(u.chats)) {
        allSessionsWithUser.push({
          user: u,
          session: { ...s, id: sId }
        });
      }
    }
  }

  // Sort by recent updated time
  allSessionsWithUser.sort((a, b) => (b.session.updatedAt || 0) - (a.session.updatedAt || 0));

  const filteredSessions = allSessionsWithUser.filter((item) => {
    const q = searchQuery.toLowerCase();
    const userMatch = item.user.displayName.toLowerCase().includes(q) || item.user.email.toLowerCase().includes(q);
    const titleMatch = (item.session.title || "").toLowerCase().includes(q);
    const msgMatch = item.session.messages?.some(m => (m.text || "").toLowerCase().includes(q));
    return userMatch || titleMatch || msgMatch;
  });

  const totalMessagesCount = allSessionsWithUser.reduce((acc, curr) => acc + (curr.session.messages?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">মোট সেশন</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{allSessionsWithUser.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">মোট বার্তা আদান-প্রদান</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{totalMessagesCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">সক্রিয় চ্যাটকারী</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                {users.filter(u => u.chats && Object.keys(u.chats).length > 0).length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Viewer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat Sessions List */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              কথোপকথন রেকর্ড ({filteredSessions.length})
            </h3>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ব্যবহারকারী বা বার্তা খুঁজুন..."
              className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">কোনো চ্যাট রেকর্ড পাওয়া যায়নি</p>
            ) : (
              filteredSessions.map(({ user, session }) => {
                const isSelected = selectedSession?.id === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSelectedSession(session);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl transition-all my-1 flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-100"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.displayName || "User"}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          ({user.email})
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                        {session.title || "নির্দলীয় কথোপকথন"}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(session.updatedAt || session.createdAt).toLocaleString("bn-BD")} • {session.messages?.length || 0} টি মেসেজ
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Session Transcript */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[500px]">
          {selectedSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedSession.title || "চ্যাট ট্রান্সক্রিপ্ট"}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    ব্যবহারকারী: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedUser?.displayName}</span> ({selectedUser?.email})
                  </p>
                </div>
              </div>

              {/* Messages Flow */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {selectedSession.messages?.map((msg, idx) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id ? `adm_msg_${msg.id}` : `adm_msg_${idx}`}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                          AI
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                          isUser
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <span className={`text-[10px] block mt-1 ${isUser ? "text-blue-200 text-right" : "text-zinc-400"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                          U
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                যেকোনো কথোপকথন নির্বাচন করুন
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                বাম পাশের তালিকা থেকে যেকোনো ব্যবহারকারীর চ্যাট নির্বাচন করে সম্পূর্ণ কথোপকথন দেখুন।
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
