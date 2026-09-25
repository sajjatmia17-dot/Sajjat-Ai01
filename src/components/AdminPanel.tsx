import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Bot, 
  FileEdit, 
  Bell, 
  Settings, 
  LogOut, 
  ExternalLink, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Key, 
  Send, 
  Trash2, 
  Edit3, 
  Plus, 
  MessageSquare, 
  Eye, 
  EyeOff,
  X, 
  Save, 
  RefreshCw, 
  Zap, 
  Activity, 
  Database, 
  Check, 
  Sliders, 
  Info,
  Shield,
  HelpCircle,
  Menu,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Palette,
  CreditCard,
  Award,
  DollarSign,
  ShieldAlert
} from "lucide-react";
import { 
  UserProfile, 
  AdminUserData, 
  AppNotification, 
  AdminAISettings, 
  AppContentConfig, 
  GeminiModelId,
  AVAILABLE_MODELS,
  BookItem,
  SystemSettingsConfig
} from "../types";
import { 
  subscribeToAllUsers, 
  updateUserStatus, 
  deleteUserData,
  subscribeToNotifications,
  createNotification,
  deleteNotification,
  subscribeToAppContent,
  saveAppContent,
  subscribeToAdminAISettings,
  saveAdminAISettings,
  logoutUser,
  subscribeToSystemSettings,
  saveSystemSettings,
  subscribeToPackages,
  savePackage,
  deletePackage,
  subscribeToPurchaseRequests,
  updatePurchaseRequestStatus,
  updateUserAiLimit,
  database
} from "../firebase";
import { ref, get } from "firebase/database";
import { AdminBookLibrary } from "./admin/AdminBookLibrary";
import { getBackendBaseUrl } from "../api";
import { AdminApiProviders } from "./admin/AdminApiProviders";
import { AdminChatManager } from "./admin/AdminChatManager";
import { AdminVoiceAndFiles } from "./admin/AdminVoiceAndFiles";
import { AdminBranding } from "./admin/AdminBranding";
import { AdminLimitsAndPackages } from "./admin/AdminLimitsAndPackages";
import { AdminPurchaseRequests } from "./admin/AdminPurchaseRequests";
import { AdminFeatureControl } from "./admin/AdminFeatureControl";

interface AdminPanelProps {
  adminUser: UserProfile;
  onClose: () => void;
  onLogout: () => void;
}

type AdminTab = 
  | "dashboard" 
  | "users" 
  | "chats"
  | "books" 
  | "limits_packages"
  | "purchase_requests"
  | "ai_control" 
  | "api_settings" 
  | "voice_files" 
  | "branding"
  | "content" 
  | "notifications" 
  | "settings"
  | "feature_control";


export const AdminPanel: React.FC<AdminPanelProps> = ({
  adminUser,
  onClose,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Firebase Data
  const [allUsers, setAllUsers] = useState<AdminUserData[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [appContent, setAppContent] = useState<AppContentConfig | null>(null);
  const [aiSettings, setAiSettings] = useState<AdminAISettings>({
    defaultModel: "gemini-3.1-flash-lite",
    temperature: 0.7,
    fallbackEnabled: true,
    hasCustomKey: true,
    apiStatus: "online",
  });

  // User search & filters
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUserChats, setSelectedUserChats] = useState<AdminUserData | null>(null);

  // Notification form state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<AppNotification["type"]>("announcement");
  const [notifTarget, setNotifTarget] = useState<"all" | "user">("all");
  const [notifTargetUserId, setNotifTargetUserId] = useState<string>("");
  const [notifExpirationOption, setNotifExpirationOption] = useState<string>("none");
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);

  // User manual AI Limit Override state
  const [limitEditingUser, setLimitEditingUser] = useState<AdminUserData | null>(null);
  const [editLimitDaily, setEditLimitDaily] = useState<number>(25);
  const [editLimitIsUnlimited, setEditLimitIsUnlimited] = useState<boolean>(false);
  const [editLimitPkgId, setEditLimitPkgId] = useState<string>("");
  const [editLimitPkgName, setEditLimitPkgName] = useState<string>("");
  const [editLimitExpiresAt, setEditLimitExpiresAt] = useState<string>("");

  // AI Configuration State
  const [customKeyInput, setCustomKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    success: boolean;
    reply?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);
  const [saveAiSuccess, setSaveAiSuccess] = useState(false);

  // Security and custom settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettingsConfig | null>(null);
  const [adminTapCount, setAdminTapCount] = useState<number>(7);
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [securitySaveSuccess, setSecuritySaveSuccess] = useState(false);

  // Content Management Editor State
  const [helpItems, setHelpItems] = useState<Array<{ id: string; title: string; description: string }>>([
    {
      id: "1",
      title: "মডেল পরিবর্তন (Settings ⚙️)",
      description: "উপরের ⚙️ Settings থেকে আপনার প্রয়োজন অনুযায়ী Sajjat AI 3.1 Flash Lite, 3.8 Flash বা Flash Latest বেছে নিতে পারেন।",
    },
    {
      id: "2",
      title: "হিস্টোরি সার্চ (Search History)",
      description: "বাম পাশের ☰ মেনুর ভিতরে সার্চ বক্সে কি-ওয়ার্ড লিখে আপনার আগের যেকোনো কথোপকথন নিমিষেই খুঁজে বের করুন।",
    },
    {
      id: "3",
      title: "চ্যাট মুছুন (Clear Chat & Delete)",
      description: "মেনুর 🗑️ Clear Chat বোতাম দিয়ে সমস্ত হিস্টোরি ক্লিয়ার করতে পারেন অথবা সিঙ্গেল চ্যাট মুছতে পারেন।",
    },
    {
      id: "4",
      title: "ভয়েস ও ফাইল ইনপুট",
      description: "মাইক্রোফোন আইকনে ক্লিক করে বাংলায় কথা বলে প্রশ্ন করতে পারেন এবং ফাইল বা কোড আপলোড করতে পারেন।",
    },
  ]);
  const [privacyIntro, setPrivacyIntro] = useState("Sajjat AI ব্যবহারকারীর তথ্যের সম্পূর্ণ সুরক্ষা নিশ্চিত করে। Firebase Authentication ও Realtime Database-এর মাধ্যমে প্রতিটি ব্যবহারকারীর ডেটা সুরক্ষিত থাকে।");
  const [contentSavedMsg, setContentSavedMsg] = useState(false);

  // 1. Subscribe to Firebase Users
  useEffect(() => {
    const unsub = subscribeToAllUsers((users) => {
      setAllUsers(users);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Firebase Notifications
  useEffect(() => {
    const unsub = subscribeToNotifications((notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, []);

  // 3. Subscribe to App Content
  useEffect(() => {
    const unsub = subscribeToAppContent((content) => {
      if (content) {
        setAppContent(content);
        if (content.helpCenterItems) {
          const sanitized = content.helpCenterItems.map((item: any, i: number) => ({
            ...item,
            id: item.id || `help_seed_${i}_${Date.now()}`
          }));
          setHelpItems(sanitized);
        }
        if (content.privacyPolicyIntro) setPrivacyIntro(content.privacyPolicyIntro);
      }
    });
    return () => unsub();
  }, []);

  // 4. Subscribe to AI Settings
  useEffect(() => {
    const unsub = subscribeToAdminAISettings((settings) => {
      if (settings) {
        setAiSettings((prev) => ({ ...prev, ...settings }));
      }
    });
    return () => unsub();
  }, []);

  // 5. Subscribe to System Settings (Tap Count & Admin Password)
  useEffect(() => {
    const unsub = subscribeToSystemSettings((settings) => {
      if (settings) {
        setSystemSettings(settings);
        if (typeof settings.adminTapCount === "number") {
          setAdminTapCount(settings.adminTapCount);
        } else {
          setAdminTapCount(7);
        }
        if (settings.adminPassword) {
          setAdminPassword(settings.adminPassword);
        } else {
          setAdminPassword("");
        }
      }
    });
    return () => unsub();
  }, []);

  // Save custom admin tap count and password settings
  const handleSaveSecuritySettings = async () => {
    setIsSavingSecurity(true);
    setSecuritySaveSuccess(false);
    try {
      const payload = {
        adminTapCount,
        adminPassword: adminPassword.trim(),
      };

      await saveSystemSettings(payload);

      // Sync to server in-memory settings
      try {
        await fetch(`${getBackendBaseUrl()}/api/system-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn("Server system-settings sync failed:", err);
      }

      setSecuritySaveSuccess(true);
      setTimeout(() => setSecuritySaveSuccess(false), 3000);
    } catch (err: any) {
      alert("নিরাপত্তা সেটিংস সংরক্ষণে ত্রুটি: " + err.message);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleOpenLimitEdit = async (user: any) => {
    setLimitEditingUser(user);
    try {
      const limitRef = ref(database, `users/${user.uid}/ai_limit`);
      const snapshot = await get(limitRef);
      if (snapshot.exists()) {
        const val = snapshot.val();
        setEditLimitDaily(val.dailyLimit ?? 25);
        setEditLimitIsUnlimited(!!val.isUnlimited);
        setEditLimitPkgId(val.premiumPackageId ?? "");
        setEditLimitPkgName(val.premiumPackageName ?? "");
        setEditLimitExpiresAt(val.premiumExpiresAt ?? "");
      } else {
        setEditLimitDaily(25);
        setEditLimitIsUnlimited(false);
        setEditLimitPkgId("");
        setEditLimitPkgName("");
        setEditLimitExpiresAt("");
      }
    } catch (err) {
      console.warn("Failed to fetch user limit:", err);
      setEditLimitDaily(25);
      setEditLimitIsUnlimited(false);
      setEditLimitPkgId("");
      setEditLimitPkgName("");
      setEditLimitExpiresAt("");
    }
  };

  const handleSaveUserLimitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitEditingUser) return;
    try {
      const payload = {
        dailyLimit: Number(editLimitDaily),
        isUnlimited: editLimitIsUnlimited,
        premiumPackageId: editLimitPkgId || null,
        premiumPackageName: editLimitPkgName || null,
        premiumExpiresAt: editLimitExpiresAt || null
      };
      await updateUserAiLimit(limitEditingUser.uid, payload);
      
      if (editLimitIsUnlimited || editLimitPkgId) {
        await updateUserStatus(limitEditingUser.uid, "vip");
      } else {
        await updateUserStatus(limitEditingUser.uid, "active");
      }

      setLimitEditingUser(null);
      alert("ইউজারের এআই লিমিট ওভাররাইড সফলভাবে সংরক্ষিত হয়েছে!");
    } catch (err: any) {
      alert("লিমিট সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
    }
  };

  // Send Notification Handler
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setIsSendingNotif(true);
    setNotifSuccessMsg(null);

    try {
      let targetEmail = "";
      if (notifTarget === "user" && notifTargetUserId) {
        const targetUser = allUsers.find(u => u.uid === notifTargetUserId);
        if (targetUser) targetEmail = targetUser.email;
      }

      await createNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        target: notifTarget,
        targetUserId: notifTarget === "user" ? notifTargetUserId : undefined,
        targetUserEmail: notifTarget === "user" ? targetEmail : undefined,
        senderName: "Sajjat Mia (Admin)",
        expirationOption: notifExpirationOption,
      });

      setNotifSuccessMsg("নোটিফিকেশন সফলভাবে তৈরি ও পাঠানো হয়েছে!");
      setNotifTitle("");
      setNotifMessage("");
      setTimeout(() => setNotifSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to send notification:", err);
      alert("নোটিফিকেশন পাঠানো যায়নি: " + err.message);
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string) => {
    if (window.confirm("আপনি কি নিশ্চিত এই নোটিফিকেশনটি মুছে ফেলতে চান?")) {
      await deleteNotification(id);
    }
  };

  // Test AI Connection Handler
  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);

    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/admin/test-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: customKeyInput.trim() || undefined,
          model: aiSettings.defaultModel,
        }),
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch (err: any) {
      setAiTestResult({
        success: false,
        error: err?.message || "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।",
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  // Save AI Settings Handler
  const handleSaveAiSettings = async () => {
    try {
      // If custom key entered, update server memory
      if (customKeyInput.trim()) {
        await fetch(`${getBackendBaseUrl()}/api/admin/set-key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: customKeyInput.trim() }),
        });
      }

      const updatedSettings: AdminAISettings = {
        ...aiSettings,
        hasCustomKey: true,
        lastTestedAt: new Date().toISOString(),
        apiStatus: "online",
      };

      await saveAdminAISettings(updatedSettings);
      setSaveAiSuccess(true);
      setTimeout(() => setSaveAiSuccess(false), 3000);
    } catch (err: any) {
      alert("AI সেটিংস সংরক্ষণে ত্রুটি: " + err.message);
    }
  };

  // Save Content Handler
  const handleSaveContent = async () => {
    try {
      const payload: AppContentConfig = {
        helpCenterIntro: "Sajjat AI ব্যবহারের নিয়ম ও গাইডলাইন",
        helpCenterItems: helpItems,
        privacyPolicyIntro: privacyIntro,
      };
      await saveAppContent(payload);
      setContentSavedMsg(true);
      setTimeout(() => setContentSavedMsg(false), 3000);
    } catch (err: any) {
      alert("কন্টেন্ট সংরক্ষণে ত্রুটি: " + err.message);
    }
  };

  // Filtered users
  const filteredUsers = allUsers.filter((u) => {
    const matchSearch =
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.uid.toLowerCase().includes(userSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalUsers = allUsers.length;
  const activeTodayCount = allUsers.filter(u => {
    try {
      const last = new Date(u.lastLoginAt).getTime();
      return Date.now() - last < 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }).length;
  const totalChatSessions = allUsers.reduce((sum, u) => sum + (u.chatCount || 0), 0);
  const totalMessagesStored = allUsers.reduce((sum, u) => sum + (u.totalMessages || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-text">
      {/* Top Admin Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Sajjat AI Admin Panel
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>লগইনকৃত:</span>
                <span className="text-cyan-400 font-semibold">{adminUser.displayName}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">{adminUser.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 border border-rose-500/30 transition-all active:scale-95 cursor-pointer"
            title="Admin Session নিরাপদভাবে Logout করে মূল Sajjat AI চ্যাটে ফিরে যান"
          >
            <LogOut className="w-4 h-4 text-white shrink-0" />
            <span className="hidden sm:inline">🚪 Logout / Admin থেকে বের হন</span>
            <span className="sm:hidden inline">🚪 Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed md:static inset-y-16 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)]">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              প্রধান নিয়ন্ত্রণ প্যানেল
            </div>

            <button
              onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>📊 ড্যাশবোর্ড (Dashboard)</span>
            </button>

            <button
              onClick={() => { setActiveTab("users"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>👥 ইউজার তালিকা</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 font-mono">
                {totalUsers}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("chats"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "chats"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 text-blue-400" />
              <span>💬 চ্যাট ম্যানেজমেন্ট</span>
            </button>

            <button
              onClick={() => { setActiveTab("books"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "books"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm">📚</span>
                <span>Book / PDF Library</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                New
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("limits_packages"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "limits_packages"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>💎 AI লিমিট ও প্যাকেজ</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab("purchase_requests"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "purchase_requests"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>💸 পারচেজ রিকোয়েস্ট</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab("api_settings"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "api_settings"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 shrink-0 text-purple-400" />
                <span>⚡ API Configuration</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                9 Providers
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("ai_control"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "ai_control"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Bot className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>🤖 AI মডেল কন্ট্রোল</span>
            </button>

            <button
              onClick={() => { setActiveTab("voice_files"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "voice_files"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 shrink-0 text-teal-400" />
                <span>🎙️ লাইভ ভয়েস ও ছবি তৈরি</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Live Call & Art
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("branding"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "branding"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 shrink-0 text-purple-400" />
                <span>🎨 ডিজাইন, কালার ও নাম</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                AI Branding
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("notifications"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "notifications"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0 text-amber-400" />
                <span>🔔 নোটিফিকেশন</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 font-mono">
                {notifications.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("content"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "content"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FileEdit className="w-4 h-4 shrink-0 text-rose-400" />
              <span>📝 হেল্প ও প্রাইভেসি</span>
            </button>

            <button
              onClick={() => { setActiveTab("feature_control"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "feature_control"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>🔘 ফিচার কন্ট্রোল</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Master Switch
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-zinc-400" />
              <span>⚙️ সিস্টেম সেটিংস</span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Firebase RTDB</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                sajjat-ai-default-rtdb
              </p>
              <span className="inline-block text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                ✓ Connected
              </span>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>🚪 Admin থেকে বের হন</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-xs"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Mobile Horizontal Quick-Tabs Bar */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "dashboard"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>📊 ড্যাশবোর্ড</span>
              </button>

              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "users"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>👥 ইউজার ম্যানেজমেন্ট</span>
              </button>

              <button
                onClick={() => setActiveTab("books")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "books"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm"
                    : "bg-slate-900 text-amber-300 border border-amber-500/30"
                }`}
              >
                <span className="text-xs">📚</span>
                <span>Book / PDF Library</span>
              </button>

              <button
                onClick={() => setActiveTab("limits_packages")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "limits_packages"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>💎 AI লিমিট</span>
              </button>

              <button
                onClick={() => setActiveTab("purchase_requests")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "purchase_requests"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>💸 পেমেন্ট রিকোয়েস্ট</span>
              </button>

              <button
                onClick={() => setActiveTab("chats")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "chats"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>💬 চ্যাট</span>
              </button>

              <button
                onClick={() => setActiveTab("api_settings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "api_settings"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>🔑 API Settings</span>
              </button>

              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "notifications"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>🔔 নোটিফিকেশন</span>
              </button>
            </div>

            {/* TAB 1: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Sajjat AI অ্যাডমিন ড্যাশবোর্ড
                    </h2>
                    <p className="text-xs text-slate-400">
                      রিয়েলটাইম পরিসংখ্যান, ইউজার ট্র্যাকিং এবং এআই কার্যক্রম পর্যবেক্ষণ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
                      📅 {new Date().toLocaleDateString("bn-BD")}
                    </span>
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Users */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">মোট নিবন্ধিত ইউজার</p>
                      <h3 className="text-2xl font-black text-white mt-0.5">{totalUsers} জন</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Firebase Realtime Database</span>
                    </div>
                  </div>

                  {/* Active Users */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">সাম্প্রতিক সক্রিয় ইউজার (২৪ ঘণ্টা)</p>
                      <h3 className="text-2xl font-black text-white mt-0.5">{activeTodayCount} জন</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>সক্রিয়তা ট্র্যাকিং</span>
                    </div>
                  </div>

                  {/* Total Chat Sessions */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">সংরক্ষিত চ্যাট সেশন</p>
                      <h3 className="text-2xl font-black text-white mt-0.5">{totalChatSessions} টি</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-400">
                      <span>মোট মেসেজ: {totalMessagesStored} টি</span>
                    </div>
                  </div>

                  {/* AI Status */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">AI ইঞ্জিন স্ট্যাটাস</p>
                      <h3 className="text-2xl font-black text-emerald-400 mt-0.5">Active ✓</h3>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      মডেল: <strong className="text-white">{aiSettings.defaultModel}</strong>
                    </div>
                  </div>
                </div>

                {/* Grid: Recent Users & Recent Notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Users List (2 columns) */}
                  <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">সর্বশেষ নিবন্ধিত ইউজারগণ</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab("users")}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        সকল ইউজার দেখুন <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {allUsers.slice(0, 5).map((user, uIdx) => (
                        <div
                          key={user.uid ? `recent_user_${user.uid}_${uIdx}` : `recent_user_idx_${uIdx}`}
                          className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {user.displayName}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                              {user.chatCount || 0} টি চ্যাট
                            </span>
                            <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                              {new Date(user.createdAt).toLocaleDateString("bn-BD")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI & Notification Quick Widget */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">সর্বশেষ নোটিফিকেশন</h3>
                      </div>

                      <div className="mt-3 space-y-2.5">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-6">কোনো নোটিফিকেশন নেই</p>
                        ) : (
                          notifications.slice(0, 3).map((n, nIdx) => (
                            <div key={n.id ? `recent_n_${n.id}` : `recent_n_idx_${nIdx}`} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-indigo-400 font-semibold">{n.title}</span>
                                <span className="text-slate-500">
                                  {new Date(n.createdAt).toLocaleDateString("bn-BD")}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 line-clamp-2">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("notifications")}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 mt-4 cursor-pointer"
                    >
                      + নতুন নোটিফিকেশন পাঠান
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USER MANAGEMENT */}
            {activeTab === "users" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      ইউজার ম্যানেজমেন্ট (User Management)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Firebase-এ সংরক্ষিত সকল ব্যবহারকারীর তথ্য ও চ্যাট হিস্টোরি পর্যবেক্ষণ
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 w-fit">
                    মোট নিবন্ধিত: {allUsers.length} জন
                  </span>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="নাম, ইমেইল বা UID দিয়ে সার্চ করুন..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 pl-10 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-2xl px-3 py-2.5 outline-none"
                  >
                    <option value="all">সব স্ট্যাটাস (All)</option>
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Users Table */}
                <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-4">ইউজার (User)</th>
                          <th className="p-4">ইমেইল (Email)</th>
                          <th className="p-4">রেজিস্ট্রেশন তারিখ</th>
                          <th className="p-4">সর্বশেষ লগইন</th>
                          <th className="p-4">চ্যাট সংখ্যা</th>
                          <th className="p-4">স্ট্যাটাস</th>
                          <th className="p-4 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                              কোনো ইউজার পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user, uIdx) => (
                            <tr key={user.uid ? `user_${user.uid}_${uIdx}` : `user_idx_${uIdx}`} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                    {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white leading-tight">{user.displayName}</p>
                                    <p className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                                      {user.uid}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4 font-mono text-slate-300">{user.email}</td>

                              <td className="p-4 text-[11px] text-slate-400">
                                {new Date(user.createdAt).toLocaleDateString("bn-BD", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>

                              <td className="p-4 text-[11px] text-slate-400">
                                {new Date(user.lastLoginAt).toLocaleDateString("bn-BD", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>

                              <td className="p-4">
                                <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-indigo-400 font-bold text-[11px]">
                                  {user.chatCount || 0} সেশন
                                </span>
                              </td>

                              <td className="p-4">
                                <select
                                  value={user.status || "active"}
                                  onChange={(e) => updateUserStatus(user.uid, e.target.value as any)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                                    user.status === "vip"
                                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                      : user.status === "suspended"
                                      ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  }`}
                                >
                                  <option value="active">Active</option>
                                  <option value="vip">VIP</option>
                                  <option value="suspended">Suspended</option>
                                </select>
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedUserChats(user)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-white transition-colors cursor-pointer"
                                    title="চ্যাট হিস্টোরি দেখুন"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenLimitEdit(user)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-colors cursor-pointer"
                                    title="এআই লিমিট ও প্রিমিয়াম ওভাররাইড"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`আপনি কি "${user.displayName}" এর অ্যাকাউন্ট ও চ্যাট ডেটা মুছে ফেলতে চান?`)) {
                                        await deleteUserData(user.uid);
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                    title="ইউজার ডিলিট করুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Chat History Modal Viewer */}
                {selectedUserChats && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-400" />
                            {selectedUserChats.displayName} - এর চ্যাট হিস্টোরি
                          </h3>
                          <p className="text-xs text-slate-400">{selectedUserChats.email}</p>
                        </div>
                        <button
                          onClick={() => setSelectedUserChats(null)}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                        {!selectedUserChats.chats || Object.keys(selectedUserChats.chats).length === 0 ? (
                          <div className="py-12 text-center text-slate-500">
                            এই ইউজারের কোনো সংরক্ষিত চ্যাট সেশন নেই।
                          </div>
                        ) : (
                          Object.values(selectedUserChats.chats).map((session, sIdx) => (
                            <div key={session.id ? `adm_sess_${session.id}` : `adm_sess_idx_${sIdx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-indigo-300 pb-2 border-b border-slate-800/60">
                                <span>{session.title || "নামবিহীন সেশন"}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(session.updatedAt || session.createdAt).toLocaleString("bn-BD")}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {session.messages?.map((msg, mIdx) => (
                                  <div
                                    key={msg.id ? `adm_sess_msg_${msg.id}` : `adm_sess_msg_idx_${mIdx}`}
                                    className={`p-2.5 rounded-xl text-xs ${
                                      msg.sender === "user"
                                        ? "bg-slate-900 text-slate-200 border border-slate-800"
                                        : "bg-indigo-950/40 text-indigo-200 border border-indigo-900/40"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                      <span className="font-semibold">{msg.sender === "user" ? "👤 ইউজার" : "🤖 Sajjat AI"}</span>
                                      <span>{new Date(msg.timestamp).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AI CONTROL */}
            {activeTab === "ai_control" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    🤖 AI কন্ট্রোল ও ইঞ্জিন ম্যানেজমেন্ট
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sajjat AI-এর জন্য Gemini মডেল সিলেকশন, কাস্টম API Key এবং সিস্টেম ইন্টেলিজেন্স নিয়ন্ত্রণ
                  </p>
                </div>

                {saveAiSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>AI সেটিংস সফলভাবে Firebase এবং সার্ভার মেমরিতে সংরক্ষিত হয়েছে!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Model & Key Configuration */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      ডিফল্ট মডেল নির্বাচন (Default Model)
                    </h3>

                    <div className="space-y-2.5">
                      {AVAILABLE_MODELS.map((model) => (
                        <div
                          key={model.id}
                          onClick={() => setAiSettings((prev) => ({ ...prev, defaultModel: model.id }))}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            aiSettings.defaultModel === model.id
                              ? "bg-slate-950 border-indigo-500 ring-1 ring-indigo-500/30"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{model.name}</span>
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{model.bestFor}</p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            aiSettings.defaultModel === model.id
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-slate-700"
                          }`}>
                            {aiSettings.defaultModel === model.id && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* API Key Box */}
                    <div className="pt-4 border-t border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        Gemini API Key (Server-Side Secret)
                      </label>
                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          value={customKeyInput}
                          onChange={(e) => setCustomKeyInput(e.target.value)}
                          placeholder="নতুন Gemini API Key লিখুন (e.g. AIzaSy...)"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 pr-12 text-xs text-slate-100 placeholder-slate-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(prev => !prev)}
                          className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          {showKey ? "লুকান" : "দেখান"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        * API key শুধুমাত্র ব্যাকএন্ড সার্ভারে সংরক্ষিত থাকে এবং কখনো ব্রাউজার/ক্লায়েন্টে এক্সপোজ হয় না।
                      </p>
                    </div>

                    {/* Temperature Slider */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300">AI Temperature (সৃজনশীলতা)</span>
                        <span className="text-indigo-400 font-mono">{aiSettings.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={aiSettings.temperature}
                        onChange={(e) => setAiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full accent-indigo-500"
                      />
                    </div>

                    {/* Fallback Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                      <div>
                        <p className="text-xs font-bold text-white">স্মার্ট ফলব্যাক উত্তর (Smart Fallback)</p>
                        <p className="text-[10px] text-slate-400">ইন্টারনেট বা কোটা ত্রুটিতেও তাৎক্ষণিক উত্তর দেবে</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiSettings(prev => ({ ...prev, fallbackEnabled: !prev.fallbackEnabled }))}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                          aiSettings.fallbackEnabled ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          aiSettings.fallbackEnabled ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    <button
                      onClick={handleSaveAiSettings}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>AI কনফিগারেশন সংরক্ষণ করুন</span>
                    </button>
                  </div>

                  {/* Right: AI Connectivity Test & Status */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-sm font-bold text-white">AI কানেকশন টেস্ট টুল</h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Server Live
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        Gemini API এবং Sajjat AI মডেলের লাইভ কানেকশন ও রেসপন্স স্পিড পরীক্ষা করার জন্য নিচের টেস্ট বাটনে চাপ দিন।
                      </p>

                      <button
                        type="button"
                        onClick={handleTestAi}
                        disabled={isTestingAi}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer disabled:opacity-60"
                      >
                        {isTestingAi ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>AI সংযোগ পরীক্ষা করা হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Test Live Gemini Connection</span>
                          </>
                        )}
                      </button>

                      {/* Test Output Box */}
                      {aiTestResult && (
                        <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
                          aiTestResult.success
                            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                            : "bg-rose-950/30 border-rose-500/30 text-rose-200"
                        }`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              {aiTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                              {aiTestResult.success ? "AI সংযোগ সফল!" : "AI সংযোগ ব্যর্থ"}
                            </span>
                            {aiTestResult.latencyMs && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 text-cyan-300">
                                {aiTestResult.latencyMs} ms
                              </span>
                            )}
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300">
                            {aiTestResult.reply || aiTestResult.error}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-slate-400 space-y-1">
                      <p className="font-semibold text-indigo-300">নিরাপত্তা ও পলিসি:</p>
                      <p>সব API কল সার্ভার প্রক্সির মাধ্যমে ফিল্টার হয় এবং ব্যবহারকারীর পাসওয়ার্ড বা প্রাইভেট তথ্য আলাদা থাকে।</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CONTENT MANAGEMENT */}
            {activeTab === "content" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      📝 কন্টেন্ট ম্যানেজমেন্ট (Content Management)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Help Center এবং Privacy Policy-এর তথ্য পরিবর্তন করুন (User Panel-এ লাইভ দেখাবে)
                    </p>
                  </div>
                </div>

                {contentSavedMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>কন্টেন্ট সফলভাবে Firebase-এ সংরক্ষিত হয়েছে এবং সকল ইউজারের জন্য লাইভ হয়েছে!</span>
                  </div>
                )}

                {/* Help Center Editor */}
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">Help Center আইটেমসমূহ</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHelpItems(prev => [...prev, { id: String(Date.now()), title: "নতুন ফিচার", description: "বিস্তারিত বর্ণনা লিখুন..." }])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> আইটেম যোগ করুন
                    </button>
                  </div>

                  <div className="space-y-3">
                    {helpItems.map((item, idx) => (
                      <div key={item.id ? `adm_help_${item.id}` : `adm_help_idx_${idx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...helpItems];
                              updated[idx].title = e.target.value;
                              setHelpItems(updated);
                            }}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold w-full max-w-sm outline-none focus:border-indigo-500"
                            placeholder="শিরোনাম"
                          />
                          <button
                            type="button"
                            onClick={() => setHelpItems(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...helpItems];
                            updated[idx].description = e.target.value;
                            setHelpItems(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 outline-none focus:border-indigo-500 resize-none"
                          placeholder="বর্ণনা"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Privacy Policy Editor */}
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Privacy Policy প্রারম্ভিক বার্তা</h3>
                  </div>
                  <textarea
                    rows={4}
                    value={privacyIntro}
                    onChange={(e) => setPrivacyIntro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveContent}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>কন্টেন্ট Firebase-এ সংরক্ষণ করুন (User Panel-এ লাইভ আপডেট)</span>
                </button>
              </div>
            )}

            {/* TAB 5: NOTIFICATION SYSTEM */}
            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    🔔 নোটিফিকেশন সিস্টেম (Notifications)
                  </h2>
                  <p className="text-xs text-slate-400">
                    ব্যবহারকারীদের কাছে রিয়েলটাইম নোটিফিকেশন পাঠান এবং পূর্বের বার্তাগুলো ম্যানেজ করুন
                  </p>
                </div>

                {notifSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{notifSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Compose Form */}
                  <form onSubmit={handleSendNotification} className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                      <Send className="w-4 h-4 text-indigo-400" />
                      নতুন নোটিফিকেশন তৈরি করুন
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        শিরোনাম (Title)
                      </label>
                      <input
                        type="text"
                        required
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="যেমন: Sajjat AI-এর নতুন আপডেট প্রকাশ!"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        বার্তা (Message Body)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={notifMessage}
                        onChange={(e) => setNotifMessage(e.target.value)}
                        placeholder="নোটিফিকেশনের বিস্তারিত বার্তা লিখুন..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          ধরন (Type)
                        </label>
                        <select
                          value={notifType}
                          onChange={(e) => setNotifType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-2xl p-2.5 outline-none"
                        >
                          <option value="announcement">📢 সাধারণ ঘোষণা</option>
                          <option value="update">🚀 সিস্টেম আপডেট</option>
                          <option value="feature">✨ নতুন ফিচার</option>
                          <option value="alert">⚠️ সতর্কতা</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          প্রাপক (Audience)
                        </label>
                        <select
                          value={notifTarget}
                          onChange={(e) => setNotifTarget(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-2xl p-2.5 outline-none"
                        >
                          <option value="all">🌐 সকল ব্যবহারকারী</option>
                          <option value="user">👤 নির্দিষ্ট ইউজার</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          মেয়াদ (Expiration)
                        </label>
                        <select
                          value={notifExpirationOption}
                          onChange={(e) => setNotifExpirationOption(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-2xl p-2.5 outline-none"
                        >
                          <option value="none">♾️ কোনো মেয়াদ নেই</option>
                          <option value="1d">⏳ ১ দিন (২৪ ঘণ্টা)</option>
                          <option value="3d">⏳ ৩ দিন (৭২ ঘণ্টা)</option>
                          <option value="7d">⏳ ৭ দিন (১ সপ্তাহ)</option>
                          <option value="30d">⏳ ৩০ দিন (১ মাস)</option>
                        </select>
                      </div>
                    </div>

                    {notifTarget === "user" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          নির্দিষ্ট ইউজার নির্বাচন করুন
                        </label>
                        <select
                          value={notifTargetUserId}
                          onChange={(e) => setNotifTargetUserId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-2xl p-2.5 outline-none"
                        >
                          <option value="">-- ইউজার বেছে নিন --</option>
                          {allUsers.map((u, uIdx) => (
                            <option key={u.uid ? `adm_sel_u_${u.uid}` : `adm_sel_u_${uIdx}`} value={u.uid}>
                              {u.displayName} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingNotif}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSendingNotif ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>পাঠানো হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>নোটিফিকেশন পাঠান (Send to Firebase)</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Right: Sent Notifications History */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">প্রেরিত নোটিফিকেশন হিস্টোরি</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {notifications.length} টি
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-10">কোনো নোটিফিকেশন হিস্টোরি নেই</p>
                      ) : (
                        notifications.map((notif, nIdx) => {
                          const readCount = notif.readBy ? Object.keys(notif.readBy).length : 0;
                          const isExpired = notif.expiresAt ? Date.now() > notif.expiresAt : false;
                          let expLabel = "♾️ মেয়াদহীন";
                          if (notif.expirationOption === "1d") expLabel = "⏳ ১ দিন";
                          else if (notif.expirationOption === "3d") expLabel = "⏳ ৩ দিন";
                          else if (notif.expirationOption === "7d") expLabel = "⏳ ৭ দিন";
                          else if (notif.expirationOption === "30d") expLabel = "⏳ ৩০ দিন";

                          return (
                            <div key={notif.id ? `adm_notif_${notif.id}_${nIdx}` : `adm_notif_idx_${nIdx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative group">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-cyan-400 border border-slate-800">
                                      {notif.target === "all" ? "🌐 All Users" : `👤 ${notif.targetUserEmail || "Specific User"}`}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isExpired ? "bg-rose-950/60 text-rose-400 border-rose-800/50" : "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"}`}>
                                      {isExpired ? "🔴 Expired" : "🟢 Active"}
                                    </span>
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                                      {expLabel}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-white mt-1">{notif.title}</h4>
                                </div>
                                <button
                                  onClick={() => handleDeleteNotification(notif.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-all flex items-center gap-1 text-[10px] font-medium"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span className="hidden sm:inline text-rose-400">ডিলিট</span>
                                </button>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed">{notif.message}</p>

                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                                <span>{new Date(typeof notif.createdAt === 'number' ? notif.createdAt : notif.createdAt).toLocaleDateString("bn-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                <span className="text-emerald-400 font-semibold">{readCount} জন পঠিত</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CHAT MANAGEMENT */}
            {activeTab === "chats" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminChatManager users={allUsers} />
              </div>
            )}

            {/* TAB: BOOK / PDF LIBRARY */}
            {activeTab === "books" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminBookLibrary />
              </div>
            )}

            {/* TAB: LIMITS & PACKAGES */}
            {activeTab === "limits_packages" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminLimitsAndPackages />
              </div>
            )}

            {/* TAB: PURCHASE REQUESTS */}
            {activeTab === "purchase_requests" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminPurchaseRequests />
              </div>
            )}

            {/* TAB: API CONFIGURATION (9 PROVIDERS) */}
            {activeTab === "api_settings" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminApiProviders />
              </div>
            )}

            {/* TAB: VOICE & FILE UPLOAD CONTROL */}
            {activeTab === "voice_files" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminVoiceAndFiles />
              </div>
            )}

            {/* TAB: AI BRANDING, DESIGN & COLOR CUSTOMIZATION */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminBranding />
              </div>
            )}

            {/* TAB 6: SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    ⚙️ সিস্টেম ও অ্যাডমিন সেটিংস
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sajjat AI এর কোর কনফিগারেশন, ডেটাবেজ ও নিরাপত্তা নীতিমালা
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Database Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                      <Database className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">Firebase Realtime Database</h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400">Project ID:</span>
                        <span className="font-mono text-cyan-400">sajjat-ai</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400">Database URL:</span>
                        <span className="font-mono text-indigo-300 text-[10px] truncate max-w-[200px]">sajjat-ai-default-rtdb</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400">Auth Engine:</span>
                        <span className="text-emerald-400 font-bold">Firebase Auth (SHA-256)</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Info Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">অ্যাডমিন প্রোফাইল</h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400">অ্যাডমিন নাম:</span>
                        <span className="font-bold text-white">Sajjat Mia</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400">ইমেইল:</span>
                        <span className="font-mono text-cyan-400">sajjatmia17@gmail.com</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400">রোল:</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">Super Administrator</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Access & Security Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-indigo-500/30 space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">অ্যাডমিন অ্যাক্সেস ও নিরাপত্তা (Admin Access & Security)</h3>
                      </div>
                      {securitySaveSuccess && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          ✓ সংরক্ষিত হয়েছে
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tap Count Input */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          লোগো টাচ কাউন্ট (Required Taps to open Login)
                        </label>
                        <select
                          value={adminTapCount}
                          onChange={(e) => setAdminTapCount(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-2.5 text-xs text-white outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20].map((t) => (
                            <option key={`tap_count_${t}`} value={t}>
                              {t} বার টাচ করলে অ্যাডমিন লগইন উইন্ডো আসবে {t === 7 ? "(ডিফল্ট)" : ""}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500">
                          হেডারে থাকা লোগোতে কত বার টাচ করলে অ্যাডমিন লগইন প্রম্পট চালু হবে তা নির্বাচন করুন।
                        </p>
                      </div>

                      {/* Password Input */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          অ্যাডমিন প্যানেল পাসওয়ার্ড (Admin Access Password)
                        </label>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? "text" : "password"}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="নতুন অ্যাডমিন পাসওয়ার্ড দিন (ফাঁকা রাখলে ডিফল্ট মাস্টার পিন কাজ করবে)"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-2xl px-4 py-2.5 pr-10 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword((prev) => !prev)}
                            className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          >
                            {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          আপনার নিজের একটি কাস্টম অ্যাডমিন পাসওয়ার্ড সেট করতে পারেন। ফাঁকা রাখলে ডিফল্ট পিন (যেমন ১৭১১) কাজ করবে।
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveSecuritySettings}
                        disabled={isSavingSecurity}
                        className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isSavingSecurity ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>সংরক্ষণ হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>নিরাপত্তা সেটিংস সেভ করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 15: FEATURE CONTROL */}
            {activeTab === "feature_control" && (
              <div className="animate-in fade-in duration-150">
                <AdminFeatureControl />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Manual Limit/Premium Override Modal */}
      {limitEditingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>ইউজার এআই লিমিট ও প্রিমিয়াম ওভাররাইড</span>
              </h3>
              <button 
                onClick={() => setLimitEditingUser(null)} 
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <p className="font-bold text-white">{limitEditingUser.displayName}</p>
              <p className="text-[10px] text-slate-400 font-mono">{limitEditingUser.email}</p>
              <p className="text-[9px] text-slate-500 font-mono">UID: {limitEditingUser.uid}</p>
            </div>

            <form onSubmit={handleSaveUserLimitOverride} className="space-y-4 text-xs">
              {/* Daily Limit Input */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">দৈনিক মেসেজ সংখ্যা (Daily Message Limit)</label>
                <input 
                  type="number"
                  required
                  min={0}
                  value={editLimitDaily}
                  onChange={(e) => setEditLimitDaily(Number(e.target.value))}
                  disabled={editLimitIsUnlimited}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-white outline-none disabled:opacity-40"
                />
              </div>

              {/* Is Unlimited Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300">আনলিমিটেড এআই উত্তর (Unlimited AI Answers)</span>
                <button
                  type="button"
                  onClick={() => setEditLimitIsUnlimited(prev => !prev)}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    editLimitIsUnlimited ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    editLimitIsUnlimited ? "translate-x-5.5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Premium Package ID (Optional) */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">প্রিমিয়াম প্যাকেজ আইডি (ঐচ্ছিক)</label>
                <input 
                  type="text"
                  value={editLimitPkgId}
                  onChange={(e) => setEditLimitPkgId(e.target.value)}
                  placeholder="pkg_1m (ফাঁকা রাখলে সাধারণ ইউজার)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-white outline-none"
                />
              </div>

              {/* Premium Package Name (Optional) */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">প্রিমিয়াম প্যাকেজ নাম (ঐচ্ছিক)</label>
                <input 
                  type="text"
                  value={editLimitPkgName}
                  onChange={(e) => setEditLimitPkgName(e.target.value)}
                  placeholder="যেমন: ১ মাস প্রিমিয়াম প্যাকেজ"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-white outline-none"
                />
              </div>

              {/* Premium Expires At (Optional) */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">প্যাকেজ মেয়াদ শেষ হওয়ার তারিখ (ঐচ্ছিক - ISO format)</label>
                <input 
                  type="text"
                  value={editLimitExpiresAt}
                  onChange={(e) => setEditLimitExpiresAt(e.target.value)}
                  placeholder="যেমন: 2026-10-21T20:59:30.000Z"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-white font-mono outline-none"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>লিমিট ওভাররাইড সেভ করুন</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
