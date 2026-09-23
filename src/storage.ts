import { ChatSession, ChatMessage } from "./types";

const GUEST_STORAGE_KEY = "sajjat_ai_guest_sessions";
const MAX_SESSIONS = 25;
const MAX_MESSAGES_PER_SESSION = 50;

/**
 * Sanitize a message for local storage to save space and avoid quota limits.
 * We strip huge raw base64 data and truncate overly long file preview texts.
 */
function sanitizeMessageForStorage(msg: ChatMessage): ChatMessage {
  const sanitized: ChatMessage = { ...msg };

  // If there is an image base64, we don't store megabytes of raw image data in localStorage
  if (sanitized.imageBase64 && sanitized.imageBase64.length > 5000) {
    // Keep a lightweight placeholder flag instead of megabytes of raw data
    sanitized.imageBase64 = undefined;
  }

  // If attached file has large base64 or content, strip the raw binary
  if (sanitized.attachedFile) {
    sanitized.attachedFile = {
      ...sanitized.attachedFile,
      base64: undefined,
      content: sanitized.attachedFile.content
        ? sanitized.attachedFile.content.slice(0, 1000)
        : undefined,
    };
  }

  return sanitized;
}

/**
 * Sanitize a list of chat sessions before saving to localStorage.
 */
function sanitizeSessions(sessions: ChatSession[], sessionLimit = MAX_SESSIONS): ChatSession[] {
  return sessions.slice(0, sessionLimit).map((session) => ({
    ...session,
    messages: (session.messages || [])
      .slice(-MAX_MESSAGES_PER_SESSION)
      .map(sanitizeMessageForStorage),
  }));
}

/**
 * Safely retrieve guest chat sessions from localStorage.
 */
export function safeGetGuestSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn("Error reading guest sessions from localStorage:", err);
    return [];
  }
}

/**
 * Safely save guest chat sessions to localStorage with automatic quota management,
 * payload compression, and fallback trimming.
 */
export function safeSaveGuestSessions(sessions: ChatSession[]): void {
  try {
    // Attempt 1: Standard sanitization (max 25 sessions)
    const sanitized = sanitizeSessions(sessions, MAX_SESSIONS);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err: any) {
    console.warn("Storage quota warning on initial save attempt, applying progressive trimming...", err?.message);

    try {
      // Attempt 2: More aggressive trimming (keep last 10 sessions)
      const trimmed = sanitizeSessions(sessions, 10);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err2: any) {
      console.warn("Storage quota warning on attempt 2, trimming to latest 3 sessions...", err2?.message);

      try {
        // Attempt 3: Keep only the 3 most recent sessions with stripped payloads
        const minimal = sanitizeSessions(sessions, 3);
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(minimal));
      } catch (err3: any) {
        console.warn("Storage full. Clearing old keys and saving current active session only.", err3?.message);
        try {
          // Clear possible stale keys and save only top 1
          localStorage.removeItem(GUEST_STORAGE_KEY);
          const single = sanitizeSessions(sessions, 1);
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(single));
        } catch {
          // Gracefully suppress error so UI doesn't crash
        }
      }
    }
  }
}

/**
 * Safely clear guest chat sessions from localStorage.
 */
export function safeClearGuestSessions(): void {
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch (err) {
    console.warn("Error removing guest sessions:", err);
  }
}
