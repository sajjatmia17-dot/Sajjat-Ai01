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
import { LiveVoiceModal } from "./components/LiveVoiceModal";
import { NotificationsModal } from "./components/NotificationsModal";
import { BookViewerModal } from "./components/BookViewerModal";
import { ImageGeneratorModal } from "./components/ImageGeneratorModal";
import { HtmlViewerModal } from "./components/HtmlViewerModal";
import { AudioPlayerDock } from "./components/AudioPlayerDock";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { AdminPanel } from "./components/AdminPanel";
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
  PurchaseRequest,
  AudioLibraryState,
  UniversalSearchResultItem,
} from "./types";
import { WebPushPopup } from "./components/WebPushPopup";
import { onForegroundMessage } from "./utils/fcmWebPush";
import { ref, get, set } from "firebase/database";
import { getPersonalAnswer, generateClientFallbackReply } from "./knowledge";
import { sendChatMessage, isImageGenerationIntent, runUniversalSearchApi, updateUniversalSearchConfigApi, fetchPublicAiCapabilities, type PublicAiCapabilities } from "./api";
import { 
  safeGetGuestSessions, 
  safeSaveGuestSessions, 
  safeClearGuestSessions 
} from "./storage";
import { 
  auth, 
  database,
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
  ADMIN_EMAIL,
  verifyBackendAdminAccess,
  reportUnauthorizedAdminAttempt,
  subscribeToUserAiLimit,
  incrementUserAiLimit,
  submitPurchaseRequest,
  subscribeToPackages,
  subscribeToPurchaseRequests
} from "./firebase";
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

  // Live Firebase Notifications & Content
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [appContent, setAppContent] = useState<AppContentConfig | null>(null);
  const [availableBooks, setAvailableBooks] = useState<BookItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsConfig | null>(null);

  // Sajjat AI Model Preference (uses real gemini models under the hood, default: gemini-3.8-flash)
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(() => {
    try {
      const saved = localStorage.getItem("sajjat_ai_model");
      if (saved && (saved === "gemini-3.1-flash-lite" || saved === "gemini-3.8-flash" || saved === "gemini-3.6-flash")) {
        return saved as GeminiModelId;
      }
    } catch (e) {}
    return "gemini-3.8-flash";
  });

  // Admin Access & Security Gate State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [verifiedAdminUser, setVerifiedAdminUser] = useState<UserProfile | null>(null);
  const [adminDeniedMessage, setAdminDeniedMessage] = useState<string | null>(null);
  const [aiCapabilities, setAiCapabilities] = useState<PublicAiCapabilities | null>(null);

  const refreshAiCapabilities = useCallback(() => {
    fetchPublicAiCapabilities()
      .then((caps) => setAiCapabilities(caps))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshAiCapabilities();
  }, [refreshAiCapabilities]);

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

  // Persistent Audio Player & Library State (Favorites, Playlist, Recently Played)
  const [currentTrack, setCurrentTrack] = useState<UniversalSearchResultItem | null>(null);
  const [audioQueue, setAudioQueue] = useState<UniversalSearchResultItem[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioLibrary, setAudioLibrary] = useState<AudioLibraryState>(() => {
    try {
      const saved = localStorage.getItem("sajjat_audio_library");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
          playlist: Array.isArray(parsed.playlist) ? parsed.playlist : [],
          recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
        };
      }
    } catch {}
    return { favorites: [], playlist: [], recentlyPlayed: [] };
  });

  const persistAudioLibrary = useCallback(
    (nextLib: AudioLibraryState) => {
      try {
        localStorage.setItem("sajjat_audio_library", JSON.stringify(nextLib));
      } catch {}
      if (user?.uid) {
        try {
          set(ref(database, `users/${user.uid}/audio_library`), nextLib).catch(() => {});
        } catch {}
      }
    },
    [user?.uid]
  );

  // Load user's saved audio library from RTDB on login (gracefully ignoring if rules restrict)
  useEffect(() => {
    if (!user?.uid) return;
    try {
      get(ref(database, `users/${user.uid}/audio_library`))
        .then((snap) => {
          if (snap.exists()) {
            const val = snap.val();
            setAudioLibrary((prev) => ({
              favorites: Array.isArray(val.favorites) ? val.favorites : prev.favorites,
              playlist: Array.isArray(val.playlist) ? val.playlist : prev.playlist,
              recentlyPlayed: Array.isArray(val.recentlyPlayed) ? val.recentlyPlayed : prev.recentlyPlayed,
            }));
          }
        })
        .catch(() => {});
    } catch {}
  }, [user?.uid]);

  const handlePlayAudioTrack = useCallback(
    (track: UniversalSearchResultItem, queueList?: UniversalSearchResultItem[]) => {
      setCurrentTrack(track);
      if (queueList && queueList.length > 0) {
        setAudioQueue(queueList);
      } else {
        setAudioQueue((prev) => (prev.some((q) => q.id === track.id) ? prev : [track, ...prev]));
      }
      setIsAudioPlaying(true);

      setAudioLibrary((prev) => {
        const nextRecent = [track, ...prev.recentlyPlayed.filter((t) => t.id !== track.id)].slice(0, 20);
        const nextLib = { ...prev, recentlyPlayed: nextRecent };
        persistAudioLibrary(nextLib);
        return nextLib;
      });
    },
    [persistAudioLibrary]
  );

  const handleToggleFavorite = useCallback(
    (track: UniversalSearchResultItem) => {
      setAudioLibrary((prev) => {
        const exists = prev.favorites.some((t) => t.id === track.id);
        const nextFavorites = exists
          ? prev.favorites.filter((t) => t.id !== track.id)
          : [track, ...prev.favorites].slice(0, 40);
        const nextLib = { ...prev, favorites: nextFavorites };
        persistAudioLibrary(nextLib);
        return nextLib;
      });
    },
    [persistAudioLibrary]
  );

  const handleAddToPlaylist = useCallback(
    (track: UniversalSearchResultItem) => {
      setAudioLibrary((prev) => {
        if (prev.playlist.some((t) => t.id === track.id)) return prev;
        const nextLib = { ...prev, playlist: [...prev.playlist, track].slice(0, 50) };
        persistAudioLibrary(nextLib);
        return nextLib;
      });
    },
    [persistAudioLibrary]
  );

  const handleRemoveFromPlaylist = useCallback(
    (trackId: string) => {
      setAudioLibrary((prev) => {
        const nextLib = {
          ...prev,
          playlist: prev.playlist.filter((t) => t.id !== trackId),
        };
        persistAudioLibrary(nextLib);
        return nextLib;
      });
    },
    [persistAudioLibrary]
  );

  const handleAudioNext = useCallback(() => {
    if (!currentTrack || audioQueue.length === 0) return;
    const idx = audioQueue.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = idx >= 0 ? (idx + 1) % audioQueue.length : 0;
    const nextTrack = audioQueue[nextIdx];
    if (nextTrack) {
      handlePlayAudioTrack(nextTrack, audioQueue);
    }
  }, [currentTrack, audioQueue, handlePlayAudioTrack]);

  const handleAudioPrev = useCallback(() => {
    if (!currentTrack || audioQueue.length === 0) return;
    const idx = audioQueue.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = idx >= 0 ? (idx - 1 + audioQueue.length) % audioQueue.length : 0;
    const prevTrack = audioQueue[prevIdx];
    if (prevTrack) {
      handlePlayAudioTrack(prevTrack, audioQueue);
    }
  }, [currentTrack, audioQueue, handlePlayAudioTrack]);

  const favoriteIds = React.useMemo(
    () => new Set(audioLibrary.favorites.map((t) => t.id)),
    [audioLibrary.favorites]
  );
  const playlistIds = React.useMemo(
    () => new Set(audioLibrary.playlist.map((t) => t.id)),
    [audioLibrary.playlist]
  );

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
    // Foreground push message listener
    const unsubPush = onForegroundMessage((payload) => {
      const title = payload?.notification?.title || "Sajjat Ai Notification";
      const body = payload?.notification?.body || "New update received.";
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch {}
      }
    });

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
        setVerifiedAdminUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Direct Admin URL Guard (/admin, #admin, ?admin=1)
  useEffect(() => {
    const checkDirectAdminUrl = async () => {
      if (typeof window === "undefined") return;
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const isDirectAdminTarget =
        path === "/admin" ||
        path.startsWith("/admin/") ||
        hash === "#admin" ||
        params.get("admin") === "1" ||
        params.get("admin") === "true";

      if (!isDirectAdminTarget) return;

      try {
        if (typeof (auth as any).authStateReady === "function") {
          await (auth as any).authStateReady();
        }
      } catch {}

      const verification = await verifyBackendAdminAccess();
      if (verification.authorized && auth.currentUser) {
        setShowAdminLogin(true);
        window.history.replaceState({}, "", "/");
      } else {
        await reportUnauthorizedAdminAttempt(
          "direct_url",
          window.location.pathname + window.location.search + window.location.hash,
          verification.reason || "Unauthorized direct admin URL access blocked."
        );
        setVerifiedAdminUser(null);
        setAdminDeniedMessage(
          `Access Denied: শুধুমাত্র অনুমোদিত অ্যাডমিন (${ADMIN_EMAIL}) অ্যাডমিন প্যানেলে প্রবেশ করতে পারবেন।`
        );
        window.history.replaceState({}, "", "/");
      }
    };

    checkDirectAdminUrl();
    window.addEventListener("popstate", checkDirectAdminUrl);
    return () => window.removeEventListener("popstate", checkDirectAdminUrl);
  }, []);

  // Auto-dismiss Access Denied banner
  useEffect(() => {
    if (!adminDeniedMessage) return;
    const t = setTimeout(() => setAdminDeniedMessage(null), 6500);
    return () => clearTimeout(t);
  }, [adminDeniedMessage]);

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
        if (settings.universalSearch && isAdmin(auth.currentUser?.email)) {
          updateUniversalSearchConfigApi(settings.universalSearch).catch(() => {});
        }
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

  // Persist Like / Dislike feedback on a bot message
  const handleFeedbackMessage = useCallback((messageId: string, feedback: "like" | "dislike" | null) => {
    const targetSessionId = activeSessionId || sessions[0]?.id;
    if (!targetSessionId) return;

    setSessions((prev) => {
      const targetUid = user?.uid || getOrCreateGuestId();
      const updated = prev.map((session) => {
        if (session.id === targetSessionId) {
          const newMessages = session.messages.map((m) =>
            m.id === messageId ? { ...m, feedback } : m
          );
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
  }, [activeSessionId, sessions, user?.uid]);

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

    // 3. Universal Internet, Video, Audio, Image, Document & Website Search Intelligence
    const searchMasterEnabled =
      systemSettings?.universalSearch?.enabled !== false &&
      systemSettings?.webSearchEnabled !== false;

    setIsLoading(true);
    try {
      if (!attachedFile && !isImageGenerationIntent(text) && searchMasterEnabled) {
        const searchPayload = await runUniversalSearchApi({
          query: text,
          uid: user?.uid,
          userName: user?.displayName,
        });

        if (searchPayload.success && searchPayload.intent !== "chat") {
          finishWithBotMessage({
            id: `msg_${Date.now()}_us`,
            sender: "bot",
            text:
              searchPayload.summaryMarkdown ||
              `"${text}" অনুসন্ধানের যাচাইকৃত ফলাফল নিচে দেওয়া হলো:`,
            timestamp: Date.now(),
            status: "sent",
            model: "Sajjat AI Universal Search",
            universalSearch: searchPayload,
          });
          return;
        }
      }

      // 4. Call Real Gemini AI Server API with selected model (under-the-hood)
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
        model: response.model ? response.model.replace(/gemini\s*/gi, "Sajjat Ai ") : "Sajjat Ai",
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

  const handleRetry = (promptOverride?: string) => {
    if (promptOverride && promptOverride.trim()) {
      handleSendMessage(promptOverride);
      return;
    }
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
      setModalType("auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSecretAdminTrigger = useCallback(async () => {
    if (!user) {
      setAdminDeniedMessage(
        "Access Denied: অ্যাডমিন প্যানেল খোলার জন্য প্রথমে ইউজার প্যানেলে লগইন করা বাধ্যতামূলক।"
      );
      return;
    }

    if (!isAdmin(user.email) || user.email.toLowerCase().trim() !== "sajjatmia17@gmail.com") {
      await reportUnauthorizedAdminAttempt(
        "logo_7_tap",
        typeof window !== "undefined" ? window.location.pathname : "/",
        `Signed-in non-admin user (${user.email}) triggered 7-tap admin sequence.`
      );
      setAdminDeniedMessage(
        `Access Denied: "${user.email}" অ্যাডমিন অ্যাকাউন্ট নয়। শুধুমাত্র ${ADMIN_EMAIL} প্রবেশ করতে পারবেন।`
      );
      return;
    }

    setShowAdminLogin(true);
  }, [user]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* Header with clean Sajjat AI logo, live call, and controls */}
      <Header
        user={user}
        unreadNotifCount={unreadNotifCount}
        onOpenModal={(type) => setModalType(type)}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onStartVoiceCall={() => setModalType("live_voice")}
        systemSettings={systemSettings}
        onOpenPremium={() => setShowPremiumModal(true)}
        onLogout={handleLogout}
        onSecretAdminTrigger={handleSecretAdminTrigger}
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
            onFeedbackMessage={handleFeedbackMessage}
            onOpenModal={(type) => setModalType(type)}
            user={user}
            onDeleteMessage={handleDeleteMessage}
            onClearActiveChat={promptClearActiveChat}
            selectedModel={selectedModel}
            activeSessionTitle={activeSession?.title}
            systemSettings={systemSettings}
            onPlayAudioTrack={handlePlayAudioTrack}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
            favoriteIds={favoriteIds}
            playlistIds={playlistIds}
            activeTrackId={currentTrack?.id}
            isAudioPlaying={isAudioPlaying}
          />

          <AudioPlayerDock
            currentTrack={currentTrack}
            queue={audioQueue}
            isPlaying={isAudioPlaying}
            onTogglePlay={() => setIsAudioPlaying((prev) => !prev)}
            onSetIsPlaying={setIsAudioPlaying}
            onSelectTrack={handlePlayAudioTrack}
            onNext={handleAudioNext}
            onPrev={handleAudioPrev}
            onClosePlayer={() => {
              setIsAudioPlaying(false);
              setCurrentTrack(null);
            }}
            audioLibrary={audioLibrary}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            downloadPermissionEnabled={
              systemSettings?.universalSearch?.downloadPermissionEnabled !== false
            }
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onOpenImageGenerator={() => setModalType("image_generator")}
            onStartVoiceCall={() => setModalType("live_voice")}
            systemSettings={systemSettings}
            aiCapabilities={aiCapabilities}
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

      {/* Live Voice Call Modal with Sajjat AI */}
      <LiveVoiceModal
        isOpen={modalType === "live_voice"}
        onClose={() => setModalType("none")}
        selectedModel={selectedModel}
        aiBrandName={systemSettings?.aiBrandName || "Sajjat AI"}
        onSendToChat={(userText) => {
          handleSendMessage(userText);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.title}
        description={deleteModalState.description}
      />

      {/* Verified Admin Login Modal (Locked strictly to sajjatmia17@gmail.com) */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={(adminUser) => {
          setUser(adminUser);
          setVerifiedAdminUser(adminUser);
          setShowAdminLogin(false);
        }}
      />

      {/* Verified Admin Panel Overlay */}
      {verifiedAdminUser && isAdmin(verifiedAdminUser.email) && (
        <AdminPanel
          adminUser={verifiedAdminUser}
          onClose={() => {
            setVerifiedAdminUser(null);
            refreshAiCapabilities();
          }}
          onLogout={async () => {
            setVerifiedAdminUser(null);
            await handleLogout();
          }}
        />
      )}

      {/* Premium Dark Web Push Notification Permission Popup */}
      <WebPushPopup userUid={user?.uid} />
    </div>
  );
}
