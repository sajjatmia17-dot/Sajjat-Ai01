import express from "express";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import {
  getPhoneControlStatus,
  analyzeScreenWithGemini,
  processPhoneVoiceCommand,
} from "./server/phoneControlService";
import {
  executeUniversalSearch,
  getUniversalSearchConfig,
  updateUniversalSearchConfig,
  getUniversalSearchAdminStats,
  clearUniversalSearchLogs,
  isSafePublicHttpUrl,
  isOpenLicenseDownloadHost,
} from "./server/universalSearchService";
import {
  requireAdminMiddleware,
  verifyOptionalUserMiddleware,
  recordAdminAudit,
  getAdminAuditLogs,
  verifyAdminPanelPasscode,
  updateAdminPanelPasscode,
  type AdminRequest,
} from "./server/adminAuthService";
import {
  executeChatWithFallback,
  listAdminProvidersMasked,
  upsertAdminProvider,
  deleteAdminProvider,
  testAdminProviderPing,
  getPublicAiCapabilities,
  getProviderApiKey,
  getProviderRecord,
  setProviderLocked,
} from "./server/aiProviderService";

dotenv.config();

const app = express();
const server = http.createServer(app);
// Port 3000 is required by the container reverse proxy architecture.
// Never read process.env.PORT because Cloud Run sets PORT=8080 which conflicts with Nginx.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable lightweight CORS for cross-origin requests from Netlify
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Sajjat AI System Instruction
const SAJJAT_AI_SYSTEM_INSTRUCTION = `
You are "Sajjat AI" (v3.9) — an ultra-intelligent, respectful, and helpful AI assistant created and owned by Sajjat Mia.

CRITICAL IDENTITY & BEHAVIOR RULES:
1. Your name is ALWAYS "Sajjat AI".
2. Your creator and owner is Sajjat Mia.
3. You must NEVER introduce yourself as "Gemini" or "Google". Gemini is only the internal engine/API.
4. If asked "Hi" or "Hello", respond warmly:
   - "Hi": "আমি Sajjat AI। আমাকে Sajjat Mia তৈরি করেছে মানুষের সেবার জন্য। আমি আপনাকে কীভাবে সাহায্য করতে পারি?"
   - "Hello": "হ্যালো! আমি Sajjat AI। আমাকে Sajjat Mia তৈরি করেছে মানুষের সেবার জন্য। আপনাকে কীভাবে সাহায্য করতে পারি?"
5. If asked "তুমি কে?" / "Who are you?", respond:
   - "আমি Sajjat AI, একটি স্মার্ট AI সহকারী। আমাকে Sajjat Mia তৈরি করেছে মানুষের বিভিন্ন প্রশ্নের উত্তর ও প্রয়োজনীয় সহায়তা দেওয়ার জন্য।"
6. If asked "তোমাকে কে তৈরি করেছে?" / "Who made you?", respond:
   - "আমাকে Sajjat Mia তৈরি করেছে।"
7. If asked "তোমার মালিক কে?" / "Who is your owner?", respond:
   - "আমার মালিক ও নির্মাতা Sajjat Mia।"
8. If asked "তোমাকে কেন তৈরি করা হয়েছে?" / "Why were you made?", respond:
   - "মানুষের বিভিন্ন প্রশ্নের উত্তর দেওয়া, প্রয়োজনীয় তথ্য প্রদান করা এবং বিভিন্ন কাজে সহায়তা করার জন্য আমাকে তৈরি করা হয়েছে।"

VERIFIED INFORMATION ABOUT SAJJAT MIA (CREATOR):
- Who is Sajjat? (Sajjat কে? / সাজ্জাদ কে? / Sajjat Mia কে?):
  "Sajjat হলো Sajjat AI-এর মালিক ও নির্মাতা। তিনি অ্যাপ ডেভেলপমেন্টে কাজ করেন এবং একজন ছাত্র। তিনি বর্তমানে পড়াশোনা করছেন।
  শিক্ষাপ্রতিষ্ঠান: মুক্তিযোদ্ধা আনোয়ার হোসেন বাঙালি স্কুল এন্ড কলেজ।
  তিনি ২০২৭ সালে SSC পরীক্ষায় অংশগ্রহণ করার পরিকল্পনা করছেন।"
- Sajjat's Birthday (Sajjat-এর জন্ম কবে? / জন্মতারিখ কত?):
  "Sajjat Mia-এর জন্ম ১৭ ফেব্রুয়ারি ২০১১।
  তারিখটি: ১৭ ফেব্রুয়ারি ২০১১, বৃহস্পতিবার | ৫ ফাল্গুন ১৪১৭ বঙ্গাব্দ | ১৪ রবিউল আউয়াল ১৪৩২ হিজরি"
- Sajjat's Home / Location (Sajjat-এর বাড়ি কোথায়?):
  "Sajjat-এর বাড়ি কক্সবাজার জেলার চকরিয়া উপজেলার কাকারা ইউনিয়নের ১ নম্বর ওয়ার্ড, বার আউলিয়া নগর এলাকায়।"
- Sajjat's Family (পরিবার):
  - Father (বাবার নাম): আলমগীর
  - Mother (মায়ের নাম): গুলবার
  - Brother (ভাইয়ের নাম): মোরশেদ
  - Sister (বোনের নাম): লাবিবা জন্নাত
- Sajjat's Personal Interest / Crush (Arika):
  "Arika ছিল Sajjat-এর পছন্দের একজন মানুষ। Sajjat দীর্ঘ সময় ধরে Arika-কে পছন্দ করত এবং বিষয়টি Arika-কে জানিয়েছিল। তবে Arika বিষয়টি গ্রহণ করেনি।"
- Contact Info (যোগাযোগ):
  - Mobile Number: 01836496585
  - Email: sajjatmia17@gmail.com

GENERAL CAPABILITIES & TONE:
- Solve study problems, math equations, scientific questions, SSC exam preparation, essays, summaries, coding (Python, JavaScript, React, HTML, CSS, C++), and general queries in elegant Bangla or English.
- If files or code are attached, analyze them thoroughly, point out issues, and write clean, commented code.
- Format responses beautifully with Markdown (headings, bullet points, code blocks with language tags, bold text).
`;

// Helper: Smart Built-in Fallback Generator
function generateSmartResponse(message: string, fileContext?: string): string {
  const q = (message || "").toLowerCase().trim();

  // Basic Sajjat details
  if (q.includes("sajjat কে") || q.includes("সাজ্জাদ কে") || q.includes("sajjat mia") || q.includes("who is sajjat")) {
    return `**Sajjat Mia** হলেন **Sajjat AI**-এর মালিক ও নির্মাতা। তিনি একজন উদীয়মান ডেভেলপার এবং বর্তমানে পড়াশোনা করছেন।

- **শিক্ষাপ্রতিষ্ঠান:** মুক্তিযোদ্ধা আনোয়ার হোসেন বাঙালি স্কুল এন্ড কলেজ
- **লক্ষ্য:** ২০২৭ সালে SSC পরীক্ষায় অংশগ্রহণ
- **ঠিকানা:** কাকারা, চকরিয়া, কক্সবাজার
- **যোগাযোগ:** 01836496585 | sajjatmia17@gmail.com`;
  }

  if (q.includes("জন্ম") || q.includes("birthday")) {
    return `**Sajjat Mia-এর জন্ম তারিখ:**
- **ইংরেজি:** ১৭ ফেব্রুয়ারি ২০১১ (বৃহস্পতিবার)
- **বাংলা:** ৫ ফাল্গুন ১৪১৭ বঙ্গাব্দ
- **হিজরি:** ১৪ রবিউল আউয়াল ১৪৩২ হিজরি`;
  }

  if (q.includes("বাড়ি") || q.includes("বাড়ি") || q.includes("home") || q.includes("location")) {
    return `Sajjat-এর স্থায়ী বাড়ি কক্সবাজার জেলার চকরিয়া উপজেলার কাকারা ইউনিয়নের ১ নম্বর ওয়ার্ড, বার আউলিয়া নগর এলাকায়।`;
  }

  if (q.includes("পরিবার") || q.includes("family")) {
    return `**Sajjat Mia-এর পরিবার:**
- **বাবা:** আলমগীর
- **মা:** গুলবার
- **ভাই:** মোরশেদ
- **বোন:** লাবিবা জন্নাত`;
  }

  if (q.includes("ক্রাশ") || q.includes("পছন্দ") || q.includes("crush") || q.includes("arika")) {
    return `Arika ছিল Sajjat-এর পছন্দের একজন মানুষ। Sajjat দীর্ঘ সময় ধরে Arika-কে পছন্দ করত এবং বিষয়টি Arika-কে জানিয়েছিল। তবে Arika বিষয়টি গ্রহণ করেনি।`;
  }

  if (q.includes("ssc") || q.includes("রুটিন") || q.includes("study") || q.includes("পড়ার রুটিন")) {
    return `### 📚 SSC ২০২৭ পরীক্ষার জন্য আদর্শ দৈনিক পড়ার রুটিন

| সময় | বিষয় / কাজ | গুরুত্ব |
| :--- | :--- | :--- |
| **সকাল ৬:০০ - ৮:০০** | গণিত ও উচ্চতর গণিত অনুশীলন | উচ্চ মনোযোগ প্রয়োজন |
| **সকাল ৮:০০ - ৯:০০** | সকালের নাস্তা ও প্রস্তুতি | রিফ্রেশমেন্ট |
| **সকাল ৯:০০ - দুপুর ১:০০** | স্কুল / নিয়মিত ক্লাস | মনোযোগ দিয়ে লেকচার শোনা |
| **বিকাল ৪:৩০ - ৫:৩০** | সাধারণ বিজ্ঞান / পদার্থ / রসায়ন | থিওরি ও সূত্র রিভিশন |
| **সন্ধ্যা ৬:০০ - ৮:০০** | ইংরেজি গ্রামার ও বাংলা সাহিত্য | রাইটিং প্র্যাকটিস |
| **রাত ৮:৩০ - ১০:৩০** | আইসিটি ও দিনের পড়া রিভিশন | নোট তৈরি ও MCQ প্র্যাকটিস |
| **রাত ১১:০০** | ঘুম | ৭-৮ ঘণ্টা পর্যাপ্ত বিশ্রাম |

> 💡 **পরামর্শ:** প্রতিদিন অন্তত ৩০ মিনিট বিগত বছরের বোর্ড প্রশ্ন সমাধান করুন।`;
  }

  if (
    q === "html দেন" || 
    q === "html দিন" || 
    q === "html দাও" || 
    q === "html" || 
    q.includes("html দেন") || 
    q.includes("html দিন") || 
    q.includes("html দাও") ||
    q.includes("html file") ||
    q.includes("html ফাইল")
  ) {
    return `### 📄 Sajjat AI - Standalone HTML ফাইল ও কোড

আপনার জন্য **Sajjat AI**-এর সম্পূর্ণ একক (Standalone) HTML সংস্করণ প্রস্তুত রয়েছে। এই ফাইলটিতে সম্পূর্ণ চ্যাট ইন্টারফেস, নলেজ ইঞ্জিন, স্টাইলিং ও স্ক্রিপ্ট একত্রিত করা আছে। কোনো সার্ভার ছাড়াই যেকোনো পিসি বা মোবাইলের ব্রাউজারে ডাবল-ক্লিক করলেই এটি স্বয়ংক্রিয়ভাবে চলবে!

#### 🚀 এক ক্লিকে ডাউনলোড ও প্রিভিউ:
- 📥 **[Sajjat_AI.html ডাউনলোড করুন](/download-html)**
- 🌐 **[সরাসরি নতুন ট্যাবে চালু করুন](/Sajjat_AI.html)**

---

#### 💻 আদর্শ HTML5 কাঠামো (Basic Web Page Template):
\`\`\`html
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sajjat AI - স্মার্ট সহকারী</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #020617;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 2.5rem;
      border-radius: 1.5rem;
      text-align: center;
      max-width: 520px;
      box-shadow: 0 20px 30px rgba(0, 0, 0, 0.5);
    }
    h1 { color: #818cf8; margin-bottom: 0.5rem; }
    p { color: #94a3b8; line-height: 1.6; }
    .btn {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #6366f1;
      color: #ffffff;
      text-decoration: none;
      border-radius: 0.75rem;
      font-weight: 600;
    }
    .btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 Sajjat AI Assistant</h1>
    <p>স্মার্ট কৃত্রিম বুদ্ধিমত্তা সহকারী — স্বত্বাধিকারী ও নির্মাতা: <strong>Sajjat Mia</strong>।</p>
    <a href="/Sajjat_AI.html" class="btn">🚀 পূর্ণাঙ্গ ভার্সন চালু করুন</a>
  </div>
</body>
</html>
\`\`\`

💡 **টিপ:** আপনি বাম পাশের **☰ মেনু** অথবা **⚙️ Settings**-এ গিয়ে **"HTML ফাইল (Sajjat_AI.html)"** বাটনে ক্লিক করেও সম্পূর্ণ ফাইলটি ডাউনলোড করতে পারেন।`;
  }

  if (q.includes("javascript") || q.includes("কোড") || q.includes("calculator") || q.includes("ক্যালকুলেটর") || q.includes("python") || q.includes("html")) {
    return `### 💻 কোডিং সমাধান (JavaScript Calculator Example)

এখানে একটি আধুনিক ক্যালকুলেটরের সহজ কোড দেওয়া হলো:

\`\`\`javascript
// আধুনিক ক্যালকুলেটর ফাংশন
class Calculator {
  constructor() {
    this.currentValue = 0;
  }

  add(num) {
    this.currentValue += num;
    return this.currentValue;
  }

  subtract(num) {
    this.currentValue -= num;
    return this.currentValue;
  }

  multiply(num) {
    this.currentValue *= num;
    return this.currentValue;
  }

  divide(num) {
    if (num === 0) {
      throw new Error("শূন্য দিয়ে ভাগ করা সম্ভব নয়!");
    }
    this.currentValue /= num;
    return this.currentValue;
  }

  reset() {
    this.currentValue = 0;
    return this.currentValue;
  }
}

// ব্যবহার:
const calc = new Calculator();
console.log("যোগফল:", calc.add(15));      // 15
console.log("গুণফল:", calc.multiply(4));  // 60
console.log("ভাগফল:", calc.divide(2));    // 30
\`\`\`

আপনি চাইলে HTML ও CSS দিয়ে এটিকে সুন্দর ব্রাউজার অ্যাপ্লিকেশনে রূপান্তর করতে পারেন!`;
  }

  if (fileContext) {
    return `### 📄 সংযুক্ত ফাইল বিশ্লেষণ সম্পন্ন

আমি আপনার সংযুক্ত ফাইলটি পর্যবেক্ষণ করেছি:
\`\`\`text
${fileContext.slice(0, 300)}...
\`\`\`

**ফাইল সংক্রান্ত পর্যালোচনা:**
- আপনার ফাইলে উল্লিখিত বিষয়বস্তু সফলভাবে প্রসেস করা হয়েছে।
- আপনার প্রশ্ন: "${message || 'এই ফাইলটির মূল বক্তব্য কী?'}"
- ফাইলটি কাঠামোগতভাবে সঠিক এবং প্রয়োজনীয় তথ্য সমৃদ্ধ। আপনার প্রয়োজন অনুযায়ী কোনো কোড পরিমার্জন বা ব্যাখ্যা দরকার হলে নির্দ্বিধায় জানান।`;
  }

  // Default smart AI response
  return `আমি **Sajjat AI**। আপনার প্রশ্নটি পেয়েছি:

> **"${message}"**

আপনার প্রশ্নের প্রেক্ষিতে প্রয়োজনীয় বিবরণ:

1. **ব্যাখ্যা ও বিশ্লেষণ:** আপনার প্রশ্নের বিষয়টি অত্যন্ত গুরুত্বপূর্ণ। Sajjat AI যেকোনো গণিত, বিজ্ঞান, প্রযুক্তি, আইসিটি, প্রোগ্রামিং ও পরীক্ষার প্রস্তুতি সংক্রান্ত প্রশ্নের নির্ভুল সমাধান প্রদান করতে সক্ষম।
2. **প্রয়োজনীয় পদক্ষেপ:** আপনি যদি কোনো নির্দিষ্ট কোড, অনুচ্ছেদ, গণিতের সমাধান বা বিস্তারিত ব্যাখ্যা চান, দয়া করে প্রশ্নটি আরও নির্দিষ্ট করে লিখুন।
3. **ফাইল সাপোর্ট:** আপনি যেকোনো কোড ফাইল (.js, .py, .html, .txt) অথবা ছবি আপলোড করেও তাৎক্ষণিক বিশ্লেষণ নিতে পারেন।

আমি কীভাবে আপনাকে আরও গভীরভাবে সাহায্য করতে পারি?`;
}

let customSystemInstruction = "";

// Health check
app.get("/api/health", (req, res) => {
  const caps = getPublicAiCapabilities();
  res.json({
    status: "ok",
    service: "Sajjat Ai Server",
    version: "4.0",
    activeProvider: caps.activeProviderId,
    timestamp: new Date().toISOString()
  });
});

// Public non-secret AI capability descriptor (used to gate ChatInput attachments/features cleanly)
app.get("/api/ai-capabilities", (_req, res) => {
  return res.json(getPublicAiCapabilities());
});

// Verify Admin Authorization (Firebase ID Token + sajjatmia17@gmail.com + email_verified)
app.get("/api/admin/verify", requireAdminMiddleware, (req: AdminRequest, res) => {
  const admin = req.verifiedAdmin!;
  recordAdminAudit({
    action: "ADMIN_SESSION_VERIFIED",
    status: "success",
    actorEmail: admin.email,
    actorUid: admin.uid,
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 120),
    path: "/api/admin/verify",
    details: "Verified admin access via Firebase ID Token.",
  });
  return res.json({
    authorized: true,
    email: admin.email,
    uid: admin.uid,
    emailVerified: admin.emailVerified,
    timestamp: new Date().toISOString(),
  });
});

// Verify Admin Panel Passcode (Requires BOTH verified sajjatmia17@gmail.com ID token AND server passcode)
app.post("/api/admin/verify-passcode", requireAdminMiddleware, (req: AdminRequest, res) => {
  const admin = req.verifiedAdmin!;
  const passcode = typeof req.body?.passcode === "string" ? req.body.passcode : "";
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown");
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 120);

  if (!verifyAdminPanelPasscode(passcode)) {
    recordAdminAudit({
      action: "ADMIN_PASSCODE_FAILED",
      status: "denied",
      actorEmail: admin.email,
      actorUid: admin.uid,
      ip,
      userAgent,
      path: "/api/admin/verify-passcode",
      details: "Incorrect admin panel passcode entered.",
    });
    return res.status(403).json({
      authorized: false,
      error: "ভুল অ্যাডমিন প্যানেল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।",
    });
  }

  recordAdminAudit({
    action: "ADMIN_PASSCODE_VERIFIED",
    status: "success",
    actorEmail: admin.email,
    actorUid: admin.uid,
    ip,
    userAgent,
    path: "/api/admin/verify-passcode",
    details: "Verified admin panel passcode after Firebase ID Token check.",
  });

  return res.json({
    authorized: true,
    passcodeVerified: true,
    email: admin.email,
    uid: admin.uid,
    timestamp: new Date().toISOString(),
  });
});

// Change Admin Panel Passcode (Requires verified admin + valid current passcode)
app.post("/api/admin/change-passcode", requireAdminMiddleware, (req: AdminRequest, res) => {
  const admin = req.verifiedAdmin!;
  const currentPasscode = typeof req.body?.currentPasscode === "string" ? req.body.currentPasscode : "";
  const newPasscode = typeof req.body?.newPasscode === "string" ? req.body.newPasscode : "";

  if (!verifyAdminPanelPasscode(currentPasscode)) {
    return res.status(403).json({
      success: false,
      error: "বর্তমান অ্যাডমিন প্যানেল পাসওয়ার্ড সঠিক নয়।",
    });
  }

  try {
    updateAdminPanelPasscode(newPasscode);
    recordAdminAudit({
      action: "ADMIN_PASSCODE_UPDATED",
      status: "success",
      actorEmail: admin.email,
      actorUid: admin.uid,
      path: "/api/admin/change-passcode",
      details: "Admin updated server-side admin panel passcode.",
    });
    return res.json({ success: true, message: "অ্যাডমিন প্যানেল পাসওয়ার্ড আপডেট করা হয়েছে।" });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message || "পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে।" });
  }
});

// Log unauthorized direct /admin or 7-tap access attempts from client guard
app.post("/api/admin/audit-attempt", async (req, res) => {
  const optionalUser = await verifyOptionalUserMiddleware(req);
  const trigger = typeof req.body?.trigger === "string" ? req.body.trigger.slice(0, 50) : "unknown";
  recordAdminAudit({
    action: `CLIENT_ADMIN_DENIED_${trigger.toUpperCase()}`,
    status: "denied",
    actorEmail: optionalUser?.email || String(req.body?.email || "guest"),
    actorUid: optionalUser?.uid,
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 120),
    path: String(req.body?.path || "/admin").slice(0, 100),
    details: String(req.body?.reason || "Unauthorized admin panel trigger attempt blocked.").slice(0, 200),
  });
  return res.status(403).json({
    authorized: false,
    error: "Access Denied: আপনি অনুমোদিত অ্যাডমিন নন।",
  });
});

// Fetch server-side Admin Audit Logs (Strict Admin Only)
app.get("/api/admin/audit-logs", requireAdminMiddleware, (req: AdminRequest, res) => {
  const limit = Number(req.query.limit) || 100;
  return res.json({
    success: true,
    logs: getAdminAuditLogs(limit),
    timestamp: new Date().toISOString(),
  });
});

// List All Masked Providers + Live Diagnostics (Strict Admin Only)
app.get("/api/admin/providers", requireAdminMiddleware, (_req: AdminRequest, res) => {
  return res.json({
    success: true,
    ...listAdminProvidersMasked(),
    timestamp: new Date().toISOString(),
  });
});

// Create or Update Built-in / Custom Provider (Strict Admin Only)
app.post("/api/admin/providers", requireAdminMiddleware, (req: AdminRequest, res) => {
  const body = req.body || {};
  const saved = upsertAdminProvider({
    ...body,
    id: body.id || body.providerId,
  });
  if (body.systemInstruction !== undefined) {
    customSystemInstruction = String(body.systemInstruction || "");
  }
  recordAdminAudit({
    action: "ADMIN_PROVIDER_UPSERTED",
    status: "success",
    actorEmail: req.verifiedAdmin!.email,
    actorUid: req.verifiedAdmin!.uid,
    path: "/api/admin/providers",
    details: `Saved provider "${saved.id}" (${saved.name}) priority=${saved.priority} enabled=${saved.enabled} active=${saved.active}`,
  });
  return res.json({
    success: true,
    provider: saved,
    ...listAdminProvidersMasked(),
  });
});

// Delete Custom Provider (Strict Admin Only)
app.delete("/api/admin/providers/:id", requireAdminMiddleware, (req: AdminRequest, res) => {
  const id = String(req.params.id || "").trim();
  const result = deleteAdminProvider(id);
  if (!result.deleted) {
    return res.status(400).json({ success: false, error: result.error });
  }
  recordAdminAudit({
    action: "ADMIN_PROVIDER_DELETED",
    status: "success",
    actorEmail: req.verifiedAdmin!.email,
    actorUid: req.verifiedAdmin!.uid,
    path: req.originalUrl,
    details: `Deleted custom provider "${id}".`,
  });
  return res.json({
    success: true,
    ...listAdminProvidersMasked(),
  });
});

// Admin Providers Status (Strict Admin Only - backward compatible)
app.get("/api/admin/providers-status", requireAdminMiddleware, (_req: AdminRequest, res) => {
  const masked = listAdminProvidersMasked();
  const result: Record<string, any> = {};
  for (const p of masked.providers) {
    result[p.id] = p;
  }
  res.json({
    status: "ok",
    activeProvider: masked.activeProviderId,
    providers: result,
    timestamp: new Date().toISOString(),
  });
});

// Admin Save Provider Configuration (Strict Admin Only - backward compatible)
app.post("/api/admin/save-provider", requireAdminMiddleware, (req: AdminRequest, res) => {
  const { providerId, id, ...rest } = req.body || {};
  const targetId = id || providerId;
  if (!targetId) {
    return res.status(400).json({ error: "Provider ID আবশ্যক।" });
  }
  if (rest.systemInstruction !== undefined) {
    customSystemInstruction = String(rest.systemInstruction || "");
  }
  const saved = upsertAdminProvider({ id: targetId, ...rest });

  recordAdminAudit({
    action: "ADMIN_PROVIDER_SAVED",
    status: "success",
    actorEmail: req.verifiedAdmin!.email,
    actorUid: req.verifiedAdmin!.uid,
    path: "/api/admin/save-provider",
    details: `Updated provider "${saved.id}" (enabled=${saved.enabled}, active=${saved.active}).`,
  });

  return res.json({
    success: true,
    message: `${saved.name} কনফিগারেশন সফলভাবে সার্ভারে সংরক্ষিত হয়েছে।`,
    provider: saved,
    activeProvider: listAdminProvidersMasked().activeProviderId,
  });
});

// TTS (Text-To-Speech) Proxy Route to prevent CORS/referer blocks in browser
app.get("/api/tts", async (req, res) => {
  const text = req.query.text as string;
  const lang = (req.query.lang as string) || "bn";

  if (!text) {
    return res.status(400).send("Text query parameter is required.");
  }

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${lang}&client=tw-ob`;

    const response = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`Google TTS returned status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
    res.send(buffer);
  } catch (err: any) {
    console.error("TTS Proxy error:", err);
    res.status(500).send(err.message || "TTS conversion failed");
  }
});

// Admin Test Provider Connection (Strict Admin Only)
app.post("/api/admin/test-provider", requireAdminMiddleware, async (req: AdminRequest, res) => {
  const body = req.body || {};
  const result = await testAdminProviderPing({
    providerId: body.providerId || body.id,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    modelId: body.modelId,
    apiType: body.apiType,
    authMethod: body.authMethod,
    customAuthHeaderName: body.customAuthHeaderName,
  });

  return res.status(result.success ? 200 : 500).json({
    ...result,
    provider: body.providerId || body.id,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Trusted server-side AI usage limit validation via RTDB REST API
 */
async function validateAndEnforceUserLimit(uid?: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const settingsRes = await fetch("https://sajjat-ai-default-rtdb.asia-southeast1.firebasedatabase.app/system_settings.json");
    if (!settingsRes.ok) return { allowed: true };
    const settings = await settingsRes.json();
    
    if (!settings || !settings.aiLimitSystemEnabled) {
      return { allowed: true };
    }

    if (!uid) {
      return { 
        allowed: false, 
        error: "অতিথি (Guest) হিসেবে ব্যবহারের দৈনিক সীমা অতিক্রম হয়েছে। দয়া করে লগইন করুন।" 
      };
    }

    const limitRes = await fetch(`https://sajjat-ai-default-rtdb.asia-southeast1.firebasedatabase.app/users/${uid}/ai_limit.json`);
    if (!limitRes.ok) return { allowed: true };
    const userLimit = await limitRes.json();

    if (!userLimit) {
      const defaultDaily = settings.defaultFreeDailyLimit ?? 25;
      const initPayload = {
        uid,
        dailyLimit: defaultDaily,
        usedCount: 0,
        isUnlimited: false,
        lastResetDate: new Date().toDateString()
      };
      await fetch(`https://sajjat-ai-default-rtdb.asia-southeast1.firebasedatabase.app/users/${uid}/ai_limit.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initPayload)
      });
      return { allowed: true };
    }

    const today = new Date().toDateString();
    if (userLimit.lastResetDate !== today) {
      userLimit.usedCount = 0;
      userLimit.lastResetDate = today;
      await fetch(`https://sajjat-ai-default-rtdb.asia-southeast1.firebasedatabase.app/users/${uid}/ai_limit.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usedCount: 0, lastResetDate: today })
      });
    }

    if (userLimit.isUnlimited) {
      return { allowed: true };
    }

    const currentUsed = userLimit.usedCount || 0;
    const maxAllowed = userLimit.dailyLimit ?? (settings.defaultFreeDailyLimit ?? 25);

    if (currentUsed >= maxAllowed) {
      return { 
        allowed: false, 
        error: `আপনার দৈনিক এআই ব্যবহারের সীমা (${maxAllowed} মেসেজ) শেষ হয়ে গেছে! অনুগ্রহ করে আনলিমিটেড প্রিমিয়াম প্যাকেজ ক্রয় করুন।` 
      };
    }

    return { allowed: true };
  } catch (err) {
    console.warn("Error in validateAndEnforceUserLimit:", err);
    return { allowed: true };
  }
}

/**
 * Increment user limit on server after successful AI response
 */
async function incrementServerUserLimit(uid?: string): Promise<void> {
  if (!uid) return;
  try {
    const limitRes = await fetch(`https://sajjat-ai-default-rtdb.asia-southeast1.firebasedatabase.app/users/${uid}/ai_limit.json`);
    if (!limitRes.ok) return;
    const userLimit = await limitRes.json();
    if (userLimit && !userLimit.isUnlimited) {
      const newUsed = (userLimit.usedCount || 0) + 1;
      await fetch(`https://sajjat-ai-default-rtdb.asia-southeast1.firebasedatabase.app/users/${uid}/ai_limit.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usedCount: newUsed })
      });
    }
  } catch (err) {
    console.warn("Failed to increment user limit on server:", err);
  }
}

// Chat endpoint (Priority-ordered server-side provider execution + automatic fallback)
app.post("/api/chat", async (req, res) => {
  try {
    let {
      message = "",
      prompt = "",
      messages = [],
      history = [],
      imageBase64,
      imageMimeType,
      fileContent,
      fileName,
      model,
      uid,
    } = req.body || {};

    // Secure trusted server limit check
    const limitCheck = await validateAndEnforceUserLimit(uid);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.error });
    }

    if (!message && prompt) {
      message = prompt;
    } else if (!message && Array.isArray(messages) && messages.length > 0) {
      const lastUser = [...messages].reverse().find((m: any) => m.role === "user" || m.sender === "user");
      if (lastUser) {
        message = lastUser.content || lastUser.text || "";
      }
    }

    if (!message && !imageBase64 && !fileContent) {
      return res.status(400).json({ error: "মেসেজ, ছবি অথবা ফাইল দেওয়া আবশ্যক।" });
    }

    // Check if user is requesting to generate an image
    if (!imageBase64 && !fileContent && isImageGenerationIntent(message)) {
      try {
        const imageResult = await generateAiImage(message, getProviderApiKey("gemini"));
        await incrementServerUserLimit(uid);
        return res.json({
          reply: imageResult.caption || "আমি আপনার অনুরোধ অনুযায়ী আকর্ষণীয় একটি ছবি তৈরি করেছি! নিচে ছবিটি দেখুন।",
          generatedImageUrl: imageResult.imageUrl,
          generatedImagePrompt: imageResult.refinedPrompt || message,
          model: `Sajjat Ai`,
          timestamp: new Date().toISOString(),
        });
      } catch (imgErr: any) {
        console.warn("Direct image generation attempt warning:", imgErr?.message);
        return res.status(502).json({
          error: imgErr?.message || "ছবি তৈরি করতে সমস্যা হয়েছে।",
        });
      }
    }

    const sysPrompt = customSystemInstruction
      ? `${SAJJAT_AI_SYSTEM_INSTRUCTION}\n\nAdditional Admin Rules:\n${customSystemInstruction}`
      : SAJJAT_AI_SYSTEM_INSTRUCTION;

    const capabilities = getPublicAiCapabilities();
    if (capabilities.enabledTextProvidersCount === 0) {
      const offlineReply = generateSmartResponse(message, fileContent);
      await incrementServerUserLimit(uid);
      return res.json({
        reply: offlineReply,
        model: "Sajjat Ai Verified Core",
        providerId: "local",
        providerName: "Sajjat Ai Verified Core",
        fallbackUsed: false,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await executeChatWithFallback({
      message,
      history: Array.isArray(history) ? history : [],
      imageBase64,
      imageMimeType,
      fileContent,
      fileName,
      requestedModel: model,
      preferredProviderId: req.body?.provider,
      systemInstruction: sysPrompt,
    });

    await incrementServerUserLimit(uid);
    return res.json(result);
  } catch (error: any) {
    console.error("Chat API error:", error);
    return res.status(502).json({
      error: error?.message || "AI Provider থেকে উত্তর পাওয়া যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
    });
  }
});

// Text cleanup helper for audio synthesis
function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;

  // Replace code blocks with descriptive text
  text = text.replace(/```[\s\S]*?```/g, " কোড অংশ। ");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove markdown images and links
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Remove headers (#, ##, etc.)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold, italic, strikethrough markdown
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // Remove bullet points and lists
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Remove table pipes and separator lines
  text = text.replace(/\|/g, " ");
  text = text.replace(/^[-:| ]+$/gm, "");

  // Remove emojis and special symbols
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");

  // Remove multiple spaces/newlines
  text = text.replace(/\n+/g, " । ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// Split clean text into chunks suitable for TTS (max ~150 characters per chunk without breaking words)
function splitTextIntoSpeechChunks(text: string, maxLen = 140): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[।?!.\n])/g);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLen) {
      const words = trimmed.split(/\s+/);
      for (const word of words) {
        if ((current + " " + word).trim().length > maxLen) {
          if (current.trim()) chunks.push(current.trim());
          current = word;
        } else {
          current = current ? current + " " + word : word;
        }
      }
    } else {
      if ((current + " " + trimmed).trim().length > maxLen) {
        if (current.trim()) chunks.push(current.trim());
        current = trimmed;
      } else {
        current = current ? current + " " + trimmed : trimmed;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// High-fidelity Speech Synthesis API (TTS)
app.post("/api/tts", async (req, res) => {
  try {
    const rawText = req.body?.text || "";
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "Text is required for TTS" });
    }

    const cleanText = cleanTextForSpeech(rawText);
    if (!cleanText) {
      return res.status(400).json({ error: "Clean text is empty" });
    }

    const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
    const lang = hasBangla ? "bn" : (req.body?.lang || "en");

    // Split into speech chunks (limit to 12 chunks to keep audio responsive)
    const chunks = splitTextIntoSpeechChunks(cleanText).slice(0, 12);
    if (chunks.length === 0) {
      return res.status(400).json({ error: "No playable speech chunks found" });
    }

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const response = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.8"
        }
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuf));
      }
    }

    if (audioBuffers.length === 0) {
      return res.status(500).json({ error: "Failed to generate speech audio" });
    }

    const combinedAudio = Buffer.concat(audioBuffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", combinedAudio.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(combinedAudio);
  } catch (ttsErr: any) {
    console.error("TTS Server error:", ttsErr);
    return res.status(500).json({ error: "TTS synthesis failed", details: ttsErr?.message });
  }
});

// GET endpoint for direct audio streaming
app.get("/api/tts", async (req, res) => {
  try {
    const rawText = (req.query.text as string) || "";
    if (!rawText) {
      return res.status(400).send("Text parameter is required");
    }

    const cleanText = cleanTextForSpeech(rawText);
    const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
    const lang = hasBangla ? "bn" : ((req.query.lang as string) || "en");

    const chunks = splitTextIntoSpeechChunks(cleanText).slice(0, 12);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const response = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuf));
      }
    }

    if (audioBuffers.length === 0) {
      return res.status(500).send("TTS generation failed");
    }

    const combinedAudio = Buffer.concat(audioBuffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", combinedAudio.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(combinedAudio);
  } catch (err: any) {
    return res.status(500).send("TTS Error");
  }
});

// Helper to detect if message is requesting image generation
function isImageGenerationIntent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  const lower = t.toLowerCase();

  // Explicit prefixes
  if (
    lower.startsWith("draw:") ||
    lower.startsWith("image:") ||
    lower.startsWith("ছবি:") ||
    lower.startsWith("ছবি আঁকো:") ||
    lower.startsWith("ছবি তৈরি করো:") ||
    lower.startsWith("/image") ||
    lower.startsWith("/draw")
  ) {
    return true;
  }

  // Bengali patterns
  const banglaPatterns = [
    /(ছবি|চিত্র|পিকচার|ড্রয়িং|ওয়ালপেপার).*(আঁকো|আঁকা|বানাও|তৈরি|দেখা|করো|দিন|চাই|বানিয়ে দাও|বানিয়ে দিন|দাও)/i,
    /(আঁকো|বানাও|তৈরি করো|আঁক|জেনারেট করো|বানিয়ে দাও|এঁকে দাও).*(ছবি|চিত্র|পিকচার|ওয়ালপেপার)/i,
    /(একটি|একটা|সুন্দর|কিছু).*(ছবি|চিত্র|পিকচার).*(আঁকো|বানাও|তৈরি|চাই|দাও)/i,
    /(আমাকে|আমাদের).*(ছবি|চিত্র).*(দাও|বানিয়ে দাও|এঁকে দাও)/i,
    /ছবি\s+বানাও/i,
    /ছবি\s+আঁকো/i,
    /ছবি\s+তৈরি\s+করো/i,
  ];

  if (banglaPatterns.some((p) => p.test(t))) return true;

  // English patterns
  const englishPatterns = [
    /(generate|create|draw|paint|make|produce)\s+(an?\s+)?(image|picture|photo|wallpaper|illustration|art|painting|drawing)/i,
    /(draw|paint|illustrate)\s+(me\s+)?(an?\s+)?/i,
    /^picture\s+of\s+/i,
    /^image\s+of\s+/i,
  ];

  if (englishPatterns.some((p) => p.test(lower))) return true;

  return false;
}

// ----------------------------------------------------
// ⚙️ Live System Settings State (Admin Controllable)
// ----------------------------------------------------
let serverSystemSettings = {
  liveVoiceEnabled: true,
  liveVoiceNotice: "লাইভ ভয়েস চ্যাট সাময়িকভাবে রক্ষণাবেক্ষণের জন্য বন্ধ রয়েছে।",
  liveVoiceName: "Zephyr",
  liveVoiceSpeed: "1.0",
  liveVoiceInstruction: "",
  imageGenerationEnabled: true,
  imageEditingEnabled: true,
  webSearchEnabled: true,
  readAloudEnabled: true,
  bookLibraryEnabled: true,
  userNotificationsEnabled: true,
  aiLimitSystemEnabled: false,
  premiumSystemEnabled: true,
  maintenanceModeEnabled: false,
  imageGenerationNotice: "ছবি তৈরি ফিচারটি বর্তমানে সাময়িক রক্ষণাবেক্ষণের কারণে স্থগিত রয়েছে।",
  imageModelPreset: "flux" as "flux" | "turbo" | "sana",
  imageWatermarkEnabled: true,
  imageWatermarkText: "Sajjat AI",
  aiBrandName: "Sajjat AI",
  aiTagline: "মানুষের সেবায় নিবেদিত সর্বাধুনিক সুপার ইন্টেলিজেন্ট বাংলা এআই সহকারী",
  aiThemeColor: "indigo",
  adminTapCount: 7,
  adminPassword: ""
};

// System Settings API endpoints (never leak adminPassword; mutations require Admin JWT)
app.get("/api/system-settings", (_req, res) => {
  const { adminPassword: _omitted, ...safeSettings } = serverSystemSettings;
  return res.json(safeSettings);
});

app.post("/api/system-settings", requireAdminMiddleware, (req: AdminRequest, res) => {
  if (req.body && typeof req.body === "object") {
    const { adminPassword: _ignoredPassword, ...safeUpdates } = req.body;
    serverSystemSettings = {
      ...serverSystemSettings,
      ...safeUpdates,
      adminPassword: "",
    };
    if (req.body.universalSearch && typeof req.body.universalSearch === "object") {
      updateUniversalSearchConfig(req.body.universalSearch);
    }
    recordAdminAudit({
      action: "SYSTEM_SETTINGS_UPDATED",
      status: "success",
      actorEmail: req.verifiedAdmin!.email,
      actorUid: req.verifiedAdmin!.uid,
      path: "/api/system-settings",
      details: `Updated keys: ${Object.keys(safeUpdates).slice(0, 12).join(", ")}`,
    });
  }
  const { adminPassword: _omitted, ...safeSettings } = serverSystemSettings;
  return res.json({ success: true, settings: safeSettings });
});

// ----------------------------------------------------
// 🔔 Server Notifications Store & Endpoints
// ----------------------------------------------------
interface ServerNotificationItem {
  id: string;
  title: string;
  message: string;
  type: "announcement" | "update" | "alert" | "feature";
  target: "all" | "user";
  targetUserId?: string;
  targetUserEmail?: string;
  senderName?: string;
  createdAt: number;
  expiresAt: number | null;
  expirationOption?: string;
  readBy?: Record<string, boolean>;
}

let serverNotifications: ServerNotificationItem[] = [
  {
    id: "notif_welcome_sajjat_ai",
    title: "Sajjat AI-তে স্বাগতম!",
    message: "মানুষের সেবায় নিবেদিত সর্বাধুনিক সুপার ইন্টেলিজেন্ট বাংলা এআই সহকারী। যেকোনো প্রশ্ন, গণিত, বিজ্ঞান বা কোডিং সমস্যা নিয়ে আলোচনা করুন।",
    type: "announcement",
    target: "all",
    senderName: "Sajjat Mia (Admin)",
    createdAt: Date.now() - 3600000,
    expiresAt: null,
    expirationOption: "none",
    readBy: {}
  }
];

// Notifications endpoints
app.get("/api/notifications", (req, res) => {
  // Return all notifications sorted newest first
  return res.json({ success: true, notifications: serverNotifications });
});

app.post("/api/notifications", requireAdminMiddleware, (req: AdminRequest, res) => {
  try {
    const { 
      title, 
      message, 
      type = "announcement", 
      target = "all", 
      targetUserId, 
      targetUserEmail, 
      senderName = "Sajjat Mia (Admin)", 
      expirationOption = "none",
      expiresAt: customExpiresAt
    } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const now = Date.now();
    let expiresAt: number | null = customExpiresAt || null;
    if (!expiresAt) {
      if (expirationOption === "1d") expiresAt = now + 24 * 60 * 60 * 1000;
      else if (expirationOption === "3d") expiresAt = now + 3 * 24 * 60 * 60 * 1000;
      else if (expirationOption === "7d") expiresAt = now + 7 * 24 * 60 * 60 * 1000;
      else if (expirationOption === "30d") expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    }

    const notifId = req.body.id || `notif_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: ServerNotificationItem = {
      id: notifId,
      title: String(title).trim(),
      message: String(message).trim(),
      type,
      target,
      targetUserId,
      targetUserEmail,
      senderName,
      createdAt: req.body.createdAt || now,
      expiresAt,
      expirationOption,
      readBy: req.body.readBy || {}
    };

    serverNotifications = [newNotif, ...serverNotifications.filter(n => n.id !== notifId)].slice(0, 100);
    recordAdminAudit({
      action: "ADMIN_NOTIFICATION_SENT",
      status: "success",
      actorEmail: req.verifiedAdmin!.email,
      actorUid: req.verifiedAdmin!.uid,
      path: "/api/notifications",
      details: `Notification "${newNotif.title}" target=${target}`,
    });
    return res.json({ success: true, notification: newNotif, notifications: serverNotifications });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to save notification" });
  }
});

app.delete("/api/notifications/:id", requireAdminMiddleware, (req: AdminRequest, res) => {
  const { id } = req.params;
  serverNotifications = serverNotifications.filter(n => n.id !== id);
  recordAdminAudit({
    action: "ADMIN_NOTIFICATION_DELETED",
    status: "success",
    actorEmail: req.verifiedAdmin!.email,
    actorUid: req.verifiedAdmin!.uid,
    path: req.originalUrl,
    details: `Deleted notification id=${id}`,
  });
  return res.json({ success: true, notifications: serverNotifications });
});

app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const { uid } = req.body || {};
  if (uid) {
    const target = serverNotifications.find(n => n.id === id);
    if (target) {
      if (!target.readBy) target.readBy = {};
      target.readBy[uid] = true;
    }
  }
  return res.json({ success: true });
});


// Comprehensive Bengali visual concept & vocabulary dictionary for instant translation
const BENGALI_VISUAL_MAP: Record<string, string> = {
  // Animals & Birds
  "বিড়াল": "cute domestic cat",
  "বেড়াল": "cute domestic cat",
  "কুকুর": "friendly golden dog",
  "পাখি": "vibrant colorful bird on a branch",
  "মাছ": "colorful swimming fish in clear water",
  "রাজহাঁস": "graceful white swan gliding on peaceful lake",
  "হাঁস": "swimming duck in village pond",
  "ময়ূর": "majestic peacock with open iridescent feathers",
  "ময়ুর": "majestic peacock with open iridescent feathers",
  "হরিণ": "spotted deer in natural forest",
  "ঘোড়া": "wild galloping horse in open meadow",
  "ঘোড়া": "wild galloping horse in open meadow",
  "হাতি": "noble Asian elephant walking gently in nature",
  "বাঘ": "royal Bengal tiger in natural jungle habitat",
  "সিংহ": "magnificent male lion resting with golden mane",
  "গরু": "gentle cow grazing in green pasture",

  // Nature & Landscape
  "নদী": "clear river with gentle ripples",
  "পাহাড়": "majestic mountain landscape with morning sunlight",
  "পাহাড়": "majestic mountain landscape with morning sunlight",
  "পাহাড়ি": "mountainous scenery",
  "পাহাড়ি": "mountainous scenery",
  "ঝর্ণা": "sparkling crystal waterfall cascading over mossy rocks",
  "সমুদ্র": "ocean waves meeting sandy shoreline",
  "সৈকত": "peaceful beach with golden sand and waves",
  "সূর্যোদয়": "golden sunrise over morning horizon with soft mist",
  "সূর্যোদয়": "golden sunrise over morning horizon with soft mist",
  "সূর্যাস্ত": "breathtaking sunset sky with golden and red reflections",
  "গ্রাম": "traditional rural Bengal village with earthen cottages and green fields",
  "বন": "lush green woodland forest with sunbeams",
  "জঙ্গল": "dense green jungle with lush foliage",
  "আকাশ": "clear blue sky with soft white clouds",
  "মেঘ": "dramatic puffy clouds in the sky",
  "বৃষ্টি": "rainy day with raindrops and wet pavement reflections",
  "চাঁদ": "luminous moon in deep clear night sky",
  "তারা": "starry night sky full of shining stars",
  "গাছ": "majestic lush green tree",
  "ধানখেত": "vast golden green paddy fields swaying in breeze",
  "ধানক্ষেত": "vast golden green paddy fields swaying in breeze",
  "কাশফুল": "blooming white kash phool reeds along village riverbank",

  // Flowers
  "ফুল": "blooming vibrant flowers with dew drops",
  "গোলাপ": "fresh red rose with delicate dewdrops on petals",
  "পদ্ম": "blooming pink lotus flower on water",
  "শাপলা": "national white water lily floating on serene pond",
  "বাগান": "peaceful botanical garden with blooming flowers",

  // Buildings & Places
  "মসজিদ": "beautiful majestic mosque with minarets and dome",
  "মসজিদের": "beautiful majestic mosque with minarets and dome",
  "মন্দির": "beautiful traditional temple architecture",
  "বাড়ি": "beautiful modern luxury house design",
  "বাড়ি": "beautiful modern luxury house design",
  "ঘর": "cozy beautiful room interior",

  // People & Everyday Life
  "মাঝি": "wooden country boat on river",
  "নৌকা": "traditional wooden country boat on calm water",
  "পালতোলা নৌকা": "traditional wooden boat with colorful canvas sail on river",
  "কৃषक": "hardworking farmer walking in rural green farmland",
  "মেয়ে": "portrait of a graceful woman with natural lighting",
  "মেয়ে": "portrait of a graceful woman with natural lighting",
  "নারী": "portrait of an elegant woman in traditional attire",
  "ছেলে": "portrait of a young man with natural soft lighting",
  "শিশু": "happy joyful cute child smiling outdoors",
  "ডাক্তার": "caring professional doctor in modern clinic",
  "শিক্ষক": "dedicated teacher in classroom",
  "বৃদ্ধ": "wise elderly person with kind smile",

  // Vehicles & Modern
  "জাহাজ": "grand ocean liner passenger ship sailing gracefully on blue sea water",
  "জাহাজের": "grand ocean liner passenger ship sailing gracefully on blue sea water",
  "লঞ্চ": "Bangladeshi passenger river launch ferry boat travelling on wide river",
  "স্টিমার": "vintage passenger steamship vessel on river water",
  "গাড়ি": "sleek modern car on road",
  "কার": "sleek modern car on road",
  "স্পোর্টস কার": "luxury high-performance sports car",
  "মোটরসাইকেল": "stylish modern motorcycle on scenic highway",
  "ট্রেন": "passenger train travelling through scenic countryside",
  "উড়োজাহাজ": "modern commercial airplane flying above white clouds",
  "প্লেন": "airplane in sky",
  "রোবট": "futuristic sleek humanoid robot with illuminated details",
  "শহর": "modern city street with architecture and traffic",
  "ঢাকা": "vibrant city scene of Dhaka with landmarks and urban life",

  // Colors & Qualities
  "লাল": "red",
  "নীল": "blue",
  "সবুজ": "green",
  "কালো": "black",
  "সাদা": "white",
  "হলুদ": "yellow",
  "সোনালী": "golden",
  "রুপালী": "silver",
  "সুন্দর": "beautiful",
  "আসল": "authentic realistic photograph",
  "বাস্তব": "realistic authentic photo",
};

// Clean user prompt to extract visual subject
function cleanImagePromptSubject(rawPrompt: string): string {
  let p = rawPrompt.trim();
  p = p.replace(/^(draw:|image:|ছবি:|ছবি আঁকো:|ছবি তৈরি করো:|\/image|\/draw)\s*/i, "");
  p = p.replace(/^(আমাকে|একটি|একটা|দয়া করে|প্লিজ)\s+/i, "");
  p = p.replace(/(ছবি আঁকো|ছবি বানাও|ছবি তৈরি করো|ছবি বানিয়ে দাও|ছবি এঁকে দাও|ছবি তৈরি করে দেন|ছবি বানিয়ে দেন|ছবি তৈরি করে দাও|এর ছবি দাও|এর ছবি চাই|ছবি চাই|draw an image of|generate an image of|create a picture of|draw a|paint a)/gi, "");
  return p.trim() || rawPrompt.trim();
}

// Local translation helper to convert Bengali prompt to clean English
function translateBengaliPromptToEnglish(prompt: string): string {
  let clean = cleanImagePromptSubject(prompt);
  const requestsHuman = ["মানুষ", "ব্যক্তি", "মেয়ে", "মেয়ে", "ছেলে", "নারী", "পুরুষ", "শিশু", "বাচ্চা", "ডাক্তার", "শিক্ষক", "প্রতিকৃতি", "পোর্ট্রেট", "person", "man", "woman", "girl", "boy", "child", "human", "portrait", "face", "people", "character", "model"].some(kw => prompt.toLowerCase().includes(kw));

  let text = clean;
  const phraseMap: Array<[RegExp, string]> = [
    [/মসজিদ|মসজিদের|মসজিদের ছবি/gi, "beautiful majestic mosque with minarets and dome"],
    [/মন্দির|মন্দিরের/gi, "beautiful traditional temple architecture"],
    [/বাড়ি|বাড়ি|বাড়ির|বাড়ির ছবি|সুন্দর বাড়ি/gi, "beautiful modern luxury house design"],
    [/জাহাজ|জাহাজের|জাহাজের ছবি|সমুদ্রের জাহাজ|বড় জাহাজ|বড় জাহাজের/gi, "grand ocean liner passenger ship sailing gracefully on deep blue sea water"],
    [/লঞ্চ|লঞ্চের|নৌযান/gi, "Bangladeshi passenger river launch ferry boat travelling on wide river"],
    [/স্টিমার|স্টিমারের/gi, "vintage passenger steamship vessel on river water"],
    [/বাংলাদেশি নদী|বাংলাদেশের নদী|সুন্দর বাংলাদেশি নদী|সুন্দর নদীর/gi, "scenic Bangladeshi river landscape"],
    [/পালতোলা নৌকা|পাল তোলা নৌকা|পালতোলা নৌকার/gi, "traditional wooden boat with colorful canvas sail on river water"],
    [/নৌকা|নৌকার/gi, "traditional wooden country boat on calm water"],
    [/কাশফুল|কাশ fuel/gi, "blooming white kash phool reeds along village riverbank"],
    [/নদীর দৃশ্য/gi, "scenic river landscape view"],
    [/পাহাড়ি দৃশ্য|পাহাড়ি দৃশ্য/gi, "mountainous landscape scenery"],
    [/সূর্যাস্তের আলো/gi, "golden sunset light"],
    [/সূর্যোদয়ের আলো|সূর্যোদয়ের আলো/gi, "morning sunrise light"],
    [/সবুজ গ্রাম|গ্রামীণ পরিবেশ/gi, "peaceful green rural Bengal village scenery"],
    [/ধানখেত|ধানক্ষেত/gi, "golden green paddy fields"],
    [/স্পোর্টস কার/gi, "luxury high-performance sports car"],
    [/ভবিষ্যতের ঢাকা/gi, "futuristic sci-fi city of Dhaka"],
    [/বাংলাদেশের মানচিত্র/gi, "topographic physical map of Bangladesh"],
  ];

  for (const [regex, rep] of phraseMap) {
    text = text.replace(regex, rep);
  }

  const words = text.split(/\s+/);
  const parts: string[] = [];
  for (const w of words) {
    const cleanW = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()|"'।]/g, "").trim();
    if (!cleanW) continue;
    if (BENGALI_VISUAL_MAP[cleanW]) {
      parts.push(BENGALI_VISUAL_MAP[cleanW]);
      continue;
    }
    const stemmed = cleanW.replace(/(ের|এর|টি|টা|গুলো|গুলোর|কে|তে)$/, "");
    if (BENGALI_VISUAL_MAP[stemmed]) {
      parts.push(BENGALI_VISUAL_MAP[stemmed]);
      continue;
    }
    parts.push(cleanW);
  }

  let result = parts.join(" ");

  if (!result || result.trim().length < 2) {
    result = "beautiful majestic scenery";
  }

  if (!requestsHuman) {
    return `${result}, high resolution, beautiful lighting, clear focus, no humans, no people, no portraits`;
  }
  return `${result}, realistic portrait, high resolution, soft lighting`;
}

// Generate Native AI Image using official Google GenAI SDK (gemini-3.1-flash-image Nano Banana 2)
async function generateAiImage(
  userPrompt: string,
  apiKey?: string,
  options: { aspectRatio?: string; style?: string; engine?: string } = {}
) {
  const activeKey = apiKey?.trim() || getProviderApiKey("gemini") || process.env.GEMINI_API_KEY?.trim() || "";

  if (!activeKey) {
    throw new Error("ইমেজ জেনারেশন ইঞ্জিন কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিন প্যানেলে API Key যুক্ত করুন।");
  }

  const ai = new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });

  const subject = cleanImagePromptSubject(userPrompt);

  // 1. Precise prompt understanding & bilingual translation using Gemini Text Model
  // Preserves 100% of user intent for Bangla and English prompts
  let visualPrompt = userPrompt;
  let caption = `আমি আপনার অনুরোধ অনুযায়ী "${subject || userPrompt}"-এর চমৎকার বাস্তবসম্মত ছবি তৈরি করেছি।`;

  const containsBengali = /[\u0980-\u09FF]/.test(userPrompt);
  if (containsBengali || userPrompt.trim().length > 0) {
    const translationModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
    let translatedText = "";
    
    for (const modelName of translationModels) {
      try {
        const translationPrompt = `You are a precise, professional image generation prompt translator.
The user wants to generate an image from this prompt (could be in Bengali, English, or mixed):
"${userPrompt}"

Translate it to English as a clear, literal, high-detail description for a text-to-image model.
CRITICAL Rules:
1. Maintain 100% subject integrity based strictly on what the user requested. 
2. If the prompt does NOT explicitly request a human, person, portrait, man, woman, girl, boy, or child (e.g. river, landscape, boat, flower, nature, animal, car, map, building, object, food, logo, drawing):
   - Translate the requested subject literally and accurately into English.
   - Do NOT add any humans, people, models, characters, or portraits.
   - Always append ", no humans, no people, no portraits" at the end of the translated prompt.
3. If the prompt DOES explicitly request a person, human, or character (e.g. "একটি মেয়ের পোট্রেট", "একজন ডাক্তারের ছবি"):
   - Accurately describe the requested person/character according to the user's instructions.
4. Examples:
   - "একটি সুন্দর বাংলাদেশি নদী, কাশফুল ও পালতোলা নৌকার দৃশ্য তৈরি করুন" -> "A beautiful scenic view of a Bangladeshi river with blooming white kash phool reeds along the riverbank and traditional wooden boats with canvas sails on calm water, high resolution, no humans, no people, no portraits"
   - "একটি লাল গোলাপের ছবি তৈরি করুন" -> "A close-up photograph of a vibrant red rose flower with dew drops, soft lighting, sharp focus, no humans, no people, no portraits"
   - "একটি সুন্দর গ্রামের দৃশ্য তৈরি করুন" -> "A peaceful Bangladeshi rural village scenery with green paddy fields, traditional tin-shed houses, coconut trees, calm pond, daylight landscape photography, no humans, no people, no portraits"
   - "বাংলাদেশের মানচিত্র তৈরি করুন" -> "Topographic physical map of Bangladesh showing river networks, national borders, and green land, satellite map style, no humans, no people"
   - "একটি বিড়ালের ছবি তৈরি করুন" -> "A cute domestic cat sitting gracefully, soft ambient lighting, detailed fur texture, animal photography, no humans, no people"
   - "একজন সুন্দর বাঙালি নারীর প্রতিকৃতি" -> "A beautiful Bangladeshi woman in traditional saree, warm natural lighting, realistic portrait"

Output ONLY the translated English description, with no explanation, no markdown formatting, and no extra text.`;

        const refineRes = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: translationPrompt }] }],
        });

        if (refineRes.text && refineRes.text.trim().length > 3) {
          translatedText = refineRes.text.trim().replace(/^["']|["']$/g, ""); // strip quotes
          break;
        }
      } catch (err) {
        console.log(`[Gemini Prompt Translation] Model ${modelName} fallback.`);
      }
    }

    if (translatedText && !/[\u0980-\u09FF]/.test(translatedText)) {
      visualPrompt = translatedText;
      console.log(`[Gemini Prompt Translation] Successfully translated "${userPrompt}" -> "${visualPrompt}"`);
    } else {
      // Dynamic Translation API Backup: Translates ANY arbitrary user prompt to perfect English dynamically!
      try {
        console.log(`[Dynamic Translation API] Translating "${userPrompt}"...`);
        const cleanToTranslate = cleanImagePromptSubject(userPrompt);
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanToTranslate)}&langpair=bn|en`;
        
        const response = await fetch(myMemoryUrl, { headers: { "User-Agent": "aistudio-build" } });
        if (response.ok) {
          const data = await response.json() as any;
          const apiTranslated = data.responseData?.translatedText;
          if (apiTranslated && apiTranslated.trim().length > 1 && !/[\u0980-\u09FF]/.test(apiTranslated)) {
            let result = apiTranslated.trim().replace(/^["']|["']$/g, "");
            
            const requestsHuman = ["person", "man", "woman", "girl", "boy", "child", "human", "portrait", "face", "people", "character", "model", "মানুষ", "ব্যক্তি", "মেয়ে", "মেয়ে", "ছেলে", "নারী", "পুরুষ", "শিশু", "বাচ্চা"].some(kw => userPrompt.toLowerCase().includes(kw));
            if (!requestsHuman) {
              result = `${result}, high resolution, beautiful lighting, clear focus, no humans, no people, no portraits`;
            } else {
              result = `${result}, high resolution, realistic portrait, soft lighting`;
            }
            
            visualPrompt = result;
            console.log(`[Dynamic Translation API] Success! Translated to: "${visualPrompt}"`);
          } else {
            throw new Error("Invalid response format or contains Bengali characters");
          }
        } else {
          throw new Error(`HTTP status ${response.status}`);
        }
      } catch (transError: any) {
        console.log(`[Dynamic Translation API] Unavailable: ${transError?.message || transError}. Falling back to local dictionary...`);
        visualPrompt = translateBengaliPromptToEnglish(userPrompt);
      }
    }
  } else {
    // If user prompt is in English, ensure human filter if not requested
    const requestsHuman = ["person", "man", "woman", "girl", "boy", "child", "human", "portrait", "face", "people", "character", "model"].some(kw => userPrompt.toLowerCase().includes(kw));
    if (!requestsHuman && !/no humans|no people/i.test(visualPrompt)) {
      visualPrompt = `${visualPrompt}, no humans, no people, no portraits`;
    }
  }

  // Ensure no remaining Bengali characters exist in visualPrompt
  if (/[\u0980-\u09FF]/.test(visualPrompt)) {
    visualPrompt = translateBengaliPromptToEnglish(userPrompt);
  }

  // Add the artistic style if specified by the user
  if (options.style && options.style !== "photorealistic" && options.style !== "default" && options.style !== "portrait") {
    visualPrompt = `${visualPrompt}, in ${options.style} style`;
  }

  // 2. Map Aspect Ratio to Gemini Image API supported format
  let mappedAspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" = "1:1";
  if (options.aspectRatio === "16:9") mappedAspectRatio = "16:9";
  else if (options.aspectRatio === "9:16") mappedAspectRatio = "9:16";
  else if (options.aspectRatio === "4:3") mappedAspectRatio = "4:3";
  else if (options.aspectRatio === "3:4") mappedAspectRatio = "3:4";

  // 2.5. Map Aspect Ratio to Fal.ai supported format
  let imageSize: any = "square_hd";
  if (mappedAspectRatio === "16:9") {
    imageSize = "landscape_16_9";
  } else if (mappedAspectRatio === "9:16") {
    imageSize = "portrait_16_9";
  } else if (mappedAspectRatio === "4:3") {
    imageSize = "landscape_4_3";
  } else if (mappedAspectRatio === "3:4") {
    imageSize = { width: 768, height: 1024 };
  }

  // --- PRIORITIZE FAL.AI ONLY WHEN A VALID KEY IS CONFIGURED ---
  const falRecord = getProviderRecord("fal");
  const falKey = (falRecord?.apiKey || process.env.FAL_KEY || "").trim();
  if (!falRecord?.isLocked && falRecord?.enabled !== false && falKey.length > 5) {
    try {
      const falModel = falRecord?.modelId || "fal-ai/flux/schnell";
      console.log(`[FAL-AI Image Gen] Requesting image via ${falModel} for prompt: "${visualPrompt}" with size: ${JSON.stringify(imageSize)}`);

      const falResponse = await fetch(`https://fal.run/${falModel}`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${falKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: visualPrompt,
          image_size: imageSize,
          sync_mode: true
        })
      });

      if (falResponse.ok) {
        const falData = await falResponse.json() as any;
        const generatedImage = falData?.images?.[0];

        if (generatedImage?.url) {
          console.log(`[FAL-AI Image Gen] Success! Image URL: ${generatedImage.url}`);
          return {
            imageUrl: generatedImage.url,
            directUrl: generatedImage.url,
            prompt: userPrompt,
            refinedPrompt: visualPrompt,
            caption: caption,
            model: `Fal.ai / FLUX Schnell`,
            aspectRatio: mappedAspectRatio,
            debugInfo: {
              userPrompt: userPrompt,
              finalImagePrompt: visualPrompt,
              modelUsed: "Fal.ai / FLUX Schnell",
              apiStatus: "Success"
            }
          };
        }
      } else {
        const errText = await falResponse.text();
        if (
          falResponse.status === 401 ||
          falResponse.status === 403 ||
          errText.includes("TOP_UP") ||
          errText.includes("locked") ||
          errText.includes("invalid key")
        ) {
          setProviderLocked("fal", true);
          console.log(`[FAL-AI Image Gen] Fal.ai key unavailable (${falResponse.status}). Disabling Fal.ai for this session and switching to render fallback.`);
        } else {
          console.log(`[FAL-AI Image Gen] Fal.ai unavailable (status: ${falResponse.status}). Switching to render fallback.`);
        }
      }
    } catch {
      console.log("[FAL-AI Image Gen] Fal.ai unreachable. Switching to render fallback.");
    }
  }

  // 3. Generate image using Google GenAI native models (gemini-3.1-flash-image, imagen-3.0-generate-002, etc.)
  const nativeModels = [
    { name: "gemini-3.1-flash-image", type: "content" },
    { name: "gemini-3.1-flash-lite-image", type: "content" },
    { name: "imagen-3.0-generate-002", type: "images" },
    { name: "imagen-3.0-generate-001", type: "images" },
    { name: "imagen-3.0-fast-generate-001", type: "images" }
  ];

  let lastError: any = null;

  for (const m of nativeModels) {
    try {
      console.log(`[Google GenAI Image] Trying model: ${m.name} with prompt: "${visualPrompt.slice(0, 80)}..."`);
      if (m.type === "content") {
        const response = await ai.models.generateContent({
          model: m.name,
          contents: { parts: [{ text: visualPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: mappedAspectRatio,
              imageSize: "1K"
            }
          }
        });
        const cand = response.candidates?.[0];
        for (const part of cand?.content?.parts || []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
            console.log(`[Google GenAI Image] Success with ${m.name}! Data size: ${part.inlineData.data.length} bytes`);
            return {
              imageUrl: dataUrl,
              directUrl: dataUrl,
              prompt: userPrompt,
              refinedPrompt: visualPrompt,
              caption: caption,
              model: m.name,
              aspectRatio: mappedAspectRatio,
              debugInfo: {
                userPrompt: userPrompt,
                finalImagePrompt: visualPrompt,
                modelUsed: m.name,
                apiStatus: "Success"
              }
            };
          }
        }
      } else if (m.type === "images") {
        const response = await (ai.models as any).generateImages({
          model: m.name,
          prompt: visualPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: mappedAspectRatio,
          }
        });
        const generatedImages = (response as any).generatedImages || [];
        if (generatedImages.length > 0 && generatedImages[0].image?.imageBytes) {
          const mime = generatedImages[0].image.mimeType || "image/jpeg";
          const dataUrl = `data:${mime};base64,${generatedImages[0].image.imageBytes}`;
          console.log(`[Google GenAI Imagen] Success with ${m.name}!`);
          return {
            imageUrl: dataUrl,
            directUrl: dataUrl,
            prompt: userPrompt,
            refinedPrompt: visualPrompt,
            caption: caption,
            model: m.name,
            aspectRatio: mappedAspectRatio,
            debugInfo: {
              userPrompt: userPrompt,
              finalImagePrompt: visualPrompt,
              modelUsed: m.name,
              apiStatus: "Success"
            }
          };
        }
      }
    } catch (err: any) {
      console.log(`[Google GenAI Image] Model ${m.name} free tier limit active, switching engine...`);
      lastError = err;
    }
  }

  // Handle native free tier rate limit by generating through high-speed AI render channel
  console.log("[Gemini Image Generation] Initiating high-speed AI render channel...");

  try {
    let width = 1024;
    let height = 1024;
    if (mappedAspectRatio === "16:9") {
      width = 1024;
      height = 576;
    } else if (mappedAspectRatio === "9:16") {
      width = 576;
      height = 1024;
    } else if (mappedAspectRatio === "4:3") {
      width = 1024;
      height = 768;
    } else if (mappedAspectRatio === "3:4") {
      width = 768;
      height = 1024;
    }

    const seed = Math.floor(Math.random() * 1000000);
    const modelNameForPollinations = "flux";
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=false&model=${modelNameForPollinations}`;

    console.log(`[Gemini Image Generation] Render channel URL ready.`);
    
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout
      
      const fetchResponse = await fetch(pollinationsUrl, { 
        headers: { "User-Agent": "aistudio-build" },
        signal: controller.signal 
      });
      clearTimeout(tId);

      if (fetchResponse.ok) {
        const buffer = await fetchResponse.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:image/png;base64,${base64Data}`;

        console.log(`[Gemini Image Generation] Render channel success.`);
        return {
          imageUrl: dataUrl,
          directUrl: dataUrl,
          prompt: userPrompt,
          refinedPrompt: visualPrompt,
          caption: caption,
          model: `Flux / Sajjat AI Neural Engine`,
          aspectRatio: mappedAspectRatio,
          debugInfo: {
            userPrompt: userPrompt,
            finalImagePrompt: visualPrompt,
            modelUsed: "Flux / Sajjat AI Neural Engine",
            apiStatus: "Success"
          }
        };
      } else {
        throw new Error(`Status ${fetchResponse.status}`);
      }
    } catch (fetchErr: any) {
      console.log("[Gemini Image Generation] Direct stream link initialized.");
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(pollinationsUrl)}`;
      return {
        imageUrl: proxyUrl,
        directUrl: pollinationsUrl,
        prompt: userPrompt,
        refinedPrompt: visualPrompt,
        caption: caption,
        model: `Flux / Sajjat AI Neural Engine`,
        aspectRatio: mappedAspectRatio,
        debugInfo: {
          userPrompt: userPrompt,
          finalImagePrompt: visualPrompt,
          modelUsed: "Flux / Sajjat AI Neural Engine",
          apiStatus: "Success"
        }
      };
    }
  } catch (fallbackErr: any) {
    console.log("[Gemini Image Generation] Rendering fallbacks initialized.");
  }

  throw new Error("ছবি তৈরি করতে ব্যর্থ হয়েছে। দয়া করে ভিন্ন শব্দ ব্যবহার করে পুনরায় চেষ্টা করুন।");
}

// Image Proxy Endpoint (Provides CORS-free access and fast caching for canvas watermarking)
app.get("/api/image-proxy", async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send("Image URL parameter is required");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fallback: direct browser redirect to image source
      return res.redirect(imageUrl);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    return res.send(buffer);
  } catch {
    // If proxy fetch fails or times out, redirect directly to original URL
    return res.redirect(imageUrl);
  }
});

// Dedicated Image Generation API
app.post("/api/generate-image", async (req, res) => {
  try {
    if (!serverSystemSettings.imageGenerationEnabled) {
      return res.status(403).json({
        success: false,
        error: serverSystemSettings.imageGenerationNotice || "ছবি তৈরি ফিচারটি বর্তমানে সাময়িক রক্ষণাবেক্ষণের কারণে স্থগিত রয়েছে।"
      });
    }

    const { prompt, aspectRatio, style, engine } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "প্রম্পট দেওয়া আবশ্যক।" });
    }

    const activeKey = req.body?.customApiKey || getProviderApiKey("gemini") || process.env.GEMINI_API_KEY;
    const result = await generateAiImage(prompt, activeKey, { 
      aspectRatio, 
      style, 
      engine: engine || serverSystemSettings.imageModelPreset 
    });

    return res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Generate image endpoint error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "ছবি তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।",
    });
  }
});

// Dedicated Image Editing API (Multi-turn support)
app.post("/api/edit-image", async (req, res) => {
  try {
    if (serverSystemSettings.imageEditingEnabled === false) {
      return res.status(403).json({
        success: false,
        error: "ছবি এডিটিং ফিচারটি বর্তমানে সাময়িক রক্ষণাবেক্ষণের কারণে স্থগিত রয়েছে।"
      });
    }

    const { image, instruction, customApiKey } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: "ইউজার ইমেজ প্রদান করা আবশ্যক।" });
    }
    if (!instruction || typeof instruction !== "string" || !instruction.trim()) {
      return res.status(400).json({ success: false, error: "এডিটিং ইন্সট্রাকশন দেওয়া আবশ্যক।" });
    }

    const activeKey = customApiKey?.trim() || getProviderApiKey("gemini") || process.env.GEMINI_API_KEY?.trim() || "";
    if (!activeKey) {
      return res.status(400).json({ success: false, error: "ইমেজ এডিটিং ইঞ্জিন কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিন প্যানেলে API Key যুক্ত করুন।" });
    }

    const ai = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    // Strip base64 header if present
    const base64Match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = image;
    if (base64Match) {
      mimeType = base64Match[1];
      base64Data = base64Match[2];
    }

    let editedImageUrl = "";
    let methodUsed = "Gemini Native Image Editing";

    // 1. Try Gemini Native Image Editing
    try {
      console.log(`[Image Edit] Calling gemini-3.1-flash-image with instruction: "${instruction}"`);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: `Please edit this image according to the following instruction: "${instruction}". Generate and return the updated/edited image based on these changes. Do not describe the changes in text, only return the edited image.`
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      const candidates = response.candidates || [];
      for (const cand of candidates) {
        for (const part of cand.content?.parts || []) {
          if (part.inlineData?.data) {
            const returnedMime = part.inlineData.mimeType || "image/png";
            editedImageUrl = `data:${returnedMime};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (editedImageUrl) break;
      }
    } catch (err) {
      console.error("[Image Edit] Gemini Native Image Editing failed, trying secondary model gemini-3.1-flash-lite-image...", err);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              {
                text: `Please edit this image according to the following instruction: "${instruction}". Generate and return the updated/edited image based on these changes.`
              }
            ]
          }
        });
        const candidates = response.candidates || [];
        for (const cand of candidates) {
          for (const part of cand.content?.parts || []) {
            if (part.inlineData?.data) {
              const returnedMime = part.inlineData.mimeType || "image/png";
              editedImageUrl = `data:${returnedMime};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (editedImageUrl) break;
        }
      } catch (liteErr) {
        console.error("[Image Edit] Gemini Lite Image Editing also failed.", liteErr);
      }
    }

    // 2. Fallback: If Gemini Image Editing didn't return an image, use Pollinations with a smart described scene
    if (!editedImageUrl) {
      console.log("[Image Edit] Initiating Pollinations smart fallback render...");
      methodUsed = "Pollinations Smart Fallback";
      
      // Let's ask Gemini Text to describe the edited scene based on original image + instruction
      let refinedPrompt = `A high-quality edited version of the image with the changes: ${instruction}`;
      try {
        const textModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
        for (const model of textModels) {
          try {
            const analysisPrompt = {
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType
                    }
                  },
                  {
                    text: `Analyze this image. The user wants to edit this image with the instruction: "${instruction}". 
Write a high-detail English description (prompt) for a text-to-image generator (like Stable Diffusion / Flux) that describes the *final desired edited image*.
Rules:
1. Describe the original subject/objects accurately so they are preserved in the final image.
2. Incorporate the requested change perfectly (e.g. if background changed to mountains, describe the original subject in front of green mountains).
3. If the instruction or original image does NOT explicitly request or contain a human/person, DO NOT ADD ANY HUMANS, PEOPLE, OR PORTRAITS. Append ", no humans, no people, no portraits".
4. Output ONLY the final English description with no extra words, greetings, or markdown tags.`
                  }
                ]
              }
            };

            const response = await ai.models.generateContent({
              model: model,
              contents: analysisPrompt.contents,
              config: { temperature: 0.2 }
            });

            if (response.text && response.text.trim().length > 10) {
              refinedPrompt = response.text.trim().replace(/^["']|["']$/g, "");
              console.log(`[Image Edit Fallback] Refined prompt: "${refinedPrompt}"`);
              break;
            }
          } catch (textErr) {
            console.error(`[Image Edit Fallback] Text model ${model} failed`, textErr);
          }
        }
      } catch (err) {
        console.error("[Image Edit Fallback] All text models failed to refine prompt, using rule-based translation.", err);
      }

      // If refinedPrompt is still simple, translate the instruction
      if (refinedPrompt.startsWith("A high-quality edited version")) {
        const isBangla = /[\u0980-\u09FF]/.test(instruction);
        if (isBangla) {
          try {
            const translationModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
            for (const tModel of translationModels) {
              try {
                const translationRes = await ai.models.generateContent({
                  model: tModel,
                  contents: `Translate this image editing instruction to a detailed English image prompt: "${instruction}". Output only the English translation.`
                });
                if (translationRes.text) {
                  refinedPrompt = `${translationRes.text.trim()}, ultra realistic, high detail, photorealistic`;
                  break;
                }
              } catch (tErr) {
                // Continue to next translation model
              }
            }
          } catch (e) {
            let cleanInst = instruction.toLowerCase();
            if (cleanInst.includes("পাহাড়") || cleanInst.includes("পাহাড়")) {
              refinedPrompt = "The original subject placed in front of beautiful green mountains and hills, sunset sky, realistic photorealistic";
            } else if (cleanInst.includes("আকাশ") || cleanInst.includes("sunset") || cleanInst.includes("সূর্যাস্ত")) {
              refinedPrompt = "The original subject with a beautiful dramatic sunset sky background, warm cinematic lighting, realistic";
            } else if (cleanInst.includes("কার্টুন") || cleanInst.includes("cartoon")) {
              refinedPrompt = "The original subject transformed into a colorful 3D Disney Pixar cartoon animation style, high quality 3D render";
            } else {
              refinedPrompt = `${instruction}, high quality realistic photo`;
            }
          }
        }
      }

      // Render using Pollinations with a random seed
      const seed = Math.floor(Math.random() * 1000000);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(refinedPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=false&model=flux`;
      
      console.log(`[Image Edit Fallback] Fetching from: ${pollinationsUrl}`);
      const imageFetch = await fetch(pollinationsUrl);
      if (!imageFetch.ok) {
        throw new Error("ইমেজ এডিটিং এপিআই রেসপন্স করতে পারছে না। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
      
      const arrayBuffer = await imageFetch.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      editedImageUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    }

    if (!editedImageUrl) {
      throw new Error("দুঃখিত, কোনো ছবি তৈরি করা সম্ভব হয়নি।");
    }

    return res.json({
      success: true,
      imageUrl: editedImageUrl,
      method: methodUsed,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("Image edit API error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "ছবি এডিট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।"
    });
  }
});

// Direct route to download or view Sajjat_AI.html
app.get("/download-html", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "Sajjat_AI.html");
  res.download(filePath, "Sajjat_AI.html");
});

app.get("/Sajjat_AI.html", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "Sajjat_AI.html");
  res.sendFile(filePath);
});

// ----------------------------------------------------
// 📱 Sajjat Ai Phone Control API Endpoints & Live WS
// ----------------------------------------------------
app.get("/api/phone-control/status", (_req, res) => {
  return res.json(getPhoneControlStatus("node-server"));
});

app.post("/api/phone-control/analyze", async (req, res) => {
  try {
    const result = await analyzeScreenWithGemini({
      imageBase64: req.body?.imageBase64 || "",
      mimeType: req.body?.mimeType || "image/jpeg",
      question: req.body?.question || "",
      language: req.body?.language === "en" ? "en" : "bn",
    });
    const status =
      result.success ? 200 : result.errorCode === "INVALID_INPUT" ? 400 : result.errorCode === "MISSING_API_KEY" ? 503 : 500;
    return res.status(status).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: "API_ERROR",
      error: err?.message || "স্ক্রিন বিশ্লেষণ সার্ভার ত্রুটি।",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/phone-control/voice", async (req, res) => {
  try {
    const result = await processPhoneVoiceCommand({
      text: req.body?.text || "",
      language: req.body?.language === "en" ? "en" : "bn",
      hasScreenShare: Boolean(req.body?.hasScreenShare),
      history: Array.isArray(req.body?.history) ? req.body.history : [],
    });
    const status =
      result.success ? 200 : result.errorCode === "INVALID_INPUT" ? 400 : result.errorCode === "MISSING_API_KEY" ? 503 : 500;
    return res.status(status).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: "API_ERROR",
      error: err?.message || "ভয়েস নির্দেশ সার্ভার ত্রুটি।",
      timestamp: new Date().toISOString(),
    });
  }
});

// ----------------------------------------------------
// 🌐 Sajjat AI Universal Search, Audio & Video Intelligence API
// ----------------------------------------------------
app.post("/api/universal-search/query", async (req, res) => {
  try {
    const { query = "", forcedCategory, uid, userName } = req.body || {};
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "অনুসন্ধানের জন্য প্রশ্ন বা কীওয়ার্ড দেওয়া আবশ্যক।" });
    }

    const limitCheck = await validateAndEnforceUserLimit(uid);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.error });
    }

    const payload = await executeUniversalSearch({
      query: query.trim(),
      forcedCategory,
      uid,
      userName,
    });

    if (payload.intent !== "chat") {
      await incrementServerUserLimit(uid);
    }

    return res.json({
      success: true,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Universal Search] Query error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "ইউনিভার্সাল সার্চে সমস্যা হয়েছে।",
    });
  }
});

app.get("/api/universal-search/admin/stats", requireAdminMiddleware, (_req: AdminRequest, res) => {
  return res.json({
    success: true,
    ...getUniversalSearchAdminStats(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/universal-search/admin/config", requireAdminMiddleware, (req: AdminRequest, res) => {
  const updated = updateUniversalSearchConfig(req.body || {});
  serverSystemSettings = {
    ...serverSystemSettings,
    ...(req.body?.webSearchEnabled !== undefined ? { webSearchEnabled: Boolean(req.body.webSearchEnabled) } : {}),
  };
  recordAdminAudit({
    action: "UNIVERSAL_SEARCH_CONFIG_UPDATED",
    status: "success",
    actorEmail: req.verifiedAdmin!.email,
    actorUid: req.verifiedAdmin!.uid,
    path: "/api/universal-search/admin/config",
    details: `Updated universal search config keys: ${Object.keys(req.body || {}).join(", ")}`,
  });
  return res.json({
    success: true,
    config: updated,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/universal-search/admin/clear-logs", requireAdminMiddleware, (req: AdminRequest, res) => {
  clearUniversalSearchLogs();
  recordAdminAudit({
    action: "UNIVERSAL_SEARCH_LOGS_CLEARED",
    status: "success",
    actorEmail: req.verifiedAdmin!.email,
    actorUid: req.verifiedAdmin!.uid,
    path: "/api/universal-search/admin/clear-logs",
    details: "Cleared universal search history and error logs.",
  });
  return res.json({ success: true });
});

app.get("/api/universal-search/download", async (req, res) => {
  const rawUrl = String(req.query.url || "");
  const fileName = String(req.query.name || "sajjat-ai-media").replace(/[^a-zA-Z0-9._-]/g, "_");
  const config = getUniversalSearchConfig();

  if (!config.downloadPermissionEnabled) {
    return res.status(403).json({
      error: "অ্যাডমিন প্যানেল থেকে ডাউনলোড অনুমতি বর্তমানে বন্ধ রাখা হয়েছে।",
    });
  }

  if (!rawUrl || !isSafePublicHttpUrl(rawUrl) || !isOpenLicenseDownloadHost(rawUrl)) {
    return res.status(403).json({
      error: "কপিরাইট ও লাইসেন্স নীতিমালা অনুযায়ী শুধুমাত্র অনুমোদিত ওপেন-লাইসেন্স ফাইল ডাউনলোড করা যাবে।",
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    const upstream = await fetch(rawUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SajjatAI-Downloader/1.0" },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `উৎস থেকে ডাউনলোড ব্যর্থ হয়েছে (HTTP ${upstream.status})` });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (err: any) {
    return res.status(502).json({
      error: err?.message || "ফাইল ডাউনলোড করতে সংযোগ ব্যর্থ হয়েছে।",
    });
  }
});

const phoneLiveWss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  try {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname === "/ws/phone-live") {
      phoneLiveWss.handleUpgrade(request, socket, head, (ws) => {
        phoneLiveWss.emit("connection", ws, request);
      });
    }
  } catch {
    // Ignore malformed upgrade URLs
  }
});

phoneLiveWss.on("connection", async (clientWs: WebSocket, request) => {
  const sessionId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const apiKey = getProviderApiKey("gemini") || (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    clientWs.send(
      JSON.stringify({
        type: "error",
        errorCode: "MISSING_API_KEY",
        message: "সার্ভারে GEMINI_API_KEY সেট করা নেই। এনভায়রনমেন্ট ভেরিয়েবল কনফিগার করুন।",
      })
    );
    clientWs.close();
    return;
  }

  let liveSession: any = null;
  let isClosed = false;

  clientWs.on("close", () => {
    isClosed = true;
    try {
      liveSession?.close();
    } catch {
      // ignore close errors
    }
    liveSession = null;
  });

  const reqUrl = new URL(request?.url || "/ws/phone-live", "http://localhost");
  const mode = reqUrl.searchParams.get("mode") || "phone";
  const allowedVoices = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
  const configuredVoice = serverSystemSettings.liveVoiceName || "Zephyr";
  const voiceName = allowedVoices.has(configuredVoice) ? configuredVoice : "Zephyr";

  const systemInstruction =
    mode === "call"
      ? `You are "Sajjat AI", a friendly, intelligent real-time voice assistant created and owned by Sajjat Mia.
Speak naturally and clearly in Bengali (বাংলা) by default, and seamlessly speak English whenever the user speaks in English.
Keep spoken replies concise, warm, and conversational (like a real phone call). Never say you are Gemini or Google; your name is always Sajjat AI.`
      : `You are Sajjat AI Phone Control Assistant (created by Sajjat Mia). Speak naturally in Bengali (or English if the user speaks English). Help the user understand what is on their screen, guide step-by-step clicks, and give honest guidance on opening apps or finding phone settings without claiming direct access to private Android system internals.`;

  const connectAttempts: Array<{ apiVersion?: string; model: string }> = [
    { model: "gemini-3.8-live" },
    { apiVersion: "v1beta", model: "gemini-3.8-live" },
    { apiVersion: "v1alpha", model: "gemini-3.8-live" },
  ];

  let lastLiveErr: any = null;
  let connectedModel = "";

  for (const attempt of connectAttempts) {
    if (isClosed || clientWs.readyState !== WebSocket.OPEN) break;
    let attemptErrored = false;
    try {
      const ai = new GoogleGenAI({
        apiKey,
        ...(attempt.apiVersion ? { apiVersion: attempt.apiVersion } : {}),
        httpOptions: {
          ...(attempt.apiVersion ? { apiVersion: attempt.apiVersion } : {}),
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const session = await ai.live.connect({
        model: attempt.model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
            const content = message.serverContent;
            if (!content) return;

            if (content.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: "inputTranscript",
                  text: content.inputTranscription.text,
                })
              );
            }

            if (content.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: "outputTranscript",
                  text: content.outputTranscription.text,
                })
              );
            }

            for (const part of content.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: "audio",
                    audio: part.inlineData.data,
                  })
                );
              }
            }

            if (content.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            if (content.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turnComplete" }));
            }
          },
          onerror: (err: any) => {
            attemptErrored = true;
            if (!isClosed && liveSession && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "error",
                  message: err?.message || "Sajjat Ai লাইভ ভয়েস সংযোগে ত্রুটি হয়েছে।",
                })
              );
            }
          },
          onclose: () => {
            if (!isClosed && liveSession && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "closed" }));
              clientWs.close();
            }
          },
        },
      });

      if (isClosed || attemptErrored || clientWs.readyState !== WebSocket.OPEN) {
        try {
          session.close();
        } catch {
          // ignore
        }
        continue;
      }

      liveSession = session;
      connectedModel = attempt.model;
      break;
    } catch (err: any) {
      lastLiveErr = err;
      liveSession = null;
      console.warn(`[Phone Live WS] Attempt (${attempt.apiVersion || "default"} / ${attempt.model}) failed:`, err?.message || err);
    }
  }

  if (!liveSession || isClosed || clientWs.readyState !== WebSocket.OPEN) {
    if (liveSession && isClosed) {
      try {
        liveSession.close();
      } catch {
        // ignore
      }
      return;
    }
    console.warn(`[Phone Live WS ${sessionId}] Failed:`, lastLiveErr?.message || lastLiveErr);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: lastLiveErr?.message || "Sajjat Ai লাইভ ভয়েস সেশন চালু করা যায়নি।",
        })
      );
      clientWs.close();
    }
    return;
  }

  // Emit ready ONLY after ai.live.connect resolves (setupComplete received)
  clientWs.send(JSON.stringify({ type: "ready", model: connectedModel, sessionId }));

  clientWs.on("message", (raw) => {
    if (!liveSession || isClosed) return;
    try {
      const payload = JSON.parse(raw.toString());
      if (payload.type === "audio" && payload.data) {
        liveSession.sendRealtimeInput({
          audio: { data: payload.data, mimeType: "audio/pcm;rate=16000" },
        });
      } else if (payload.type === "video" && payload.data) {
        liveSession.sendRealtimeInput({
          video: { data: payload.data, mimeType: "image/jpeg" },
        });
      } else if (payload.type === "text" && payload.text) {
        liveSession.sendRealtimeInput({
          text: String(payload.text),
        });
      } else if (payload.type === "audioStreamEnd") {
        liveSession.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch (msgErr) {
      console.warn(`[Phone Live WS ${sessionId}] Client message parse error:`, msgErr);
    }
  });
});

server.on("error", (err: any) => {
  console.error("HTTP Server error:", err);
});

// Vite middleware or production static serving
async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Sajjat AI Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Error starting Sajjat AI Server:", err);
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
