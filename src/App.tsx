import React, { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ChatInput } from "./components/ChatInput";
import { AuthModal } from "./components/AuthModal";
import { ProfileModal } from "./components/ProfileModal";
import { PrivacyModal } from "./components/PrivacyModal";
import { SettingsModal } from "./components/SettingsModal";
import { HelpModal } from "./components/HelpModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { AdminPanel } from "./components/AdminPanel";
import { NotificationsModal } from "./components/NotificationsModal";
import { BookViewerModal } from "./components/BookViewerModal";
import { ImageGeneratorModal } from "./components/ImageGeneratorModal";
import { HtmlViewerModal } from "./components/HtmlViewerModal";
import { LiveVoiceModal } from "./components/LiveVoiceModal";
import { 
  UserProfile, 
  ChatSession, 
  ChatMessage, 
  ModalType, 
  AttachedFile, 
  GeminiModelId,
  AppNotification,
  AppContentConfig,
  SystemSettingsConfig,
  UserAiLimit,
  PremiumPackage,
  PurchaseRequest
} from "./types";
import { 
  auth, 
  getUserProfile, 
  syncUserProfileToDatabase,
  getOrCreateGuestId,
  logoutUser, 
  saveUserChatSession, 
  subscribeToUserChats, 
  deleteUserChatSession,
  subscribeToNotifications,
  subscribeToAppContent,
  subscribeToAdminAISettings,
  subscribeToBooks,
  subscribeToSystemSettings,
  isAdmin,
  subscribeToUserAiLimit,
  incrementUserAiLimit,
  submitPurchaseRequest,
  subscribeToPackages,
  subscribeToPurchaseRequests
} from "./firebase";
import { getPersonalAnswer, generateClientFallbackReply } from "./knowledge";
import { sendChatMessage } from "./api";
import { 
  safeGetGuestSessions, 
  safeSaveGuestSessions, 
  safeClearGuestSessions 
} from "./storage";
import { searchBooks, isBookSearchQuery, formatBookSearchResponse } from "./utils/bookSearch";
import { BookItem } from "./types";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>("none");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Admin Panel State
  const [isAdminViewOpen, setIsAdminViewOpen] = useState<boolean>(false);

  // Live Firebase Notifications & Content
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [appContent, setAppContent] = useState<AppContentConfig | null>(null);
  const [availableBooks, setAvailableBooks] = useState<BookItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsConfig | null>(null);

  // Sajjat AI Model Preference (uses real gemini models under the hood, default: gemini-3.8-flash)
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(() => {
    try {
      const saved = localStorage.getItem("sajjat_ai_model");
      if (saved && (saved === "gemini-3.1-flash-lite" || saved === "gemini-3.8-flash" || saved === "gemini-flash-latest")) {
        return saved as GeminiModelId;
      }
    } catch (e) {}
    return "gemini-3.8-flash";
  });

  // Modal states for deleting chats
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: "single" | "all" | "active";
    sessionId?: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: "single",
    title: "",
    description: "",
  });

  const [lastUserMessage, setLastUserMessage] = useState<{
    text: string;
    attachedFile?: AttachedFile;
  } | null>(null);

  // AI limit and premium status states
  const [userLimit, setUserLimit] = useState<UserAiLimit | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [guestUsedCount, setGuestUsedCount] = useState<number>(0);

  // Initialize and validate guest used count
  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem("sajjat_ai_guest_date");
      if (savedDate !== today) {
        localStorage.setItem("sajjat_ai_guest_date", today);
        localStorage.setItem("sajjat_ai_guest_used_count", "0");
        setGuestUsedCount(0);
      } else {
        const count = Number(localStorage.getItem("sajjat_ai_guest_used_count") || "0");
        setGuestUsedCount(count);
      }
    } catch (err) {}
  }, []);

  // Subscribe to user's limits
  useEffect(() => {
    if (user?.uid) {
      const unsub = subscribeToUserAiLimit(user.uid, (limit) => {
        setUserLimit(limit);
      });
      return () => unsub();
    } else {
      setUserLimit(null);
    }
  }, [user?.uid]);

  // Persist model selection
  const handleSelectModel = useCallback((modelId: GeminiModelId) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem("sajjat_ai_model", modelId);
    } catch (e) {}
  }, []);

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        let activeProfile: UserProfile;
        if (profile) {
          activeProfile = profile;
        } else {
          activeProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
            photoURL: firebaseUser.photoURL || "",
            bio: "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          };
        }
        setUser(activeProfile);
        syncUserProfileToDatabase(activeProfile);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firebase RTDB Chat Sessions when user logs in
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToUserChats(user.uid, (loadedSessions) => {
        setSessions(loadedSessions);
        if (loadedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(loadedSessions[0].id);
        }
      });
      return () => unsubscribe();
    } else {
      // Guest local storage session safely retrieved
      const guestSessions = safeGetGuestSessions();
      setSessions(guestSessions);
      if (guestSessions.length > 0 && !activeSessionId) {
        setActiveSessionId(guestSessions[0].id);
      } else if (guestSessions.length === 0) {
        setActiveSessionId(null);
      }
    }
  }, [user?.uid]);

  // 3. Subscribe to Realtime Notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifs) => {
      const activeNotifs = notifs.filter(n => !n.expiresAt || Date.now() <= n.expiresAt);
      setNotifications(activeNotifs);
    });
    return () => unsubscribe();
  }, []);

  // 4. Subscribe to App Content & AI Settings from Admin
  useEffect(() => {
    const unsubContent = subscribeToAppContent((content) => {
      if (content) setAppContent(content);
    });
    const unsubAi = subscribeToAdminAISettings((aiSettings) => {
      if (aiSettings?.defaultModel) {
        // Only set default if user hasn't chosen one
        const userExplicit = localStorage.getItem("sajjat_ai_model");
        if (!userExplicit) {
          setSelectedModel(aiSettings.defaultModel);
        }
      }
    });

    const unsubBooks = subscribeToBooks((booksList) => {
      setAvailableBooks(booksList || []);
    });

    const unsubSettings = subscribeToSystemSettings((settings) => {
      if (settings) {
        setSystemSettings(settings);
      }
    });

    return () => {
      unsubContent();
      unsubAi();
      unsubBooks();
      unsubSettings();
    };
  }, []);

  // Calculate unread notification count
  const unreadNotifCount = notifications.filter((notif) => {
    if (notif.target === "all") {
      if (!user) return true;
      return !notif.readBy || !notif.readBy[user.uid];
    }
    if (user && notif.target === "user") {
      const isTarget = notif.targetUserId === user.uid || notif.targetUserEmail?.toLowerCase() === user.email.toLowerCase();
      return isTarget && (!notif.readBy || !notif.readBy[user.uid]);
    }
    return false;
  }).length;

  // Helper to get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || (sessions.length > 0 && !activeSessionId ? sessions[0] : null);
  const activeMessages = activeSession ? activeSession.messages : [];

  // Create new Chat Session
  const handleNewChat = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: "নতুন কথোপকথন",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      const targetUid = user?.uid || getOrCreateGuestId();
      saveUserChatSession(targetUid, newSession);
      if (!user?.uid) {
        safeSaveGuestSessions(updated);
        syncUserProfileToDatabase({
          uid: targetUid,
          email: "guest@sajjat.ai",
          displayName: "গেস্ট ব্যবহারকারী (Guest)",
          bio: "অপ্রমাণিত/গেস্ট ব্যবহারকারী",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
      }
      return updated;
    });
    setActiveSessionId(newSessionId);
  }, [user?.uid]);

  // Request Delete single session from sidebar
  const promptDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = sessions.find((s) => s.id === sessionId);
    setDeleteModalState({
      isOpen: true,
      type: "single",
      sessionId,
      title: `"${target?.title || "এই চ্যাটটি"}" মুছে ফেলতে চান?`,
      description: "এই চ্যাটের সমস্ত বার্তা মুছে যাবে এবং এটি আর ফিরে পাওয়া যাবে না।",
    });
  }, [sessions]);

  // Request Clear All Sessions (🗑️ Clear Chat)
  const promptClearAllSessions = useCallback(() => {
    setDeleteModalState({
      isOpen: true,
      type: "all",
      title: "সব চ্যাট হিস্টোরি মুছে ফেলতে চান?",
      description: "আপনার সমস্ত সংরক্ষিত চ্যাট ও মেসেজ স্থায়ীভাবে মুছে যাবে।",
    });
  }, []);

  // Request Clear Active Chat
  const promptClearActiveChat = useCallback(() => {
    if (!activeSessionId) return;
    setDeleteModalState({
      isOpen: true,
      type: "active",
      sessionId: activeSessionId,
      title: "বর্তমান কথোপকথন মুছে ফেলবেন?",
      description: "বর্তমান চ্যাটের সব মেসেজ মুছে নতুন করে শুরু করা হবে।",
    });
  }, [activeSessionId]);

  // Execute Confirmed Delete
  const handleConfirmDelete = useCallback(() => {
    const targetUid = user?.uid || getOrCreateGuestId();
    if (deleteModalState.type === "single" && deleteModalState.sessionId) {
      const sId = deleteModalState.sessionId;
      deleteUserChatSession(targetUid, sId);
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sId);
        if (!user?.uid) safeSaveGuestSessions(updated);
        return updated;
      });
      if (activeSessionId === sId) {
        const remaining = sessions.filter((s) => s.id !== sId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } else if (deleteModalState.type === "all") {
      sessions.forEach((s) => deleteUserChatSession(targetUid, s.id));
      setSessions([]);
      setActiveSessionId(null);
      safeClearGuestSessions();
    } else if (deleteModalState.type === "active" && activeSessionId) {
      // Clear messages of current session
      const updated = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [], updatedAt: Date.now() };
        }
        return s;
      });
      setSessions(updated);
      const target = updated.find((s) => s.id === activeSessionId);
      if (target) saveUserChatSession(targetUid, target);
      if (!user?.uid) safeSaveGuestSessions(updated);
    }
  }, [deleteModalState, user?.uid, sessions, activeSessionId]);

  // Delete an individual message inside active chat
  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!activeSessionId) return;

    setSessions((prev) => {
      const targetUid = user?.uid || getOrCreateGuestId();
      const updated = prev.map((session) => {
        if (session.id === activeSessionId) {
          const newMessages = session.messages.filter((m) => m.id !== messageId);
          const updatedSession = { ...session, messages: newMessages, updatedAt: Date.now() };
          saveUserChatSession(targetUid, updatedSession);
          return updatedSession;
        }
        return session;
      });

      if (!user?.uid) {
        safeSaveGuestSessions(updated);
      }
      return updated;
    });
  }, [activeSessionId, user?.uid]);

  // Send Message Logic
  const handleSendMessage = async (
    text: string,
    attachedFile?: AttachedFile
  ) => {
    if (!text.trim() && !attachedFile) return;

    // Check limit system
    if (systemSettings?.aiLimitSystemEnabled) {
      if (user) {
        if (userLimit && !userLimit.isUnlimited) {
          const used = userLimit.usedCount || 0;
          const limit = userLimit.dailyLimit ?? 25;
          if (used >= limit) {
            setShowPremiumModal(true);
            alert(`আপনার দৈনিক এআই লিমিট (${limit} মেসেজ) শেষ হয়ে গেছে। দয়া করে প্রিমিয়াম প্যাকেজ অ্যাক্টিভ করুন!`);
            return;
          }
        }
      } else {
        if (guestUsedCount >= 5) {
          alert("অতিথি (Guest) হিসেবে আপনার দৈনিক ৫টি ফ্রি মেসেজের সীমা শেষ হয়ে গেছে! অনুগ্রহ করে ফ্রিতে আনলিমিটেড ব্যবহার করতে বা প্রিমিয়াম নিতে লগইন/রেজিস্ট্রেশন করুন।");
          setModalType("auth");
          return;
        }
      }
    }

    setLastUserMessage({ text, attachedFile });

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: "user",
      text,
      attachedFile,
      imageBase64: attachedFile?.isImage ? attachedFile.base64 : undefined,
      imageMimeType: attachedFile?.isImage ? attachedFile.type : undefined,
      timestamp: Date.now(),
      status: "sent",
    };

    // Ensure we have an active session ID
    let currentSessionId = activeSessionId;
    let targetSession = sessions.find((s) => s.id === currentSessionId);

    if (!targetSession) {
      currentSessionId = `session_${Date.now()}`;
      targetSession = {
        id: currentSessionId,
        title: text ? (text.length > 25 ? text.substring(0, 25) + "..." : text) : (attachedFile ? attachedFile.name : "নতুন চ্যাট"),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setActiveSessionId(currentSessionId);
    } else if (targetSession.messages.length === 0) {
      targetSession = {
        ...targetSession,
        title: text ? (text.length > 25 ? text.substring(0, 25) + "..." : text) : (attachedFile ? attachedFile.name : "নতুন চ্যাট"),
      };
    }

    // Add user message to session
    const updatedMessages = [...targetSession.messages, userMessage];
    const updatedSession: ChatSession = {
      ...targetSession,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    // Atomic update to sessions state
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      const list = exists
        ? prev.map((s) => (s.id === currentSessionId ? updatedSession : s))
        : [updatedSession, ...prev];
      const targetUid = user?.uid || getOrCreateGuestId();
      saveUserChatSession(targetUid, updatedSession);
      if (!user?.uid) {
        safeSaveGuestSessions(list);
        syncUserProfileToDatabase({
          uid: targetUid,
          email: "guest@sajjat.ai",
          displayName: "গেস্ট ব্যবহারকারী (Guest)",
          bio: "অপ্রমাণিত/গেস্ট ব্যবহারকারী",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
      }
      return list;
    });

    const finishWithBotMessage = (botMessage: ChatMessage) => {
      const finalMessages = [...updatedMessages, botMessage];
      const finalSession: ChatSession = {
        ...updatedSession,
        updatedAt: Date.now(),
        messages: finalMessages,
      };

      setSessions((prev) => {
        const exists = prev.some((s) => s.id === currentSessionId);
        const list = exists
          ? prev.map((s) => (s.id === currentSessionId ? finalSession : s))
          : [finalSession, ...prev];
        const targetUid = user?.uid || getOrCreateGuestId();
        saveUserChatSession(targetUid, finalSession);
        if (!user?.uid) {
          safeSaveGuestSessions(list);
          syncUserProfileToDatabase({
            uid: targetUid,
            email: "guest@sajjat.ai",
            displayName: "গেস্ট ব্যবহারকারী (Guest)",
            bio: "অপ্রমাণিত/গেস্ট ব্যবহারকারী",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          });
        }
        return list;
      });

      // Secure client limit increment to ensure fast UI updates
      if (systemSettings?.aiLimitSystemEnabled) {
        if (user?.uid) {
          incrementUserAiLimit(user.uid).catch((err) => console.error("Error incrementing limit:", err));
        } else {
          setGuestUsedCount((prev) => {
            const next = prev + 1;
            try {
              localStorage.setItem("sajjat_ai_guest_used_count", String(next));
            } catch (e) {}
            return next;
          });
        }
      }
    };

    // 1. Check Verified Personal QA Engine (if no attached file)
    const personalAns = getPersonalAnswer(text);
    if (personalAns && !attachedFile) {
      finishWithBotMessage({
        id: `msg_${Date.now()}_b`,
        sender: "bot",
        text: personalAns,
        timestamp: Date.now(),
        status: "sent",
        model: "Sajjat AI Verified",
        isPersonalQA: true,
      });
      return;
    }

    // 2. Check Book / PDF Library Search in Chat (যখন ইউজাররা বই খুঁজবে)
    if (!attachedFile && isBookSearchQuery(text)) {
      const matchedBooks = searchBooks(text, availableBooks);
      if (matchedBooks.length > 0) {
        const bookResponseText = formatBookSearchResponse(matchedBooks, text);
        finishWithBotMessage({
          id: `msg_${Date.now()}_b`,
          sender: "bot",
          text: bookResponseText,
          timestamp: Date.now(),
          status: "sent",
          model: "Sajjat AI Library",
          isBookSearch: true,
          bookResults: matchedBooks,
        });
        return;
      }
    }

    // 3. Call Real Gemini AI Server API with selected model (under-the-hood)
    setIsLoading(true);
    try {
      const response = await sendChatMessage({
        message: text,
        history: updatedMessages,
        attachedFile,
        model: selectedModel,
        uid: user?.uid,
      });

      finishWithBotMessage({
        id: `msg_${Date.now()}_b`,
        sender: "bot",
        text: response.reply,
        timestamp: Date.now(),
        status: "sent",
        model: response.model ? response.model.replace("Gemini ", "Sajjat AI ") : "Sajjat AI",
        generatedImageUrl: response.generatedImageUrl,
        generatedImagePrompt: response.generatedImagePrompt,
      });
    } catch (error: any) {
      console.warn("AI API Error, applying offline fallback:", error);
      const fallbackReply = generateClientFallbackReply(text, attachedFile?.name);
      finishWithBotMessage({
        id: `msg_${Date.now()}_fb`,
        sender: "bot",
        text: fallbackReply,
        timestamp: Date.now(),
        status: "sent",
        model: "Sajjat AI Neural Core",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add voice exchange from Live Voice call into the chat session
  const handleAddExchangeToChat = useCallback((userText: string, aiReply: string) => {
    let currentSessionId = activeSessionId;
    let targetSession = sessions.find((s) => s.id === currentSessionId);
    if (!targetSession) {
      currentSessionId = `session_${Date.now()}`;
      targetSession = {
        id: currentSessionId,
        title: userText ? (userText.length > 25 ? userText.substring(0, 25) + "..." : userText) : "ভয়েস চ্যাট",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setActiveSessionId(currentSessionId);
    }
    const uMsg: ChatMessage = {
      id: `voice_u_${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: Date.now(),
      status: "sent"
    };
    const bMsg: ChatMessage = {
      id: `voice_b_${Date.now()}`,
      sender: "bot",
      text: aiReply,
      timestamp: Date.now() + 50,
      status: "sent",
      model: selectedModel
    };
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      const updated = exists
        ? prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, uMsg, bMsg], updatedAt: Date.now() }
              : s
          )
        : [{ ...targetSession!, messages: [uMsg, bMsg] }, ...prev];
      if (user?.uid) {
        const toSave = updated.find((s) => s.id === currentSessionId);
        if (toSave) saveUserChatSession(user.uid, toSave);
      } else {
        safeSaveGuestSessions(updated);
      }
      return updated;
    });
  }, [activeSessionId, sessions, selectedModel, user?.uid]);

  const handleRetry = () => {
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.text, lastUserMessage.attachedFile);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setSessions([]);
      setActiveSessionId(null);
      setIsAdminViewOpen(false);
      setModalType("auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // 7-Tap Handler from Logo
  const handleOpenAdminTrigger = () => {
    if (user && isAdmin(user.email)) {
      setIsAdminViewOpen(true);
    } else {
      setModalType("admin_login");
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* Header with clean Sajjat AI logo and settings trigger & 7-Tap Admin Access */}
      <Header
        user={user}
        unreadNotifCount={unreadNotifCount}
        onOpenModal={(type) => setModalType(type)}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onOpenAdmin={handleOpenAdminTrigger}
        systemSettings={systemSettings}
        onOpenPremium={() => setShowPremiumModal(true)}
        onLogout={handleLogout}
      />

      {/* System Maintenance Banner when enabled by Admin */}
      {systemSettings?.maintenanceModeEnabled && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs py-2 px-4 flex items-center justify-center gap-2 text-center font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span>⚠️ সিস্টেম রক্ষণাবেক্ষণ চলছে। অ্যাপের কিছু ফিচার সাময়িকভাবে সীমিত থাকতে পারে।</span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left ☰ Sidebar / Drawer Menu */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => setActiveSessionId(id)}
          onNewChat={handleNewChat}
          onDeleteSession={promptDeleteSession}
          onClearAllSessions={promptClearAllSessions}
          user={user}
          onOpenModal={(type) => setModalType(type)}
          onLogout={handleLogout}
        />

        {/* Chat Area & Input */}
        <main className="flex-1 flex flex-col h-[calc(100vh-3.75rem)] overflow-hidden">
          <ChatArea
            messages={activeMessages}
            isLoading={isLoading}
            onSendPrompt={(prompt) => handleSendMessage(prompt)}
            onRetry={handleRetry}
            onOpenModal={(type) => setModalType(type)}
            user={user}
            onDeleteMessage={handleDeleteMessage}
            onClearActiveChat={promptClearActiveChat}
            selectedModel={selectedModel}
            activeSessionTitle={activeSession?.title}
            systemSettings={systemSettings}
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onOpenImageGenerator={() => setModalType("image_generator")}
            onOpenLiveVoice={() => setModalType("live_voice")}
            systemSettings={systemSettings}
          />
        </main>
      </div>

      {/* AI Image Generator Modal */}
      <ImageGeneratorModal
        isOpen={modalType === "image_generator"}
        onClose={() => setModalType("none")}
        onSendToChat={(promptText) => {
          handleSendMessage(promptText);
        }}
        systemSettings={systemSettings}
      />

      {/* Settings Modal (Includes Model Selection & Theme) */}
      <SettingsModal
        isOpen={modalType === "settings"}
        onClose={() => setModalType("none")}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenHtmlViewer={() => setModalType("html_viewer")}
      />

      {/* Standalone HTML File Viewer & Downloader Modal */}
      <HtmlViewerModal
        isOpen={modalType === "html_viewer"}
        onClose={() => setModalType("none")}
      />

      {/* 🎙️ Live Voice Assistant / Call with Sajjat AI */}
      <LiveVoiceModal
        isOpen={modalType === "live_voice"}
        onClose={() => setModalType("none")}
        user={user}
        onAddExchangeToChat={handleAddExchangeToChat}
        systemSettings={systemSettings}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={modalType === "notifications"}
        onClose={() => setModalType("none")}
        notifications={notifications}
        user={user}
      />

      {/* Help Center Modal (with dynamic content from Firebase) */}
      <HelpModal
        isOpen={modalType === "help"}
        onClose={() => setModalType("none")}
        appContent={appContent}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={modalType === "auth"}
        onClose={() => setModalType("none")}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setModalType("none");
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={modalType === "profile"}
        onClose={() => setModalType("none")}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
        onLogout={handleLogout}
      />

      {/* Privacy Policy Modal (with dynamic content from Firebase) */}
      <PrivacyModal
        isOpen={modalType === "privacy"}
        onClose={() => setModalType("none")}
        appContent={appContent}
      />

      {/* Book & PDF Library Modal */}
      <BookViewerModal
        isOpen={modalType === "book_library"}
        onClose={() => setModalType("none")}
        onAskAboutBook={(bookName, subject) => {
          handleSendMessage(`আমি "${bookName}" (${subject}) বইটি সম্পর্কে বিস্তারিত জানতে চাই। বইটির মূল বিষয়বস্তু এবং গুরুত্বপূর্ণ অধ্যায়সমূহ বুঝিয়ে দাও।`);
        }}
      />

      {/* Admin Login Modal (Triggered by 7 taps on Sajjat AI logo) */}
      <AdminLoginModal
        isOpen={modalType === "admin_login"}
        onClose={() => setModalType("none")}
        onSuccess={(adminProfile) => {
          setUser(adminProfile);
          setModalType("none");
          setIsAdminViewOpen(true);
        }}
      />

      {/* Complete Full-Screen Admin Panel */}
      {isAdminViewOpen && user && isAdmin(user.email) && (
        <AdminPanel
          adminUser={user}
          onClose={() => setIsAdminViewOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.title}
        description={deleteModalState.description}
      />
    </div>
  );
}
