import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";

export const AUTHORIZED_ADMIN_EMAIL = "sajjatmia17@gmail.com";
const FIREBASE_PROJECT_ID = "sajjat-ai-4b5ef";
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const PASSCODE_FILE = path.join(process.cwd(), ".sajjat-admin-passcode.json");
const DEFAULT_ADMIN_PANEL_PASSCODE = (process.env.ADMIN_PANEL_PASSCODE || "1711").trim();

function hashPasscode(passcode: string, salt: string): Buffer {
  return crypto.createHash("sha256").update(`${salt}:${passcode}`).digest();
}

function getStoredPasscodeRecord(): { salt: string; hashHex: string } {
  try {
    if (fs.existsSync(PASSCODE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PASSCODE_FILE, "utf8"));
      if (parsed?.salt && parsed?.hashHex) {
        return { salt: String(parsed.salt), hashHex: String(parsed.hashHex) };
      }
    }
  } catch {
    // ignore read errors and fall back to env/default
  }
  const salt = "sajjat-admin-gate-v1";
  return {
    salt,
    hashHex: hashPasscode(DEFAULT_ADMIN_PANEL_PASSCODE, salt).toString("hex"),
  };
}

export function verifyAdminPanelPasscode(inputPasscode: string): boolean {
  const candidate = String(inputPasscode || "").trim();
  if (!candidate) return false;
  const record = getStoredPasscodeRecord();
  const expectedBuf = Buffer.from(record.hashHex, "hex");
  const candidateBuf = hashPasscode(candidate, record.salt);
  if (expectedBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}

export function updateAdminPanelPasscode(newPasscode: string): void {
  const trimmed = String(newPasscode || "").trim();
  if (trimmed.length < 4) {
    throw new Error("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hashHex = hashPasscode(trimmed, salt).toString("hex");
  fs.writeFileSync(
    PASSCODE_FILE,
    JSON.stringify({ salt, hashHex, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  authTime?: number;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  status: "success" | "denied" | "error";
  actorEmail: string;
  actorUid?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  details: string;
  timestamp: string;
}

// In-memory cert cache honoring Google's Cache-Control max-age
let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

// In-memory audit trail (kept strictly on server; admin-only readable)
const auditLogs: AdminAuditEntry[] = [];

export function recordAdminAudit(entry: Omit<AdminAuditEntry, "id" | "timestamp">): AdminAuditEntry {
  const fullEntry: AdminAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(fullEntry);
  if (auditLogs.length > 250) {
    auditLogs.length = 250;
  }
  return fullEntry;
}

export function getAdminAuditLogs(limit = 100): AdminAuditEntry[] {
  return auditLogs.slice(0, Math.max(1, Math.min(250, limit)));
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLen), "base64");
}

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Firebase public keys (${res.status})`);
  }

  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  const data = (await res.json()) as Record<string, string>;
  cachedCerts = data;
  certsExpiresAt = now + Math.max(60, maxAgeSeconds) * 1000;
  return cachedCerts;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Authentication token missing.");
  }

  const parts = idToken.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed authentication token.");
  }

  const [headerB64, payloadB64, sigB64] = parts;
  let header: any;
  let payload: any;
  try {
    header = JSON.parse(decodeBase64Url(headerB64).toString("utf8"));
    payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8"));
  } catch {
    throw new Error("Invalid token encoding.");
  }

  if (header?.alg !== "RS256" || !header?.kid) {
    throw new Error("Unsupported token signing algorithm.");
  }

  const certs = await fetchGooglePublicCerts();
  let certPem = certs[header.kid];
  if (!certPem) {
    // Force refresh once in case of key rotation
    certsExpiresAt = 0;
    const refreshed = await fetchGooglePublicCerts();
    certPem = refreshed[header.kid];
  }
  if (!certPem) {
    throw new Error("Unknown token signing certificate.");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signatureValid = verifier.verify(certPem, decodeBase64Url(sigB64));
  if (!signatureValid) {
    throw new Error("Invalid token cryptographic signature.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Authentication session expired. Please sign in again.");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 300) {
    throw new Error("Token issued-at claim is invalid.");
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error("Token audience mismatch.");
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error("Token issuer mismatch.");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Token subject missing.");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : "",
    emailVerified: Boolean(payload.email_verified),
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    authTime: typeof payload.auth_time === "number" ? payload.auth_time : undefined,
  };
}

export function extractBearerToken(req: Request): string {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader !== "string") return "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function isAuthorizedAdminUser(user: VerifiedFirebaseUser): boolean {
  return (
    user.email.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() &&
    user.emailVerified === true
  );
}

export interface AdminRequest extends Request {
  verifiedAdmin?: VerifiedFirebaseUser;
}

export async function requireAdminMiddleware(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  const ip = getClientIp(req);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 120);

  if (!token) {
    recordAdminAudit({
      action: "ADMIN_AUTH_REQUIRED",
      status: "denied",
      actorEmail: "anonymous",
      ip,
      userAgent,
      path: req.originalUrl || req.path,
      details: "Missing Bearer ID token on protected admin route.",
    });
    res.status(401).json({
      success: false,
      error: "Access Denied: অ্যাডমিন অথেনটিকেশন টোকেন অনুপস্থিত। অনুগ্রহ করে অনুমোদিত অ্যাডমিন হিসেবে লগইন করুন।",
    });
    return;
  }

  try {
    const verified = await verifyFirebaseIdToken(token);
    if (!isAuthorizedAdminUser(verified)) {
      recordAdminAudit({
        action: "UNAUTHORIZED_ADMIN_ACCESS",
        status: "denied",
        actorEmail: verified.email || "unknown",
        actorUid: verified.uid,
        ip,
        userAgent,
        path: req.originalUrl || req.path,
        details: `Non-admin or unverified account rejected (verified=${verified.emailVerified}).`,
      });
      res.status(403).json({
        success: false,
        error: `Access Denied: শুধুমাত্র অনুমোদিত অ্যাডমিন (${AUTHORIZED_ADMIN_EMAIL}) এই প্যানেলে প্রবেশ করতে পারবেন।`,
      });
      return;
    }

    req.verifiedAdmin = verified;
    next();
  } catch (err: any) {
    recordAdminAudit({
      action: "INVALID_ADMIN_TOKEN",
      status: "denied",
      actorEmail: "unverified",
      ip,
      userAgent,
      path: req.originalUrl || req.path,
      details: err?.message || "Invalid Firebase ID token.",
    });
    res.status(401).json({
      success: false,
      error: "Access Denied: অবৈধ বা মেয়াদোত্তীর্ণ অ্যাডমিন টোকেন। পুনরায় লগইন করুন।",
    });
  }
}

export async function verifyOptionalUserMiddleware(req: Request): Promise<VerifiedFirebaseUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    return null;
  }
}
