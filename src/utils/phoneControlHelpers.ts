export interface PhoneControlStatusResponse {
  ok: boolean;
  configured: boolean;
  runtime: "node-server" | "netlify-function" | "unknown";
  liveWsSupported: boolean;
  model: string;
  liveModel: string;
  message: string;
  setupGuide: {
    envVarName: string;
    netlifySteps: string[];
    aiStudioSteps: string[];
  } | null;
  timestamp: string;
}

export interface ScreenAnalysisResponse {
  success: boolean;
  errorCode?: "MISSING_API_KEY" | "INVALID_INPUT" | "API_ERROR";
  error?: string;
  model?: string;
  analysis?: {
    summary: string;
    whatIsOnScreen: string;
    nextSteps: string[];
    suggestedActionLabel: string;
    safetyNote?: string;
  };
}

export interface VoiceCommandResponse {
  success: boolean;
  errorCode?: "MISSING_API_KEY" | "INVALID_INPUT" | "API_ERROR";
  error?: string;
  model?: string;
  result?: {
    intent: "open_app" | "phone_search" | "analyze_screen" | "chat";
    appKey?: string;
    searchTopic?: string;
    spokenReply: string;
    steps: string[];
    limitationNote?: string;
  };
}

export interface LaunchableAppEntry {
  key: string;
  name: string;
  bnName: string;
  keywords: string[];
  appLink: string;
  androidIntentUrl?: string;
  webFallbackUrl: string;
  webFallbackLabel: string;
  manualInstruction: string;
}

export const LAUNCHABLE_APPS: LaunchableAppEntry[] = [
  {
    key: "whatsapp",
    name: "WhatsApp",
    bnName: "হোয়াটসঅ্যাপ",
    keywords: ["whatsapp", "হোয়াটসঅ্যাপ", "হোয়াটসঅ্যাপ", "ওয়াটসঅ্যাপ", "ওয়াসঅ্যাপ"],
    appLink: "https://wa.me/",
    androidIntentUrl: "intent://send#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=https%3A%2F%2Fweb.whatsapp.com;end",
    webFallbackUrl: "https://web.whatsapp.com",
    webFallbackLabel: "WhatsApp Web খুলুন",
    manualInstruction: "Android ফোনে WhatsApp অ্যাপ ইনস্টল থাকলে App Link বা Intent সরাসরি অ্যাপ খুলবে; না হলে WhatsApp Web খুলতে পারেন বা ফোনের App Drawer থেকে WhatsApp ওপেন করুন।",
  },
  {
    key: "facebook",
    name: "Facebook",
    bnName: "ফেসবুক",
    keywords: ["facebook", "fb", "ফেসবুক", "এফবি"],
    appLink: "https://www.facebook.com/",
    androidIntentUrl: "intent://#Intent;scheme=fb;package=com.facebook.katana;S.browser_fallback_url=https%3A%2F%2Fm.facebook.com;end",
    webFallbackUrl: "https://m.facebook.com",
    webFallbackLabel: "Facebook ওয়েব খুলুন",
    manualInstruction: "Android-এ Facebook অ্যাপ থাকলে App Link-এ খুলবে; অন্যথায় m.facebook.com ব্রাউজারে ব্যবহার করতে পারবেন।",
  },
  {
    key: "messenger",
    name: "Messenger",
    bnName: "মেসেঞ্জার",
    keywords: ["messenger", "মেসেঞ্জার"],
    appLink: "https://www.messenger.com/",
    androidIntentUrl: "intent://#Intent;scheme=fb-messenger;package=com.facebook.orca;S.browser_fallback_url=https%3A%2F%2Fwww.messenger.com;end",
    webFallbackUrl: "https://www.messenger.com",
    webFallbackLabel: "Messenger ওয়েব খুলুন",
    manualInstruction: "Messenger অ্যাপ ইনস্টল থাকলে সরাসরি খুলবে, না হলে messenger.com ওয়েবসাইট খুলুন।",
  },
  {
    key: "youtube",
    name: "YouTube",
    bnName: "ইউটিউব",
    keywords: ["youtube", "yt", "ইউটিউব"],
    appLink: "https://www.youtube.com/",
    androidIntentUrl: "intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=https%3A%2F%2Fm.youtube.com;end",
    webFallbackUrl: "https://m.youtube.com",
    webFallbackLabel: "YouTube ওয়েব খুলুন",
    manualInstruction: "YouTube App Link সাধারণত সরাসরি Android/iOS YouTube অ্যাপে নিয়ে যায়, না হলে m.youtube.com চালু হবে।",
  },
  {
    key: "instagram",
    name: "Instagram",
    bnName: "ইনস্টাগ্রাম",
    keywords: ["instagram", "insta", "ইনস্টাগ্রাম"],
    appLink: "https://www.instagram.com/",
    androidIntentUrl: "intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=https%3A%2F%2Fwww.instagram.com;end",
    webFallbackUrl: "https://www.instagram.com",
    webFallbackLabel: "Instagram ওয়েব খুলুন",
    manualInstruction: "Instagram অ্যাপ না খুললে ওয়েব ব্রাউজারে instagram.com ব্যবহার করুন।",
  },
  {
    key: "telegram",
    name: "Telegram",
    bnName: "টেলিগ্রাম",
    keywords: ["telegram", "টেলিগ্রাম"],
    appLink: "https://t.me/",
    androidIntentUrl: "intent://#Intent;scheme=tg;package=org.telegram.messenger;S.browser_fallback_url=https%3A%2F%2Fweb.telegram.org;end",
    webFallbackUrl: "https://web.telegram.org",
    webFallbackLabel: "Telegram Web খুলুন",
    manualInstruction: "Telegram অ্যাপ না থাকলে web.telegram.org ব্যবহার করতে পারেন।",
  },
  {
    key: "gmail",
    name: "Gmail",
    bnName: "জিমেইল",
    keywords: ["gmail", "email", "mail", "জিমেইল", "ইমেইল"],
    appLink: "https://mail.google.com/",
    androidIntentUrl: "intent://#Intent;package=com.google.android.gm;S.browser_fallback_url=https%3A%2F%2Fmail.google.com;end",
    webFallbackUrl: "https://mail.google.com",
    webFallbackLabel: "Gmail ওয়েব খুলুন",
    manualInstruction: "Gmail অ্যাপ না খুললে mail.google.com ওয়েব ভার্সন খুলুন।",
  },
  {
    key: "maps",
    name: "Google Maps",
    bnName: "গুগল ম্যাপস",
    keywords: ["maps", "google maps", "map", "ম্যাপ", "ম্যাপস"],
    appLink: "https://maps.google.com/",
    androidIntentUrl: "intent://maps.google.com/#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https%3A%2F%2Fmaps.google.com;end",
    webFallbackUrl: "https://maps.google.com",
    webFallbackLabel: "Google Maps ওয়েব খুলুন",
    manualInstruction: "Google Maps অ্যাপ না থাকলে ব্রাউজারে maps.google.com চালু হবে।",
  },
  {
    key: "playstore",
    name: "Google Play Store",
    bnName: "প্লে স্টোর",
    keywords: ["play store", "playstore", "প্লে স্টোর", "প্লে-স্টোর"],
    appLink: "https://play.google.com/store",
    androidIntentUrl: "intent://play.google.com/store#Intent;scheme=https;package=com.android.vending;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore;end",
    webFallbackUrl: "https://play.google.com/store",
    webFallbackLabel: "Play Store ওয়েব খুলুন",
    manualInstruction: "Android ফোনে এটি Play Store অ্যাপ ওপেন করবে; অন্য ডিভাইসে play.google.com খুলবে।",
  },
  {
    key: "imo",
    name: "IMO",
    bnName: "ইমো",
    keywords: ["imo", "ইমো"],
    appLink: "https://imo.im/",
    androidIntentUrl:
      "intent://#Intent;scheme=imo;package=com.imo.android.imoim;S.browser_fallback_url=https%3A%2F%2Fimo.im;end",
    webFallbackUrl: "https://imo.im",
    webFallbackLabel: "IMO ওয়েবসাইট খুলুন",
    manualInstruction:
      "Android ফোনে IMO অ্যাপ ইনস্টল থাকলে App Link / Intent সরাসরি IMO খুলবে; না হলে ফোনের App Drawer থেকে IMO চালু করুন।",
  },
  {
    key: "tiktok",
    name: "TikTok",
    bnName: "টিকটক",
    keywords: ["tiktok", "tik tok", "টিকটক"],
    appLink: "https://www.tiktok.com/",
    androidIntentUrl:
      "intent://www.tiktok.com/#Intent;scheme=https;package=com.zhiliaoapp.musically;S.browser_fallback_url=https%3A%2F%2Fwww.tiktok.com;end",
    webFallbackUrl: "https://www.tiktok.com",
    webFallbackLabel: "TikTok ওয়েব খুলুন",
    manualInstruction:
      "Android ফোনে TikTok অ্যাপ থাকলে সরাসরি খুলবে; অন্যথায় ব্রাউজারে tiktok.com ওয়েব ভার্সন চালু হবে।",
  },
  {
    key: "settings",
    name: "Phone Settings",
    bnName: "ফোন সেটিংস",
    keywords: ["phone settings", "system settings", "settings", "সেটিংস", "ফোন সেটিং"],
    appLink: "intent://#Intent;action=android.settings.SETTINGS;end",
    androidIntentUrl: "intent://#Intent;action=android.settings.SETTINGS;end",
    webFallbackUrl: "https://support.google.com/android/",
    webFallbackLabel: "Android Settings গাইড",
    manualInstruction:
      "ওয়েব ব্রাউজারের নিরাপত্তা সীমাবদ্ধতার কারণে অনেক ফোনে সরাসরি System Settings ওপেন ব্লক থাকে; না খুললে ফোনের App Drawer বা নোটিফিকেশন বারের ⚙️ আইকনে ট্যাপ করে Settings খুলুন।",
  },
  {
    key: "phone",
    name: "Phone Dialer",
    bnName: "ফোন ডায়ালার",
    keywords: ["phone", "dialer", "call", "ডায়ালার", "কল"],
    appLink: "tel:",
    webFallbackUrl: "tel:",
    webFallbackLabel: "ডায়ালার চালু করুন",
    manualInstruction:
      "মোবাইলে tel: লিংক ডিফল্ট ফোন ডায়ালার খুলে দেয়। ডেস্কটপ ব্রাউজারে এটি সমর্থিত নাও হতে পারে।",
  },
];

export interface PhoneSettingGuide {
  topic: string;
  title: string;
  keywords: string[];
  steps: string[];
}

export const PHONE_SETTING_GUIDES: PhoneSettingGuide[] = [
  {
    topic: "wifi",
    title: "Wi-Fi সেটিংস গাইড",
    keywords: ["wifi", "wi-fi", "ওয়াইফাই", "ওয়াইফাই", "ইন্টারনেট"],
    steps: [
      "ফোনের উপরের দিক থেকে নিচে সুইপ করে Quick Settings প্যানেল খুলুন অথবা ফোনের Settings অ্যাপ চালু করুন।",
      "Network & internet (অথবা Connections) অপশনে ট্যাপ করুন।",
      "Wi-Fi অপশনটি চালু (On) করে আপনার নেটওয়ার্ক বেছে নিন।",
    ],
  },
  {
    topic: "facebook_settings",
    title: "Facebook Settings গাইড",
    keywords: [
      "facebook settings",
      "fb settings",
      "ফেসবুক সেটিংস",
      "ফেসবুক পাসওয়ার্ড",
      "ফেসবুক প্রাইভেসি",
    ],
    steps: [
      "Facebook অ্যাপ বা m.facebook.com খুলে ডান পাশের উপরের Menu (☰ বা প্রোফাইল আইকন)-এ ট্যাপ করুন।",
      "নিচে স্ক্রল করে 'Settings & privacy' → 'Settings'-এ প্রবেশ করুন।",
      "পাসওয়ার্ড/লগইন সিকিউরিটির জন্য Accounts Center → Password and security, আর প্রাইভেসির জন্য Audience and visibility অংশ দেখুন।",
    ],
  },
  {
    topic: "bluetooth",
    title: "Bluetooth সেটিংস",
    keywords: ["bluetooth", "ব্লুটুথ"],
    steps: [
      "ফোনের Settings অ্যাপ খুলুন অথবা Quick Settings থেকে Bluetooth আইকন ধরে রাখুন।",
      "Connected devices (বা Connections → Bluetooth) অপশনে যান।",
      "Bluetooth চালু করে Pair new device-এ ট্যাপ করুন।",
    ],
  },
  {
    topic: "hotspot",
    title: "Mobile Hotspot & Tethering",
    keywords: ["hotspot", "হটস্পট", "শেয়ার ইন্টারনেট"],
    steps: [
      "ফোনের Settings → Network & internet (বা Connections)-এ যান।",
      "Hotspot & tethering (বা Mobile Hotspot)-এ ট্যাপ করুন।",
      "Wi-Fi hotspot অন করে পাসওয়ার্ড দেখে বা পরিবর্তন করে নিন।",
    ],
  },
  {
    topic: "permissions",
    title: "App Permissions (মাইক্রোফোন / ক্যামেরা অনুমতি)",
    keywords: ["permission", "permissions", "পারমিশন", "অনুমতি", "microphone", "camera", "মাইক্রোফোন"],
    steps: [
      "ফোনের Settings → Apps → See all apps-এ যান।",
      "আপনার ব্রাউজার (যেমন Chrome) বা নির্দিষ্ট অ্যাপটি সিলেক্ট করুন।",
      "Permissions অপশনে গিয়ে Microphone বা Camera-তে 'Allow' নির্বাচন করুন।",
    ],
  },
  {
    topic: "battery",
    title: "Battery & Power Saving",
    keywords: ["battery", "ব্যাটারি", "চার্জ"],
    steps: [
      "ফোনের Settings → Battery অপশনে যান।",
      "Battery Saver বা Adaptive Battery চালু/বন্ধ করুন এবং কোন অ্যাপ বেশি চার্জ ব্যবহার করছে তা দেখুন।",
    ],
  },
  {
    topic: "storage",
    title: "Storage & Space Cleanup",
    keywords: ["storage", "স্টোরেজ", "মেমরি", "জায়গা"],
    steps: [
      "ফোনের Settings → Storage (বা Device Care → Storage)-এ যান।",
      "অপ্রয়োজনীয় ক্যাশ, ডাউনলোড বা বড় ফাইল দেখে খালি করুন।",
    ],
  },
  {
    topic: "display",
    title: "Display, Brightness & Dark Mode",
    keywords: ["display", "brightness", "ডিসপ্লে", "আলো", "ব্রাইটনেস", "ডার্ক"],
    steps: [
      "ফোনের Settings → Display-এ যান।",
      "এখান থেকে Brightness level, Dark theme এবং Screen timeout পরিবর্তন করতে পারবেন।",
    ],
  },
  {
    topic: "language",
    title: "Language & Keyboard (বাংলা কীবোর্ড)",
    keywords: ["language", "keyboard", "ভাষা", "কীবোর্ড", "বাংলা"],
    steps: [
      "ফোনের Settings → System (বা General Management) → Languages & input-এ যান।",
      "On-screen keyboard (যেমন Gboard বা Ridmik) থেকে Bangla যুক্ত করুন।",
    ],
  },
];

export interface SajjatAndroidBridgeInterface {
  isAvailable?: () => boolean;
  getBridgeVersion?: () => string;
  openApp?: (packageName: string) => Promise<boolean> | boolean;
  openSystemSettings?: (action?: string) => Promise<boolean> | boolean;
  performGestureTap?: (x: number, y: number) => Promise<boolean> | boolean;
}

declare global {
  interface Window {
    SajjatAndroidBridge?: SajjatAndroidBridgeInterface;
  }
}

export function getNativeAndroidBridge(): SajjatAndroidBridgeInterface | null {
  if (typeof window === "undefined") return null;
  const bridge = window.SajjatAndroidBridge;
  if (!bridge) return null;
  try {
    if (typeof bridge.isAvailable === "function" && !bridge.isAvailable()) {
      return null;
    }
    return bridge;
  } catch {
    return null;
  }
}

export function resolveLocalAppMatch(query: string): LaunchableAppEntry | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const app of LAUNCHABLE_APPS) {
    if (app.key === q || app.keywords.some((kw) => q.includes(kw))) {
      return app;
    }
  }
  return null;
}

export function resolveLocalSettingGuide(query: string): PhoneSettingGuide | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const guide of PHONE_SETTING_GUIDES) {
    if (guide.topic === q || guide.keywords.some((kw) => q.includes(kw))) {
      return guide;
    }
  }
  return null;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Safely triggers navigation for an Android App Link / Intent URI or web fallback
 * without calling window.open or window.alert.
 */
export function triggerSafeExternalLink(url: string): void {
  if (typeof document === "undefined" || !url) return;
  const anchor = document.createElement("a");
  anchor.href = url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function parseJsonSafe(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`অপ্রত্যাশিত সার্ভার রেসপন্স (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchPhoneControlStatus(): Promise<PhoneControlStatusResponse> {
  const endpoints = ["/api/phone-control/status", "/.netlify/functions/phone-control?action=status"];
  let lastErr: any = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const data = await parseJsonSafe(res);
      if (data && typeof data.configured === "boolean") {
        return data as PhoneControlStatusResponse;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  return {
    ok: false,
    configured: false,
    runtime: "unknown",
    liveWsSupported: false,
    model: "gemini-4-hydrogen",
    liveModel: "gemini-3.8-live",
    message: lastErr?.message || "ব্যাকএন্ড সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।",
    setupGuide: {
      envVarName: "GEMINI_API_KEY",
      netlifySteps: [
        "Netlify Dashboard → Site configuration → Environment variables-এ যান।",
        "Key হিসেবে GEMINI_API_KEY এবং Value হিসেবে আপনার Gemini API Key সেভ করে পুনরায় ডিপ্লয় করুন।",
      ],
      aiStudioSteps: [
        "AI Studio Secrets প্যানেলে GEMINI_API_KEY সেট করুন।",
      ],
    },
    timestamp: new Date().toISOString(),
  };
}

export async function analyzePhoneScreenApi(params: {
  imageBase64: string;
  mimeType?: string;
  question?: string;
  language?: "bn" | "en";
}): Promise<ScreenAnalysisResponse> {
  const endpoints = ["/api/phone-control/analyze", "/.netlify/functions/phone-control?action=analyze"];
  let lastError = "স্ক্রিন বিশ্লেষণ ব্যর্থ হয়েছে।";

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", ...params }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return (await res.json()) as ScreenAnalysisResponse;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  return {
    success: false,
    errorCode: "API_ERROR",
    error: lastError,
  };
}

export async function processPhoneVoiceApi(params: {
  text: string;
  language?: "bn" | "en";
  hasScreenShare?: boolean;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<VoiceCommandResponse> {
  const endpoints = ["/api/phone-control/voice", "/.netlify/functions/phone-control?action=voice"];
  let lastError = "ভয়েস নির্দেশ প্রসেস করা যায়নি।";

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "voice", ...params }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return (await res.json()) as VoiceCommandResponse;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  return {
    success: false,
    errorCode: "API_ERROR",
    error: lastError,
  };
}

export function getPhoneLiveWsUrl(): string {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/phone-live`;
}

export function findBestBanglaVoice(voices: SpeechSynthesisVoice[]): {
  voice: SpeechSynthesisVoice | null;
  hasBangla: boolean;
} {
  if (!voices || voices.length === 0) {
    return { voice: null, hasBangla: false };
  }
  const exactBd = voices.find((v) => v.lang.toLowerCase() === "bn-bd");
  if (exactBd) return { voice: exactBd, hasBangla: true };

  const anyBn = voices.find((v) => v.lang.toLowerCase().startsWith("bn"));
  if (anyBn) return { voice: anyBn, hasBangla: true };

  return { voice: null, hasBangla: false };
}

export function downsampleFloat32To16kHz(
  buffer: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (!inputSampleRate || inputSampleRate === 16000) {
    return buffer;
  }
  if (inputSampleRate < 16000) {
    return buffer;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export function calculateRmsLevel(buffer: Float32Array): number {
  if (!buffer || buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  return Math.min(100, Math.round(rms * 350));
}

export function float32ToPcm16Base64(input: Float32Array, inputSampleRate = 16000): string {
  const normalized = downsampleFloat32To16kHz(input, inputSampleRate);
  const pcm16 = new Int16Array(normalized.length);
  for (let i = 0; i < normalized.length; i++) {
    const clamped = Math.max(-1, Math.min(1, normalized[i]));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function decodePcm24Base64ToAudioBuffer(
  ctx: AudioContext,
  base64: string
): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);
  return audioBuffer;
}
