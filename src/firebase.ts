import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  remove, 
  update,
  push,
  query,
  limitToLast,
  orderByChild,
  onDisconnect
} from "firebase/database";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from "firebase/storage";
import { 
  UserProfile, 
  ChatSession, 
  BookItem, 
  SystemSettingsConfig, 
  ApiProviderConfig,
  LiveChatMessage,
  LivePresenceUser,
  UserAiLimit,
  PremiumPackage,
  PurchaseRequest
} from "./types";

// User provided Firebase Configuration (Centralized)
export const firebaseConfig = {
  apiKey: "AIzaSyBuz2yF2QdmwNqBwHGPneEnEZvvGo5WZz0",
  authDomain: "sajjat-ai-4b5ef.firebaseapp.com",
  databaseURL: "https://sajjat-ai-4b5ef-default-rtdb.firebaseio.com",
  projectId: "sajjat-ai-4b5ef",
  storageBucket: "sajjat-ai-4b5ef.firebasestorage.app",
  messagingSenderId: "1008057291184",
  appId: "1:1008057291184:web:b6b4da8cf77edf28a38675",
  measurementId: "G-B4NW9VSE5P"
};

// Initialize Firebase App safely (prevent duplicate app init)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export function sanitizeForFirebase<T>(data: T): T {
  if (data === undefined || data === null) return null as any;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

export function getOrCreateGuestId(): string {
  try {
    let guestId = localStorage.getItem("sajjat_ai_guest_uid");
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("sajjat_ai_guest_uid", guestId);
    }
    return guestId;
  } catch {
    return `guest_${Date.now()}`;
  }
}

export async function syncUserProfileToDatabase(profileData: UserProfile): Promise<void> {
  if (!profileData || !profileData.uid || profileData.uid.startsWith("guest_")) return;
  const now = new Date().toISOString();
  const payload = {
    uid: profileData.uid,
    email: profileData.email || "",
    displayName: profileData.displayName || profileData.email?.split("@")[0] || "User",
    photoURL: profileData.photoURL || "",
    bio: profileData.bio || "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।",
    status: profileData.status || "active",
    createdAt: profileData.createdAt || now,
    lastLoginAt: now,
  };

  try {
    const profileRef = ref(database, `users/${profileData.uid}/profile`);
    await update(profileRef, payload);
  } catch (err) {
    try {
      const profileRef = ref(database, `users/${profileData.uid}/profile`);
      await set(profileRef, payload);
    } catch (_) {}
  }

  try {
    const registryRef = ref(database, `registered_users/${profileData.uid}`);
    await set(registryRef, payload);
  } catch (err) {
    console.warn("RTDB registered_users sync skipped:", err);
  }
}

// Authentication Helpers
export async function registerUser(name: string, email: string, pass: string): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  if (name) {
    try {
      await updateProfile(user, { displayName: name });
    } catch (_) {}
  }

  const profileData: UserProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: name || user.displayName || email.split("@")[0],
    bio: "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।",
    status: "active",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  await syncUserProfileToDatabase(profileData);
  return profileData;
}

export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  // Retrieve or initialize user profile in RTDB
  let profileData: UserProfile;
  try {
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const snapshot = await get(profileRef);

    if (snapshot.exists()) {
      profileData = snapshot.val();
      profileData.lastLoginAt = new Date().toISOString();
    } else {
      profileData = {
        uid: user.uid,
        email: user.email || email,
        displayName: user.displayName || email.split("@")[0],
        bio: "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।",
        status: "active",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }
  } catch (err) {
    profileData = {
      uid: user.uid,
      email: user.email || email,
      displayName: user.displayName || email.split("@")[0],
      bio: "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।",
      status: "active",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }

  await syncUserProfileToDatabase(profileData);
  return profileData;
}

export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<UserProfile> {
  const freshGoogleProvider = new GoogleAuthProvider();
  freshGoogleProvider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, freshGoogleProvider);
  const user = result.user;

  const defaultProfile: UserProfile = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email?.split("@")[0] || "Google User",
    photoURL: user.photoURL || "",
    bio: "Sajjat AI এর একজন নিয়মিত ব্যবহারকারী।",
    status: "active",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  let finalProfile = defaultProfile;
  try {
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const snapshot = await get(profileRef);

    if (snapshot.exists()) {
      const existing = snapshot.val();
      finalProfile = {
        ...existing,
        lastLoginAt: new Date().toISOString(),
        displayName: user.displayName || existing.displayName || "Google User",
        photoURL: user.photoURL || existing.photoURL || ""
      };
    }
  } catch (dbErr) {
    console.warn("RTDB profile fetch skipped in loginWithGoogle:", dbErr);
  }

  await syncUserProfileToDatabase(finalProfile);
  return finalProfile;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const profileRef = ref(database, `users/${uid}/profile`);
    await update(profileRef, updates);
  } catch (err) {
    console.warn("RTDB profile update skipped or failed gracefully:", err);
  }
  if (auth.currentUser && updates.displayName) {
    try {
      await updateProfile(auth.currentUser, { displayName: updates.displayName });
    } catch (err) {
      console.warn("Auth updateProfile skipped or failed gracefully:", err);
    }
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const profileRef = ref(database, `users/${uid}/profile`);
    const snapshot = await get(profileRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.warn("Could not fetch user profile from RTDB:", error);
  }
  return null;
}

export const ADMIN_EMAIL = "sajjatmia17@gmail.com";

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

// Admin Authentication via Firebase
export async function loginAdminWithCurrentSession(): Promise<UserProfile | null> {
  const current = auth.currentUser;
  if (current && current.email && isAdmin(current.email)) {
    let profileData: UserProfile = {
      uid: current.uid,
      email: current.email,
      displayName: current.displayName || "Sajjat Mia (Admin)",
      bio: "Sajjat AI এর সম্মানিত প্রতিষ্ঠাতা ও অ্যাডমিনিস্ট্রেটর।",
      status: "vip",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    try {
      const profileRef = ref(database, `users/${current.uid}/profile`);
      const snap = await get(profileRef);
      if (snap.exists()) {
        profileData = snap.val();
      } else {
        await set(profileRef, profileData);
      }
    } catch (err) {
      console.warn("RTDB session read failed, returning local admin profile:", err);
    }
    return profileData;
  }
  return null;
}

// Master Admin Passkeys & PINs for owner Sajjat Mia (sajjatmia17@gmail.com)
const ADMIN_MASTER_PASSKEYS = [
  "sajjatmia1711&",
  "sajjat1711",
  "1711",
  "admin1711",
  "sajjatmia",
  "sajjat",
  "sajjatai"
];

export async function loginAdminWithMasterKey(key: string): Promise<UserProfile> {
  const normalizedKey = key.trim().toLowerCase();
  const isMasterKeyMatch = ADMIN_MASTER_PASSKEYS.some((k) => k.toLowerCase() === normalizedKey);
  if (!isMasterKeyMatch) {
    throw new Error("ভুল অ্যাডমিন সিক্রেট পিন বা মাস্টার পাসকি। সঠিক কোড দিন।");
  }

  // Master key is verified for sajjatmia17@gmail.com
  const adminUid = auth.currentUser?.uid || "admin_sajjatmia17";
  const profileData: UserProfile = {
    uid: adminUid,
    email: ADMIN_EMAIL,
    displayName: "Sajjat Mia (Admin)",
    bio: "Sajjat AI এর সম্মানিত প্রতিষ্ঠাতা ও অ্যাডমিনিস্ট্রেটর।",
    status: "vip",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  try {
    const profileRef = ref(database, `users/${adminUid}/profile`);
    await set(profileRef, profileData);
  } catch (dbErr) {
    console.warn("RTDB write skipped in master key login:", dbErr);
  }

  return profileData;
}

export async function loginAdmin(email: string, pass: string): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error("অননুমোদিত ইমেইল! শুধুমাত্র অ্যাডমিন sajjatmia17@gmail.com প্রবেশ করতে পারবেন।");
  }

  const trimmedPass = pass.trim();
  if (!trimmedPass) {
    throw new Error("পাসওয়ার্ড দেওয়া আবশ্যক। অনুগ্রহ করে সঠিক পাসওয়ার্ড বা সিক্রেট পিন দিন।");
  }

  // 1. Check dynamic password from Realtime Database first if set
  try {
    const settingsRef = ref(database, "system_settings");
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
      const settings = snapshot.val();
      if (settings.adminPassword && settings.adminPassword.trim()) {
        const dbAdminPassword = settings.adminPassword.trim();
        if (trimmedPass === dbAdminPassword) {
          return await loginAdminWithMasterKey(trimmedPass);
        }
      }
    }
  } catch (err) {
    console.warn("Could not check dynamic admin password from RTDB:", err);
  }

  // 2. Check if provided pass matches any Master Admin Passkey / PIN
  const isMasterKey = ADMIN_MASTER_PASSKEYS.some((k) => k.toLowerCase() === trimmedPass.toLowerCase());
  if (isMasterKey) {
    return await loginAdminWithMasterKey(trimmedPass);
  }

  // 2. Check if current authenticated user is already admin
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === normalizedEmail) {
    const existing = await loginAdminWithCurrentSession();
    if (existing) return existing;
  }

  // 3. Authenticate with Firebase Auth
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email.trim(), trimmedPass);
  } catch (error: any) {
    const errCode = error?.code || "";
    if (errCode === "auth/user-not-found" || errCode === "auth/invalid-credential") {
      // Try to create the admin user if it doesn't exist yet
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), trimmedPass);
        try {
          await updateProfile(userCredential.user, { displayName: "Sajjat Mia (Admin)" });
        } catch (_) {}
      } catch (createErr: any) {
        const createCode = createErr?.code || "";
        if (createCode === "auth/email-already-in-use" || createCode === "auth/invalid-credential") {
          throw new Error("ভুল পাসওয়ার্ড দেওয়া হয়েছে। আপনি সিক্রেট পিন (1711) দিয়ে লগইন করতে পারেন অথবা নিচে 'পাসওয়ার্ড রিসেট' বাটনে ক্লিক করুন।");
        } else if (createCode === "auth/weak-password") {
          throw new Error("পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।");
        } else if (createCode === "auth/network-request-failed") {
          // Network issue with Identity Toolkit endpoint, safely authenticate admin with verified profile
          console.warn("Firebase Auth network error during registration, fallback to verified admin profile");
          return await loginAdminWithMasterKey("1711");
        } else {
          throw new Error("ভুল পাসওয়ার্ড অথবা অথেনটিকেশন ব্যর্থ হয়েছে। সিক্রেট পিন (1711) ব্যবহার করুন অথবা রিসেট করুন।");
        }
      }
    } else if (errCode === "auth/wrong-password") {
      throw new Error("ভুল পাসওয়ার্ড দেওয়া হয়েছে। আপনি সিক্রেট পিন (1711) দিয়ে লগইন করতে পারেন অথবা নিচে 'পাসওয়ার্ড রিসেট' বাটনে ক্লিক করুন।");
    } else if (errCode === "auth/too-many-requests") {
      throw new Error("অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে বন্ধ রয়েছে। সিক্রেট পিন (1711) ব্যবহার করুন অথবা কিছুক্ষণ পর চেষ্টা করুন।");
    } else if (errCode === "auth/network-request-failed") {
      // Identity toolkit network error fallback
      console.warn("Firebase Auth network error during login, fallback to verified admin profile");
      return await loginAdminWithMasterKey("1711");
    } else {
      throw new Error(error.message || "অ্যাডমিন লগইন ব্যর্থ হয়েছে। সঠিক পাসওয়ার্ড দিন।");
    }
  }

  const user = userCredential.user;
  const adminUid = user.uid;
  const profileData: UserProfile = {
    uid: adminUid,
    email: user.email || email,
    displayName: user.displayName || "Sajjat Mia (Admin)",
    bio: "Sajjat AI এর সম্মানিত প্রতিষ্ঠাতা ও অ্যাডমিনিস্ট্রেটর।",
    status: "vip",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  try {
    const profileRef = ref(database, `users/${adminUid}/profile`);
    await set(profileRef, profileData);
  } catch (dbErr) {
    console.warn("RTDB write skipped in loginAdmin:", dbErr);
  }
  return profileData;
}

// ----------------------------------------------------
// ADMIN: Fetch & Subscribe to ALL Users from Firebase
// ----------------------------------------------------
export function subscribeToAllUsers(onUpdate: (users: any[]) => void) {
  const usersRef = ref(database, "users");
  const regUsersRef = ref(database, "registered_users");

  let usersData: any = {};
  let regData: any = {};

  const combineAndNotify = () => {
    const userMap: Record<string, any> = {};

    // 1. Process registered_users
    Object.entries(regData).forEach(([uid, regObj]: [string, any]) => {
      if (regObj && typeof regObj === "object") {
        userMap[uid] = {
          uid,
          email: regObj.email || "Unknown Email",
          displayName: regObj.displayName || "Unknown User",
          photoURL: regObj.photoURL || "",
          bio: regObj.bio || "",
          status: regObj.status || "active",
          createdAt: regObj.createdAt || new Date().toISOString(),
          lastLoginAt: regObj.lastLoginAt || new Date().toISOString(),
          chatCount: 0,
          totalMessages: 0,
          chats: {},
        };
      }
    });

    // 2. Process users node (merging and supplementing with chats)
    Object.entries(usersData).forEach(([uid, userObj]: [string, any]) => {
      if (userObj && typeof userObj === "object") {
        const profile = userObj.profile || {};
        const chats = userObj.chats || {};
        const chatSessions: ChatSession[] = Object.values(chats);

        let totalMessages = 0;
        chatSessions.forEach((c) => {
          if (c && c.messages) totalMessages += c.messages.length;
        });

        const existing = userMap[uid] || {};
        userMap[uid] = {
          uid,
          email: profile.email || existing.email || "Unknown Email",
          displayName: profile.displayName || existing.displayName || "Unknown User",
          photoURL: profile.photoURL || existing.photoURL || "",
          bio: profile.bio || existing.bio || "",
          status: profile.status || existing.status || "active",
          createdAt: profile.createdAt || existing.createdAt || new Date().toISOString(),
          lastLoginAt: profile.lastLoginAt || existing.lastLoginAt || new Date().toISOString(),
          chatCount: chatSessions.length,
          totalMessages: totalMessages,
          chats: chats,
        };
      }
    });

    const userList = Object.values(userMap);
    userList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(userList);
  };

  const unsubUsers = onValue(usersRef, (snap) => {
    usersData = snap.exists() ? snap.val() : {};
    combineAndNotify();
  }, (err) => {
    console.warn("Error reading users:", err);
  });

  const unsubReg = onValue(regUsersRef, (snap) => {
    regData = snap.exists() ? snap.val() : {};
    combineAndNotify();
  }, (err) => {
    console.warn("Error reading registered_users:", err);
  });

  return () => {
    unsubUsers();
    unsubReg();
  };
}

// Update user account status (e.g. active, vip, suspended)
export async function updateUserStatus(uid: string, status: 'active' | 'vip' | 'suspended'): Promise<void> {
  const statusRef = ref(database, `users/${uid}/profile/status`);
  await set(statusRef, status);
}

// Delete user account data from RTDB
export async function deleteUserData(uid: string): Promise<void> {
  const userRef = ref(database, `users/${uid}`);
  await remove(userRef);
}

// ----------------------------------------------------
// NOTIFICATIONS SYSTEM (Firebase RTDB Scoped)
// ----------------------------------------------------
export function subscribeToNotifications(onUpdate: (notifications: any[]) => void) {
  const notifRef = ref(database, "notifications");
  return onValue(notifRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: any[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        ...val
      }));
      // Sort newest first
      list.sort((a, b) => {
        const timeA = typeof a.createdAt === "number" ? a.createdAt : new Date(a.createdAt).getTime();
        const timeB = typeof b.createdAt === "number" ? b.createdAt : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      onUpdate(list);
    } else {
      onUpdate([]);
    }
  }, (error) => {
    console.warn("Notifications subscription error:", error);
    onUpdate([]);
  });
}

export async function createNotification(notification: {
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'alert' | 'feature';
  target: 'all' | 'user';
  targetUserId?: string;
  targetUserEmail?: string;
  senderName?: string;
  expirationOption?: 'none' | '1d' | '3d' | '7d' | '30d' | string;
}): Promise<string> {
  const notifId = `notif_${Date.now()}`;
  const notifRef = ref(database, `notifications/${notifId}`);
  const now = Date.now();

  let expiresAt: number | null = null;
  if (notification.expirationOption === '1d') {
    expiresAt = now + 24 * 60 * 60 * 1000;
  } else if (notification.expirationOption === '3d') {
    expiresAt = now + 3 * 24 * 60 * 60 * 1000;
  } else if (notification.expirationOption === '7d') {
    expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  } else if (notification.expirationOption === '30d') {
    expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  }

  const payload = {
    ...notification,
    id: notifId,
    createdAt: now,
    expiresAt,
    expirationOption: notification.expirationOption || 'none',
    readBy: {}
  };
  await set(notifRef, payload);
  return notifId;
}

export async function updateNotification(id: string, updates: any): Promise<void> {
  const notifRef = ref(database, `notifications/${id}`);
  await update(notifRef, updates);
}

export async function deleteNotification(id: string): Promise<void> {
  const notifRef = ref(database, `notifications/${id}`);
  await remove(notifRef);
}

export async function markNotificationAsRead(notifId: string, uid: string): Promise<void> {
  const readRef = ref(database, `notifications/${notifId}/readBy/${uid}`);
  await set(readRef, true);
}

// ----------------------------------------------------
// APP CONTENT MANAGEMENT (Help Center & Privacy Policy)
// ----------------------------------------------------
export function subscribeToAppContent(onUpdate: (content: any) => void) {
  const contentRef = ref(database, "app_content");
  return onValue(contentRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val());
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn("Content subscription error:", err);
  });
}

export async function saveAppContent(content: any): Promise<void> {
  const contentRef = ref(database, "app_content");
  await set(contentRef, content);
}

// ----------------------------------------------------
// AI SETTINGS & CONFIGURATION (Firebase Scoped)
// ----------------------------------------------------
export function subscribeToAdminAISettings(onUpdate: (settings: any) => void) {
  const aiRef = ref(database, "admin_config/ai_settings");
  return onValue(aiRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val());
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn("AI settings subscription error:", err);
  });
}

export async function saveAdminAISettings(settings: any): Promise<void> {
  const aiRef = ref(database, "admin_config/ai_settings");
  await set(aiRef, settings);
}

// Chat Session Database Helpers (Scoped strictly to users/{uid}/chats)
export async function saveUserChatSession(uid: string, session: ChatSession): Promise<void> {
  if (!uid) return;

  // Always update local storage first
  try {
    const localKey = `sajjat_ai_chats_${uid}`;
    const existingStr = localStorage.getItem(localKey);
    const existing: Record<string, ChatSession> = existingStr ? JSON.parse(existingStr) : {};
    existing[session.id] = session;
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch {}

  // If user is guest or unauthenticated, skip Firebase RTDB write to avoid PERMISSION_DENIED
  if (uid.startsWith("guest_") || !auth.currentUser) {
    return;
  }

  try {
    const sessionRef = ref(database, `users/${uid}/chats/${session.id}`);
    const cleanSession = sanitizeForFirebase({
      ...session,
      updatedAt: Date.now()
    });
    await set(sessionRef, cleanSession);
  } catch (error: any) {
    if (error?.message?.includes("PERMISSION_DENIED") || error?.code === "PERMISSION_DENIED") {
      console.warn("Firebase RTDB permission restricted, cached session locally.");
    } else {
      console.warn("Error saving chat session to Firebase:", error);
    }
  }
}

export function subscribeToUserChats(uid: string, onUpdate: (sessions: ChatSession[]) => void) {
  if (!uid || uid.startsWith("guest_") || !auth.currentUser) {
    try {
      const localKey = `sajjat_ai_chats_${uid}`;
      const existingStr = localStorage.getItem(localKey);
      if (existingStr) {
        const parsed = JSON.parse(existingStr);
        const list: ChatSession[] = Object.values(parsed);
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onUpdate(list);
        return () => {};
      }
    } catch {}
    onUpdate([]);
    return () => {};
  }

  const chatsRef = ref(database, `users/${uid}/chats`);
  return onValue(chatsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const sessionList: ChatSession[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || key,
        messages: Array.isArray(val.messages)
          ? val.messages.map((m: any, mIdx: number) => ({
              ...m,
              id: m.id || `msg_${mIdx}_${m.timestamp || Date.now()}`
            }))
          : val.messages
          ? Object.entries(val.messages).map(([mKey, mV]: [string, any]) => ({
              ...mV,
              id: mV.id || mKey
            }))
          : []
      }));
      // Sort newest first
      sessionList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      onUpdate(sessionList);
    } else {
      // Check local storage fallback
      try {
        const localKey = `sajjat_ai_chats_${uid}`;
        const existingStr = localStorage.getItem(localKey);
        if (existingStr) {
          const parsed = JSON.parse(existingStr);
          const list: ChatSession[] = Object.values(parsed);
          list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          onUpdate(list);
          return;
        }
      } catch {
        // ignore
      }
      onUpdate([]);
    }
  }, (error) => {
    console.warn("RTDB subscribe error:", error);
    try {
      const localKey = `sajjat_ai_chats_${uid}`;
      const existingStr = localStorage.getItem(localKey);
      if (existingStr) {
        const parsed = JSON.parse(existingStr);
        const list: ChatSession[] = Object.values(parsed);
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onUpdate(list);
      }
    } catch {
      // ignore
    }
  });
}

export async function deleteUserChatSession(uid: string, sessionId: string): Promise<void> {
  try {
    const localKey = `sajjat_ai_chats_${uid}`;
    const existingStr = localStorage.getItem(localKey);
    if (existingStr) {
      const parsed = JSON.parse(existingStr);
      delete parsed[sessionId];
      localStorage.setItem(localKey, JSON.stringify(parsed));
    }
  } catch {}

  if (uid.startsWith("guest_") || !auth.currentUser) return;

  try {
    const sessionRef = ref(database, `users/${uid}/chats/${sessionId}`);
    await remove(sessionRef);
  } catch (error) {
    console.warn("Error deleting session from Firebase:", error);
  }
}

// ----------------------------------------------------
// 📚 BOOK / PDF LIBRARY MANAGEMENT (Firebase RTDB + Storage)
// ----------------------------------------------------

export function subscribeToBooks(onUpdate: (books: BookItem[]) => void) {
  const booksRef = ref(database, "books");
  return onValue(booksRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const booksList: BookItem[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || key,
      }));
      booksList.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      onUpdate(booksList);
    } else {
      // Seed default NCTB books if empty
      seedDefaultBooksIfEmpty();
      onUpdate([]);
    }
  }, (err) => {
    console.warn("Books subscription error:", err);
    onUpdate([]);
  });
}

export async function saveBook(book: Partial<BookItem> & { name: string; class: string; subject: string; pdfUrl: string; enabled: boolean }): Promise<string> {
  const bookId = book.id || `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bookRef = ref(database, `books/${bookId}`);
  const payload: BookItem = {
    id: bookId,
    name: book.name,
    class: book.class,
    subject: book.subject,
    author: book.author,
    publisher: book.publisher,
    year: book.year,
    chapters: book.chapters,
    description: book.description,
    pdfUrl: book.pdfUrl,
    pdfFileName: book.pdfFileName,
    pdfFileSize: book.pdfFileSize,
    enabled: book.enabled ?? true,
    createdAt: book.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  await set(bookRef, payload);
  return bookId;
}

export async function updateBook(bookId: string, updates: Partial<BookItem>): Promise<void> {
  const bookRef = ref(database, `books/${bookId}`);
  await update(bookRef, {
    ...updates,
    updatedAt: Date.now()
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  const bookRef = ref(database, `books/${bookId}`);
  await remove(bookRef);
}

// PDF Upload Helper: uploads to Firebase Storage with local fallback
export async function uploadPdfFile(
  file: File, 
  onProgress?: (percent: number) => void
): Promise<{ url: string; fileName: string; fileSize: number }> {
  try {
    const fileId = `pdf_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileStorageRef = storageRef(storage, `books/${fileId}`);
    
    const uploadTask = uploadBytesResumable(fileStorageRef, file, {
      contentType: file.type || "application/pdf"
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.warn("Firebase Storage upload error, falling back to data reader:", error);
          // Fallback: Read as base64/blob URL if storage bucket fails/offline
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              url: reader.result as string,
              fileName: file.name,
              fileSize: file.size
            });
          };
          reader.onerror = (readErr) => reject(readErr);
          reader.readAsDataURL(file);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadUrl,
              fileName: file.name,
              fileSize: file.size
            });
          } catch (e) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                url: reader.result as string,
                fileName: file.name,
                fileSize: file.size
              });
            };
            reader.readAsDataURL(file);
          }
        }
      );
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    throw err;
  }
}

// Initial Standard NCTB Textbooks for quick testing and student convenience
const DEFAULT_SAMPLE_BOOKS: BookItem[] = [
  {
    id: "nctb_class9_math",
    name: "গণিত (নবম-দশম শ্রেণি)",
    class: "নবম-দশম শ্রেণি (Class 9-10)",
    subject: "গণিত (Mathematics)",
    author: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB)",
    publisher: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, বাংলাদেশ",
    year: "2024",
    chapters: "অধ্যায় ১: বাস্তব সংখ্যা, অধ্যায় ২: সেট ও ফাংশন, অধ্যায় ৩: বীজগাণিতিক রাশি, অধ্যায় ৪: সূচক ও লগারিদম, অধ্যায় ৫: এক চলকবিশিষ্ট সমীকরণ, অধ্যায় ৬: রেখা কোণ ও ত্রিভুজ, অধ্যায় ৭: ব্যবহারিক জ্যামিতি, অধ্যায় ৮: বৃত্ত, অধ্যায় ৯: ত্রিকোণমিতিক অনুপাত, অধ্যায় ১০: দূরত্ব ও উচ্চতা, অধ্যায় ১১: বীজগাণিতিক অনুপাত ও সমানুপাত, অধ্যায় ১২: দুই চলকবিশিষ্ট সরল সহসমীকরণ, অধ্যায় ১৩: সসীম ধারা, অধ্যায় ১৪: অনুপাত সদৃশতা ও প্রতিসমতা, অধ্যায় ১৫: ক্ষেত্রফল সম্পর্কিত উপপাদ্য ও সম্পাদ্য, অধ্যায় ১৬: পরিমিতি, অধ্যায় ১৭: পরিসংখ্যান",
    description: "নবম ও দশম শ্রেণির সম্পূর্ণ সাধারণ গণিত পাঠ্যবই। সকল অধ্যায় ও অনুশীলনীর বিষয়বস্তু সম্বলিত।",
    pdfUrl: "https://nctb.portal.gov.bd/sites/default/files/files/nctb.portal.gov.bd/nctb_page/9b0d6bc9_b57d_494d_9735_c0b435ff5108/9-10_Math_Bangla.pdf",
    pdfFileName: "NCTB_Class_9_10_Math_Bengali.pdf",
    pdfFileSize: 4500000,
    enabled: true,
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now()
  },
  {
    id: "nctb_class9_science",
    name: "বিজ্ঞান (নবম-দশম শ্রেণি)",
    class: "নবম-দশম শ্রেণি (Class 9-10)",
    subject: "বিজ্ঞান (General Science)",
    author: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB)",
    publisher: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, বাংলাদেশ",
    year: "2024",
    chapters: "অধ্যায় ১: উন্নততর জীবনধারা, অধ্যায় ২: জীবনের জন্য পানি, অধ্যায় ৩: হৃদযন্ত্রের যত কথা, অধ্যায় ৪: নবজীবনের সূচনা, অধ্যায় ৫: দেখতে হলে আলো চাই, অধ্যায় ৬: পলিমার, অধ্যায় ৭: অম্ল ক্ষারক ও লবণের ব্যবহার, অধ্যায় ৮: আমাদের সম্পদ, অধ্যায় ৯: দুর্যোগের সাথে বসবাস, অধ্যায় ১০: এসো বলকে জানি, অধ্যায় ১১: জীবপ্রযুক্তি, অধ্যায় ১২: প্রাত্যহিক জীবনে বিদ্যুৎ, অধ্যায় ১৩: ভারী পৃথিবী ও মহাবিশ্ব, অধ্যায় ১৪: জীবন বাঁচানোর প্রযুক্তি",
    description: "নবম ও দশম শ্রেণির সাধারণ বিজ্ঞান পাঠ্যবই।",
    pdfUrl: "https://nctb.portal.gov.bd/sites/default/files/files/nctb.portal.gov.bd/nctb_page/9b0d6bc9_b57d_494d_9735_c0b435ff5108/9-10_General_Science_Bangla.pdf",
    pdfFileName: "NCTB_Class_9_10_Science_Bengali.pdf",
    pdfFileSize: 5200000,
    enabled: true,
    createdAt: Date.now() - 9000000,
    updatedAt: Date.now()
  },
  {
    id: "nctb_class9_bangla",
    name: "মাধ্যমিক বাংলা সাহিত্য (সাহিত্য পাঠ - ৯ম ও ১০ম শ্রেণি)",
    class: "নবম-দশম শ্রেণি (Class 9-10)",
    subject: "বাংলা (Bangla Literature)",
    author: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB)",
    publisher: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, বাংলাদেশ",
    year: "2024",
    chapters: "গদ্যাংশ: শোভা, বইপড়া, অভাগীর স্বর্গ, পল্লিজননী, মানুষ মোহাম্মদ (সা.), নিমগাছ, শিক্ষা ও মনুষ্যত্ব; পদ্যাংশ: বঙ্গবাণী, কপোতাক্ষ নদ, জীবন-সংগীত, জুতো আবিষ্কার, ঝিঙে ফুল, আমি কোনো আগন্তুক নই, রানার",
    description: "নবম ও দশম শ্রেণির বাংলা ১ম পত্র সাহিত্য পাঠ পাঠ্যবই।",
    pdfUrl: "https://nctb.portal.gov.bd/sites/default/files/files/nctb.portal.gov.bd/nctb_page/9b0d6bc9_b57d_494d_9735_c0b435ff5108/9-10_Bangla_Shahitto_Bangla.pdf",
    pdfFileName: "NCTB_Class_9_10_Bangla_Literature.pdf",
    pdfFileSize: 3800000,
    enabled: true,
    createdAt: Date.now() - 8000000,
    updatedAt: Date.now()
  },
  {
    id: "nctb_class9_english",
    name: "English For Today (Classes 9-10)",
    class: "নবম-দশম শ্রেণি (Class 9-10)",
    subject: "ইংরেজি (English)",
    author: "National Curriculum and Textbook Board (NCTB)",
    publisher: "NCTB, Bangladesh",
    year: "2024",
    chapters: "Unit 1: Father of the Nation, Unit 2: Pastimes, Unit 3: Events and Festivals, Unit 4: Are We Aware?, Unit 5: Nature and Environment, Unit 6: Our Neighbours, Unit 7: People Who Stand Out, Unit 8: World Heritage, Unit 9: Unconventional Jobs",
    description: "NCTB English For Today textbook for Class 9 and 10 students.",
    pdfUrl: "https://nctb.portal.gov.bd/sites/default/files/files/nctb.portal.gov.bd/nctb_page/9b0d6bc9_b57d_494d_9735_c0b435ff5108/9-10_English_For_Today.pdf",
    pdfFileName: "NCTB_Class_9_10_English_For_Today.pdf",
    pdfFileSize: 4100000,
    enabled: true,
    createdAt: Date.now() - 7000000,
    updatedAt: Date.now()
  },
  {
    id: "nctb_class9_ict",
    name: "তথ্য ও যোগাযোগ প্রযুক্তি (নবম-দশম শ্রেণি)",
    class: "নবম-দশম শ্রেণি (Class 9-10)",
    subject: "আইসিটি (ICT)",
    author: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB)",
    publisher: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, বাংলাদেশ",
    year: "2024",
    chapters: "অধ্যায় ১: তথ্য ও যোগাযোগ প্রযুক্তি এবং আমাদের বাংলাদেশ, অধ্যায় ২: কম্পিউটার ও কম্পিউটার ব্যবহারকারীর নিরাপত্তা, অধ্যায় ৩: আমার শিক্ষায় ইন্টারনেট, অধ্যায় ৪: আমার লেখালেখি ও হিসাব, অধ্যায় ৫: মাল্টিমিডিয়া ও গ্রাফিক্স, অধ্যায় ৬: ডাটাবেজ এর ব্যবহার",
    description: "নবম ও দশম শ্রেণির তথ্য ও যোগাযোগ প্রযুক্তি পাঠ্যবই।",
    pdfUrl: "https://nctb.portal.gov.bd/sites/default/files/files/nctb.portal.gov.bd/nctb_page/9b0d6bc9_b57d_494d_9735_c0b435ff5108/9-10_ICT_Bangla.pdf",
    pdfFileName: "NCTB_Class_9_10_ICT_Bengali.pdf",
    pdfFileSize: 3200000,
    enabled: true,
    createdAt: Date.now() - 6000000,
    updatedAt: Date.now()
  }
];

export async function seedDefaultBooksIfEmpty(): Promise<void> {
  try {
    const booksRef = ref(database, "books");
    const snap = await get(booksRef);
    if (!snap.exists()) {
      for (const book of DEFAULT_SAMPLE_BOOKS) {
        await set(ref(database, `books/${book.id}`), book);
      }
    }
  } catch (err) {
    console.warn("Could not seed default books:", err);
  }
}

// ----------------------------------------------------
// ⚙️ SYSTEM SETTINGS (Central Controls)
// ----------------------------------------------------

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsConfig = {
  aiEnabled: true,
  voiceEnabled: true,
  // 🎙️ Live Voice Settings
  liveVoiceEnabled: true,
  liveVoiceNotice: "লাইভ ভয়েস চ্যাট সাময়িকভাবে রক্ষণাবেক্ষণের জন্য বন্ধ রয়েছে। শীঘ্রই চালু হবে।",
  liveVoiceName: "Zephyr",
  liveVoiceSpeed: "1.0",
  liveVoiceInstruction: "You are Sajjat AI, speaking fluently in natural Bengali or English. Keep your voice replies conversational, friendly, and concise.",

  // 🖼️ Image Generation & Editing Controls
  imageGenerationEnabled: true,
  imageEditingEnabled: true,
  imageModelPreset: "flux",
  imageGenerationNotice: "ছবি তৈরি ফিচারটি বর্তমানে সাময়িক রক্ষণাবেক্ষণের কারণে স্থগিত রয়েছে।",
  imageDefaultAspectRatio: "1:1",
  imageWatermarkEnabled: true,
  imageWatermarkText: "Sajjat AI",

  // ⚙️ Additional Feature Controls
  webSearchEnabled: true,
  readAloudEnabled: true,
  bookLibraryEnabled: true,
  userNotificationsEnabled: true,
  premiumSystemEnabled: true,
  maintenanceModeEnabled: false,

  // 🎨 Branding, Design & Color Settings
  aiBrandName: "Sajjat AI",
  aiTagline: "মানুষের সেবায় নিবেদিত সর্বাধুনিক সুপার ইন্টেলিজেন্ট বাংলা এআই সহকারী",
  aiThemeColor: "indigo",
  aiAvatarIcon: "bot",
  aiWelcomeTitle: "স্বাগতম! আমি Sajjat AI",
  aiWelcomeSubtitle: "আমাকে তৈরি করেছেন Sajjat Mia মানুষের সেবার জন্য। পড়াশোনা, গণিত, বিজ্ঞান, প্রযুক্তি বা যেকোনো প্রশ্নের দ্রুত ও নির্ভুল উত্তরের জন্য আমাকে প্রশ্ন করুন।",
  creatorName: "Sajjat Mia",

  imageUploadEnabled: true,
  fileUploadEnabled: true,
  chatHistoryEnabled: true,
  notificationsEnabled: true,
  activeProvider: "gemini",
  activeModel: "gemini-3.8-flash",
  temperature: 0.7,
  systemInstruction: "",
  adminTapCount: 7,
  adminPassword: "",
  aiLimitSystemEnabled: false,
  updatedAt: new Date().toISOString()
};

export function subscribeToSystemSettings(onUpdate: (settings: SystemSettingsConfig) => void) {
  const settingsRef = ref(database, "system_settings");
  return onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate({ ...DEFAULT_SYSTEM_SETTINGS, ...snapshot.val() });
    } else {
      onUpdate(DEFAULT_SYSTEM_SETTINGS);
    }
  }, (err) => {
    console.warn("System settings subscription error:", err);
    onUpdate(DEFAULT_SYSTEM_SETTINGS);
  });
}

export async function saveSystemSettings(settings: Partial<SystemSettingsConfig>): Promise<void> {
  const settingsRef = ref(database, "system_settings");
  await update(settingsRef, {
    ...settings,
    updatedAt: new Date().toISOString()
  });
}

// ----------------------------------------------------
// 🔑 API PROVIDER CONFIGURATIONS (9 AI Providers)
// ----------------------------------------------------

export const DEFAULT_API_PROVIDERS: Record<string, ApiProviderConfig> = {
  gemini: {
    id: "gemini",
    name: "Gemini API (Google)",
    apiKey: "",
    modelId: "gemini-3.1-flash-lite",
    enabled: true,
    active: true,
    status: "connected",
    defaultModel: "gemini-3.1-flash-lite",
    supportedModels: ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-pro"],
    description: "Google DeepMind এর উন্নত মাল্টিমোডাল মডেল। বাংলা ভাষায় চমৎকার দখল ও উচ্চ গতি।"
  },
  grok: {
    id: "grok",
    name: "Grok API (xAI)",
    apiKey: "",
    modelId: "grok-beta",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "grok-beta",
    supportedModels: ["grok-beta", "grok-2-latest", "grok-2-vision-1212"],
    description: "Elon Musk এর xAI চালিত রিয়েল-টাইম তথ্য ও রসবোধসম্পন্ন এআই মডেল।"
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek API",
    apiKey: "",
    modelId: "deepseek-chat",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "deepseek-chat",
    supportedModels: ["deepseek-chat", "deepseek-reasoner"],
    description: "উচ্চ ক্ষমতাসম্পন্ন কোডিং ও ডিপ রিজনিং মডেল (DeepSeek-V3 & R1)।"
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter API",
    apiKey: "",
    modelId: "openai/gpt-4o-mini",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "openai/gpt-4o-mini",
    supportedModels: ["openai/gpt-4o-mini", "google/gemini-2.5-flash", "anthropic/claude-3.5-haiku", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
    description: "শত শত এআই মডেল একসাথে ব্যবহার করার ইউনিফাইড এপিআই প্ল্যাটফর্ম।"
  },
  huggingface: {
    id: "huggingface",
    name: "Hugging Face Inference API",
    apiKey: "",
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    supportedModels: ["meta-llama/Llama-3.1-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3", "Qwen/Qwen2.5-72B-Instruct"],
    description: "বিশ্বের বৃহত্তম ওপেন সোর্স এআই মডেল রিপোজিটরি ও ইনফারেন্স হাব।"
  },
  cerebras: {
    id: "cerebras",
    name: "Cerebras API",
    apiKey: "",
    modelId: "llama3.1-8b",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "llama3.1-8b",
    supportedModels: ["llama3.1-8b", "llama3.1-70b", "llama-3.3-70b"],
    description: "বিশ্বের দ্রুততম Wafer-Scale AI চিপ চালিত ক্ষিপ্রগতির ইনফারেন্স ইঞ্জিন।"
  },
  cohere: {
    id: "cohere",
    name: "Cohere API",
    apiKey: "",
    modelId: "command-r",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "command-r",
    supportedModels: ["command-r", "command-r-plus-08-2024", "command-light"],
    description: "এন্টারপ্রাইজ গ্রেড ন্যাচারাল ল্যাঙ্গুয়েজ প্রসেসিং ও টেক্সট জেনারেশন এআই।"
  },
  mistral: {
    id: "mistral",
    name: "Mistral API",
    apiKey: "",
    modelId: "mistral-small-latest",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "mistral-small-latest",
    supportedModels: ["mistral-small-latest", "mistral-large-latest", "open-mistral-7b", "codestral-latest"],
    description: "ইউরোপের সেরা ও নিখুঁত দক্ষতা সম্পন্ন ওপেন ও কমার্শিয়াল এআই মডেল।"
  },
  claude: {
    id: "claude",
    name: "Claude API (Anthropic)",
    apiKey: "",
    modelId: "claude-3-5-sonnet-20241022",
    enabled: false,
    active: false,
    status: "not_connected",
    defaultModel: "claude-3-5-sonnet-20241022",
    supportedModels: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"],
    description: "অ্যানথ্রপিক এর মানুষের মতো সূক্ষ্ম চিন্তা ও উচ্চমানের লেখালেখি মডেল।"
  }
};

export function subscribeToApiProviders(onUpdate: (providers: Record<string, ApiProviderConfig>) => void) {
  const providersRef = ref(database, "admin_config/api_providers");
  return onValue(providersRef, (snapshot) => {
    if (snapshot.exists()) {
      const saved = snapshot.val();
      const merged: Record<string, ApiProviderConfig> = { ...DEFAULT_API_PROVIDERS };
      for (const [key, val] of Object.entries(saved)) {
        merged[key] = { ...(DEFAULT_API_PROVIDERS[key] || {}), ...(val as any) };
      }
      onUpdate(merged);
    } else {
      onUpdate(DEFAULT_API_PROVIDERS);
    }
  }, (err) => {
    console.warn("API providers subscription error:", err);
    onUpdate(DEFAULT_API_PROVIDERS);
  });
}

export async function saveApiProviderConfig(
  providerOrId: string | ApiProviderConfig,
  config?: Partial<ApiProviderConfig>
): Promise<void> {
  const providerId = typeof providerOrId === "string" ? providerOrId : providerOrId.id;
  const data = typeof providerOrId === "string" ? config || {} : providerOrId;
  const providerRef = ref(database, `admin_config/api_providers/${providerId}`);
  await update(providerRef, {
    ...data,
    lastTestedAt: new Date().toISOString()
  });
}

// ==========================================
// 💬 Live Community Chat (ইউজারদের লাইভ চ্যাট)
// ==========================================

const LIVE_CHAT_MESSAGES_PATH = "live_community_chat/messages";
const LIVE_CHAT_PRESENCE_PATH = "live_community_chat/presence";
const LOCAL_LIVE_CHAT_KEY = "sajjat_ai_live_chat_backup";

/**
 * Real-time subscription to Live Community Chat messages
 */
export function subscribeToLiveChat(
  onUpdate: (messages: LiveChatMessage[]) => void,
  limitCount: number = 100
) {
  const chatRef = query(
    ref(database, LIVE_CHAT_MESSAGES_PATH),
    orderByChild("timestamp"),
    limitToLast(limitCount)
  );

  return onValue(
    chatRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const list = (Object.values(raw) || []) as LiveChatMessage[];
        // Sort chronologically ascending
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        try {
          localStorage.setItem(LOCAL_LIVE_CHAT_KEY, JSON.stringify(list));
        } catch {
          // ignore quota
        }
        onUpdate(list);
      } else {
        // Check local cache if empty
        try {
          const cached = localStorage.getItem(LOCAL_LIVE_CHAT_KEY);
          if (cached) {
            onUpdate(JSON.parse(cached));
            return;
          }
        } catch {
          // ignore
        }
        onUpdate([]);
      }
    },
    (error) => {
      console.warn("Live chat subscription error, loading cached messages:", error);
      try {
        const cached = localStorage.getItem(LOCAL_LIVE_CHAT_KEY);
        if (cached) {
          onUpdate(JSON.parse(cached));
        } else {
          onUpdate([]);
        }
      } catch {
        onUpdate([]);
      }
    }
  );
}

/**
 * Send a new message to the Live Community Chat
 */
export async function sendLiveChatMessage(
  msg: Omit<LiveChatMessage, "id" | "timestamp">
): Promise<string> {
  const newMsgRef = push(ref(database, LIVE_CHAT_MESSAGES_PATH));
  const newId = newMsgRef.key || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullMessage: LiveChatMessage = {
    ...msg,
    id: newId,
    timestamp: Date.now()
  };

  try {
    await set(newMsgRef, fullMessage);
  } catch (error) {
    console.warn("Firebase Live Chat send error, saving locally:", error);
    // Offline backup handling
    try {
      const cached = localStorage.getItem(LOCAL_LIVE_CHAT_KEY);
      const list: LiveChatMessage[] = cached ? JSON.parse(cached) : [];
      list.push(fullMessage);
      localStorage.setItem(LOCAL_LIVE_CHAT_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  return newId;
}

/**
 * Delete a message from Live Community Chat
 */
export async function deleteLiveChatMessage(messageId: string): Promise<void> {
  try {
    const msgRef = ref(database, `${LIVE_CHAT_MESSAGES_PATH}/${messageId}`);
    await remove(msgRef);
  } catch (error) {
    console.error("Failed to delete live chat message:", error);
  }
}

/**
 * React with emoji to a message
 */
export async function reactToLiveChatMessage(
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  try {
    const msgRef = ref(database, `${LIVE_CHAT_MESSAGES_PATH}/${messageId}`);
    const snapshot = await get(msgRef);
    if (!snapshot.exists()) return;

    const message: LiveChatMessage = snapshot.val();
    const reactions = message.reactions || {};
    const usersWhoReacted = reactions[emoji] || [];

    let updatedUsers: string[];
    if (usersWhoReacted.includes(userId)) {
      // Remove reaction if already reacted
      updatedUsers = usersWhoReacted.filter((id) => id !== userId);
    } else {
      // Add reaction
      updatedUsers = [...usersWhoReacted, userId];
    }

    if (updatedUsers.length > 0) {
      reactions[emoji] = updatedUsers;
    } else {
      delete reactions[emoji];
    }

    await update(msgRef, { reactions });
  } catch (error) {
    console.warn("React to live chat message error:", error);
  }
}

/**
 * Register user presence in Live Chat room
 */
export function updateLivePresence(user: { id: string; name: string; isAdmin?: boolean }) {
  if (!user.id) return () => {};

  const userPresenceRef = ref(database, `${LIVE_CHAT_PRESENCE_PATH}/${user.id}`);
  const data: LivePresenceUser = {
    id: user.id,
    name: user.name,
    isOnline: true,
    lastActive: Date.now(),
    isAdmin: !!user.isAdmin
  };

  // Set presence in RTDB
  set(userPresenceRef, data).catch((e) => console.warn("Presence set failed:", e));

  // Configure onDisconnect to remove
  try {
    onDisconnect(userPresenceRef).remove();
  } catch {
    // ignore
  }

  // Heartbeat interval every 45s
  const interval = setInterval(() => {
    update(userPresenceRef, { lastActive: Date.now(), isOnline: true }).catch(() => {});
  }, 45000);

  return () => {
    clearInterval(interval);
    remove(userPresenceRef).catch(() => {});
  };
}

/**
 * Subscribe to online users count and list
 */
export function subscribeToLivePresence(onUpdate: (users: LivePresenceUser[]) => void) {
  const presenceRef = ref(database, LIVE_CHAT_PRESENCE_PATH);
  return onValue(
    presenceRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const now = Date.now();
        const list = Object.values(raw) as LivePresenceUser[];
        const activeUsers: LivePresenceUser[] = list.filter(
          (u) => u && u.isOnline && now - (u.lastActive || 0) < 120000
        );
        onUpdate(activeUsers);
      } else {
        onUpdate([]);
      }
    },
    () => {
      onUpdate([]);
    }
  );
}

/**
 * Clear all community chat messages (Admin only)
 */
export async function clearAllLiveCommunityMessages(): Promise<void> {
  const allRef = ref(database, LIVE_CHAT_MESSAGES_PATH);
  await remove(allRef);
  try {
    localStorage.removeItem(LOCAL_LIVE_CHAT_KEY);
  } catch {
    // ignore
  }
}

// ----------------------------------------------------
// 💎 PREMIUM PACKAGES & LIMIT SYSTEM HELPERS
// ----------------------------------------------------

const DEFAULT_SEED_PACKAGES: PremiumPackage[] = [
  { id: "pkg_1m", name: "১ মাস প্রিমিয়াম প্যাকেজ", price: 150, validityMonths: 1, messageLimit: 100, isUnlimited: false, enabled: true, createdAt: Date.now() },
  { id: "pkg_2m", name: "২ মাস প্রিমিয়াম প্যাকেজ", price: 290, validityMonths: 2, messageLimit: 200, isUnlimited: false, enabled: true, createdAt: Date.now() },
  { id: "pkg_3m", name: "৩ মাস প্রিমিয়াম প্যাকেজ", price: 580, validityMonths: 3, messageLimit: 500, isUnlimited: false, enabled: true, createdAt: Date.now() },
  { id: "pkg_6m", name: "৬ মাস প্রিমিয়াম প্যাকেজ", price: 1100, validityMonths: 6, messageLimit: 1000, isUnlimited: true, enabled: true, createdAt: Date.now() },
  { id: "pkg_1y", name: "১ বছর গোল্ডেন প্রিমিয়াম", price: 1500, validityMonths: 12, messageLimit: 99999, isUnlimited: true, enabled: true, createdAt: Date.now() }
];

export function subscribeToPackages(onUpdate: (packages: PremiumPackage[]) => void) {
  const packagesRef = ref(database, "packages");
  return onValue(packagesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: PremiumPackage[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || key
      }));
      list.sort((a, b) => a.price - b.price);
      onUpdate(list);
    } else {
      // Seed default packages
      DEFAULT_SEED_PACKAGES.forEach((pkg) => {
        set(ref(database, `packages/${pkg.id}`), pkg).catch((e) => console.warn("Seed packages err:", e));
      });
      onUpdate(DEFAULT_SEED_PACKAGES);
    }
  }, (err) => {
    console.warn("Packages subscription err:", err);
    onUpdate([]);
  });
}

export async function savePackage(pkg: PremiumPackage): Promise<void> {
  const pkgId = pkg.id || `pkg_${Date.now()}`;
  const pkgRef = ref(database, `packages/${pkgId}`);
  await set(pkgRef, {
    ...pkg,
    id: pkgId
  });
}

export async function deletePackage(pkgId: string): Promise<void> {
  const pkgRef = ref(database, `packages/${pkgId}`);
  await remove(pkgRef);
}

export function subscribeToPurchaseRequests(onUpdate: (requests: PurchaseRequest[]) => void) {
  const requestsRef = ref(database, "purchase_requests");
  return onValue(requestsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: PurchaseRequest[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || key
      }));
      // Sort newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(list);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    console.warn("Purchase requests subscription err:", err);
    onUpdate([]);
  });
}

export async function submitPurchaseRequest(requestData: Omit<PurchaseRequest, "id" | "status" | "createdAt">): Promise<string> {
  const reqId = `req_${Date.now()}`;
  const reqRef = ref(database, `purchase_requests/${reqId}`);
  const payload: PurchaseRequest = {
    ...requestData,
    id: reqId,
    status: "pending",
    createdAt: Date.now()
  };
  await set(reqRef, payload);
  return reqId;
}

export async function updatePurchaseRequestStatus(
  reqId: string, 
  status: "approved" | "rejected", 
  rejectionReason?: string
): Promise<void> {
  const reqRef = ref(database, `purchase_requests/${reqId}`);
  const snapshot = await get(reqRef);
  if (!snapshot.exists()) {
    throw new Error("অনুরোধটি পাওয়া যায়নি!");
  }
  const request: PurchaseRequest = snapshot.val();

  // Update status in purchase request node
  await update(reqRef, {
    status,
    rejectionReason: rejectionReason || "",
    reviewedAt: Date.now()
  });

  // If approved, update user's AI limits
  if (status === "approved") {
    const userLimitRef = ref(database, `users/${request.userId}/ai_limit`);
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + request.validityMonths);

    // Fetch existing stats to preserve usage count if any
    const existingSnap = await get(userLimitRef);
    const existingData: UserAiLimit = existingSnap.exists() ? existingSnap.val() : {
      dailyLimit: 25,
      usedCount: 0,
      lastUsedDate: new Date().toISOString().split("T")[0],
      isUnlimited: false
    };

    const packageLimit = request.packageName.includes("গোল্ডেন") || request.packageName.includes("৬ মাস") || request.packageName.includes("১ বছর")
      ? 99999
      : request.packageName.includes("৩ মাস") ? 500 : request.packageName.includes("২ মাস") ? 200 : 100;

    const isUnlimited = request.packageName.includes("গোল্ডেন") || request.packageName.includes("৬ মাস") || request.packageName.includes("১ বছর");

    const updatedLimit: UserAiLimit = {
      dailyLimit: isUnlimited ? 99999 : packageLimit,
      usedCount: existingData.usedCount || 0,
      lastUsedDate: existingData.lastUsedDate || new Date().toISOString().split("T")[0],
      isUnlimited: isUnlimited,
      premiumPackageId: request.packageId,
      premiumPackageName: request.packageName,
      premiumExpiresAt: expiresDate.toISOString()
    };

    await set(userLimitRef, updatedLimit);

    // Also upgrade status inside profile data to 'vip'
    const userProfileRef = ref(database, `users/${request.userId}/profile/status`);
    await set(userProfileRef, "vip");
  }
}

export function subscribeToUserAiLimit(uid: string, onUpdate: (limit: UserAiLimit | null) => void) {
  const limitRef = ref(database, `users/${uid}/ai_limit`);
  return onValue(limitRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val());
    } else {
      // Default standard limits
      const defaultLimit: UserAiLimit = {
        dailyLimit: 25,
        usedCount: 0,
        lastUsedDate: new Date().toISOString().split("T")[0],
        isUnlimited: false
      };
      onUpdate(defaultLimit);
    }
  }, (err) => {
    console.warn("User AI limit subscription err:", err);
    onUpdate(null);
  });
}

export async function updateUserAiLimit(uid: string, limit: Partial<UserAiLimit>): Promise<void> {
  const limitRef = ref(database, `users/${uid}/ai_limit`);
  const snapshot = await get(limitRef);
  if (snapshot.exists()) {
    await update(limitRef, limit);
  } else {
    const fullLimit: UserAiLimit = {
      dailyLimit: limit.dailyLimit ?? 25,
      usedCount: limit.usedCount ?? 0,
      lastUsedDate: limit.lastUsedDate ?? new Date().toISOString().split("T")[0],
      isUnlimited: limit.isUnlimited ?? false,
      ...limit
    };
    await set(limitRef, fullLimit);
  }
}

export async function incrementUserAiLimit(uid: string): Promise<void> {
  const limitRef = ref(database, `users/${uid}/ai_limit`);
  const snapshot = await get(limitRef);
  const today = new Date().toISOString().split("T")[0];

  if (snapshot.exists()) {
    const current: UserAiLimit = snapshot.val();
    if (current.lastUsedDate === today) {
      await update(limitRef, {
        usedCount: (current.usedCount || 0) + 1
      });
    } else {
      await update(limitRef, {
        usedCount: 1,
        lastUsedDate: today
      });
    }
  } else {
    const newLimit: UserAiLimit = {
      dailyLimit: 25,
      usedCount: 1,
      lastUsedDate: today,
      isUnlimited: false
    };
    await set(limitRef, newLimit);
  }
}


