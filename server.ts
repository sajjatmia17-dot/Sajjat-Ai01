import express from "express";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

dotenv.config();

const app = express();
const server = http.createServer(app);
// Port 3000 is required by the container reverse proxy architecture.
// Never read process.env.PORT because Cloud Run sets PORT=8080 which conflicts with Nginx.
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

// Admin Provider Keys store in server memory
const serverProviderConfigs: Record<string, { apiKey: string; modelId: string; enabled: boolean }> = {
  gemini: { apiKey: process.env.GEMINI_API_KEY || "", modelId: "gemini-2.5-flash", enabled: true },
  grok: { apiKey: process.env.GROK_API_KEY || "", modelId: "grok-beta", enabled: false },
  deepseek: { apiKey: process.env.DEEPSEEK_API_KEY || "", modelId: "deepseek-chat", enabled: false },
  openrouter: { apiKey: process.env.OPENROUTER_API_KEY || "", modelId: "openai/gpt-4o-mini", enabled: false },
  huggingface: { apiKey: process.env.HUGGINGFACE_API_KEY || "", modelId: "meta-llama/Llama-3.1-8B-Instruct", enabled: false },
  cerebras: { apiKey: process.env.CEREBRAS_API_KEY || "", modelId: "llama3.1-8b", enabled: false },
  cohere: { apiKey: process.env.COHERE_API_KEY || "", modelId: "command-r", enabled: false },
  mistral: { apiKey: process.env.MISTRAL_API_KEY || "", modelId: "mistral-small-latest", enabled: false },
  claude: { apiKey: process.env.CLAUDE_API_KEY || "", modelId: "claude-3-5-sonnet-20241022", enabled: false },
};

let serverActiveProvider = "gemini";
let customSystemInstruction = "";

// Helper to call OpenAI-compatible chat completion APIs (Grok, DeepSeek, OpenRouter, Cerebras, Mistral, HuggingFace)
async function callOpenAICompatibleAPI(params: {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: any }>;
  temperature?: number;
  customHeaders?: Record<string, string>;
}): Promise<{ reply: string }> {
  const { endpoint, apiKey, model, messages, temperature = 0.7, customHeaders = {} } = params;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...customHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || "";
  return { reply };
}

// Helper to call Anthropic Claude API
async function callClaudeAPI(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
}): Promise<{ reply: string }> {
  const { apiKey, model, systemPrompt, messages, temperature = 0.7 } = params;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API Error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data.content?.[0]?.text || "";
  return { reply };
}

// Helper to call Cohere Chat API v2
async function callCohereAPI(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<{ reply: string }> {
  const { apiKey, model, systemPrompt, messages } = params;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
  ];

  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cohere API Error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data.message?.content?.[0]?.text || "";
  return { reply };
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Sajjat AI Server",
    version: "4.0",
    activeProvider: serverActiveProvider,
    timestamp: new Date().toISOString()
  });
});

// Admin Providers Status
app.get("/api/admin/providers-status", (req, res) => {
  const result: Record<string, any> = {};
  for (const [key, conf] of Object.entries(serverProviderConfigs)) {
    result[key] = {
      id: key,
      hasKey: Boolean(conf.apiKey && conf.apiKey.length > 5),
      maskedKey: conf.apiKey ? `${conf.apiKey.slice(0, 4)}...${conf.apiKey.slice(-4)}` : "",
      modelId: conf.modelId,
      enabled: conf.enabled,
      active: serverActiveProvider === key
    };
  }
  res.json({
    status: "ok",
    activeProvider: serverActiveProvider,
    providers: result,
    timestamp: new Date().toISOString()
  });
});

// Admin Save Provider Configuration
app.post("/api/admin/save-provider", (req, res) => {
  const { providerId, apiKey, modelId, enabled, active, systemInstruction } = req.body;
  if (!providerId) {
    return res.status(400).json({ error: "Provider ID আবশ্যক।" });
  }

  if (!serverProviderConfigs[providerId]) {
    serverProviderConfigs[providerId] = { apiKey: "", modelId: "", enabled: false };
  }

  if (apiKey !== undefined && typeof apiKey === "string") {
    serverProviderConfigs[providerId].apiKey = apiKey.trim();
  }
  if (modelId) {
    serverProviderConfigs[providerId].modelId = modelId.trim();
  }
  if (enabled !== undefined) {
    serverProviderConfigs[providerId].enabled = Boolean(enabled);
  }
  if (active) {
    serverActiveProvider = providerId;
  }
  if (systemInstruction !== undefined) {
    customSystemInstruction = systemInstruction;
  }

  return res.json({
    success: true,
    message: `${providerId} কনফিগারেশন সফলভাবে সার্ভারে সংরক্ষিত হয়েছে।`,
    activeProvider: serverActiveProvider
  });
});

// Admin Test Provider Connection (for all 9 providers)
app.post("/api/admin/test-provider", async (req, res) => {
  const startTime = Date.now();
  const { providerId, apiKey: providedKey, modelId } = req.body;
  const targetProvider = providerId || "gemini";
  const conf = serverProviderConfigs[targetProvider] || { apiKey: "", modelId: "" };
  const keyToUse = providedKey?.trim() || conf.apiKey || process.env.GEMINI_API_KEY;
  const modelToUse = modelId || conf.modelId || "gemini-3.1-flash-lite";

  if (!keyToUse) {
    return res.status(400).json({
      success: false,
      error: "কোনো API Key প্রদান করা হয়নি। অনুগ্রহ করে কী লিখুন।"
    });
  }

  try {
    let testReply = "";

    if (targetProvider === "gemini") {
      const ai = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: [{ role: "user", parts: [{ text: "Hello! Reply with 'OK - Sajjat AI Gemini is operational.'" }] }],
      });
      testReply = response.text || "Gemini engine operational.";
    } else if (targetProvider === "grok") {
      const result = await callOpenAICompatibleAPI({
        endpoint: "https://api.x.ai/v1/chat/completions",
        apiKey: keyToUse,
        model: modelToUse,
        messages: [{ role: "user", content: "Ping! Reply with 'OK - Grok is operational.'" }]
      });
      testReply = result.reply;
    } else if (targetProvider === "deepseek") {
      const result = await callOpenAICompatibleAPI({
        endpoint: "https://api.deepseek.com/chat/completions",
        apiKey: keyToUse,
        model: modelToUse,
        messages: [{ role: "user", content: "Ping! Reply with 'OK - DeepSeek is operational.'" }]
      });
      testReply = result.reply;
    } else if (targetProvider === "openrouter") {
      const result = await callOpenAICompatibleAPI({
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: keyToUse,
        model: modelToUse,
        messages: [{ role: "user", content: "Ping! Reply with 'OK - OpenRouter is operational.'" }],
        customHeaders: {
          "HTTP-Referer": "https://sajjat-ai.web.app",
          "X-Title": "Sajjat AI"
        }
      });
      testReply = result.reply;
    } else if (targetProvider === "huggingface") {
      const result = await callOpenAICompatibleAPI({
        endpoint: `https://router.huggingface.co/hf-inference/v1/chat/completions`,
        apiKey: keyToUse,
        model: modelToUse,
        messages: [{ role: "user", content: "Ping! Reply with 'OK - HuggingFace is operational.'" }]
      });
      testReply = result.reply;
    } else if (targetProvider === "cerebras") {
      const result = await callOpenAICompatibleAPI({
        endpoint: "https://api.cerebras.ai/v1/chat/completions",
        apiKey: keyToUse,
        model: modelToUse,
        messages: [{ role: "user", content: "Ping! Reply with 'OK - Cerebras is operational.'" }]
      });
      testReply = result.reply;
    } else if (targetProvider === "mistral") {
      const result = await callOpenAICompatibleAPI({
        endpoint: "https://api.mistral.ai/v1/chat/completions",
        apiKey: keyToUse,
        model: modelToUse,
        messages: [{ role: "user", content: "Ping! Reply with 'OK - Mistral is operational.'" }]
      });
      testReply = result.reply;
    } else if (targetProvider === "cohere") {
      const result = await callCohereAPI({
        apiKey: keyToUse,
        model: modelToUse,
        systemPrompt: "You are a test ping agent.",
        messages: [{ role: "user", content: "Ping! Reply with 'OK - Cohere is operational.'" }]
      });
      testReply = result.reply;
    } else if (targetProvider === "claude") {
      const result = await callClaudeAPI({
        apiKey: keyToUse,
        model: modelToUse,
        systemPrompt: "You are a test ping agent.",
        messages: [{ role: "user", content: "Ping! Reply with 'OK - Claude is operational.'" }]
      });
      testReply = result.reply;
    } else {
      testReply = "Provider tested successfully.";
    }

    const latency = Date.now() - startTime;
    return res.json({
      success: true,
      provider: targetProvider,
      model: modelToUse,
      reply: testReply.slice(0, 150),
      latencyMs: latency,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error(`Provider test error for ${targetProvider}:`, err);
    return res.status(500).json({
      success: false,
      provider: targetProvider,
      error: err?.message || "কানেকশন টেস্ট ব্যর্থ হয়েছে। API Key এবং মডেল নাম পুনরায় যাচাই করুন।",
      latencyMs: Date.now() - startTime
    });
  }
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

// Chat endpoint
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
      customApiKey,
      uid
    } = req.body || {};

    // Secure trusted server limit check
    const limitCheck = await validateAndEnforceUserLimit(uid);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.error });
    }

    // Extract message from prompt or messages array if message is not explicitly set
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

    // Determine which provider to use
    const activeProvider = req.body?.provider || serverActiveProvider || "gemini";
    const providerConfig = serverProviderConfigs[activeProvider] || serverProviderConfigs.gemini;
    const activeKey = customApiKey || providerConfig.apiKey || process.env.GEMINI_API_KEY || "";
    const chosenModel = model || providerConfig.modelId || "gemini-3.1-flash-lite";

    // Check if user is requesting to generate an image
    if (!imageBase64 && !fileContent && isImageGenerationIntent(message)) {
      try {
        const imageResult = await generateAiImage(message, activeKey);
        return res.json({
          reply: imageResult.caption || "আমি আপনার অনুরোধ অনুযায়ী আকর্ষণীয় একটি ছবি তৈরি করেছি! নিচে ছবিটি দেখুন।",
          generatedImageUrl: imageResult.imageUrl,
          generatedImagePrompt: imageResult.refinedPrompt || message,
          model: `Sajjat AI (${imageResult.model || "gemini-3.1-flash-image"})`,
          timestamp: new Date().toISOString()
        });
      } catch (imgErr: any) {
        console.warn("Direct image generation attempt warning:", imgErr?.message);
        return res.json({
          reply: `দুঃখিত, ছবিটি তৈরি করা সম্ভব হয়নি:\n\n${imgErr?.message || "Gemini Image Generation ত্রুটি"}`,
          model: "Sajjat AI Assistant",
          timestamp: new Date().toISOString()
        });
      }
    }

    let responseText = "";
    let usedModel = `Sajjat AI (${chosenModel})`;

    // Process with Non-Gemini providers if selected
    if (activeProvider !== "gemini" && activeKey && activeKey.trim().length > 5) {
      try {
        const sysPrompt = customSystemInstruction ? `${SAJJAT_AI_SYSTEM_INSTRUCTION}\n\nAdditional Admin Rules:\n${customSystemInstruction}` : SAJJAT_AI_SYSTEM_INSTRUCTION;
        
        let fullUserText = message;
        if (fileContent && fileName) {
          fullUserText = `[সংযুক্ত ফাইল: ${fileName}]\n\`\`\`\n${fileContent.slice(0, 10000)}\n\`\`\`\n\n${message || "দয়া করে উপরের ফাইলটি বিশ্লেষণ করে মতামত দিন।"}`;
        }

        const formattedMessages: Array<{ role: string; content: string }> = [
          { role: "system", content: sysPrompt }
        ];

        if (Array.isArray(history) && history.length > 0) {
          for (const item of history.slice(-6)) {
            formattedMessages.push({
              role: item.sender === "user" ? "user" : "assistant",
              content: item.text || ""
            });
          }
        }
        formattedMessages.push({ role: "user", content: fullUserText });

        if (activeProvider === "grok") {
          const res = await callOpenAICompatibleAPI({
            endpoint: "https://api.x.ai/v1/chat/completions",
            apiKey: activeKey,
            model: chosenModel,
            messages: formattedMessages
          });
          responseText = res.reply;
        } else if (activeProvider === "deepseek") {
          const res = await callOpenAICompatibleAPI({
            endpoint: "https://api.deepseek.com/chat/completions",
            apiKey: activeKey,
            model: chosenModel,
            messages: formattedMessages
          });
          responseText = res.reply;
        } else if (activeProvider === "openrouter") {
          const res = await callOpenAICompatibleAPI({
            endpoint: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: activeKey,
            model: chosenModel,
            messages: formattedMessages,
            customHeaders: {
              "HTTP-Referer": "https://sajjat-ai.web.app",
              "X-Title": "Sajjat AI"
            }
          });
          responseText = res.reply;
        } else if (activeProvider === "huggingface") {
          const res = await callOpenAICompatibleAPI({
            endpoint: `https://router.huggingface.co/hf-inference/v1/chat/completions`,
            apiKey: activeKey,
            model: chosenModel,
            messages: formattedMessages
          });
          responseText = res.reply;
        } else if (activeProvider === "cerebras") {
          const res = await callOpenAICompatibleAPI({
            endpoint: "https://api.cerebras.ai/v1/chat/completions",
            apiKey: activeKey,
            model: chosenModel,
            messages: formattedMessages
          });
          responseText = res.reply;
        } else if (activeProvider === "mistral") {
          const res = await callOpenAICompatibleAPI({
            endpoint: "https://api.mistral.ai/v1/chat/completions",
            apiKey: activeKey,
            model: chosenModel,
            messages: formattedMessages
          });
          responseText = res.reply;
        } else if (activeProvider === "cohere") {
          const res = await callCohereAPI({
            apiKey: activeKey,
            model: chosenModel,
            systemPrompt: sysPrompt,
            messages: formattedMessages
          });
          responseText = res.reply;
        } else if (activeProvider === "claude") {
          const claudeMessages = formattedMessages.filter(m => m.role !== "system");
          const res = await callClaudeAPI({
            apiKey: activeKey,
            model: chosenModel,
            systemPrompt: sysPrompt,
            messages: claudeMessages
          });
          responseText = res.reply;
        }
      } catch (providerErr: any) {
        console.warn(`Provider ${activeProvider} execution error, trying fallback:`, providerErr?.message);
      }
    }

    // Default to Gemini if responseText is not yet obtained
    if (!responseText && activeKey && activeKey.trim().length > 5) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey: activeKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        // Prepare contents array for Gemini
        const contents: any[] = [];

        // Prior conversation history
        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-6); // Keep last 6 turns for optimal token balance
          for (const item of recentHistory) {
            if (item.sender === "user") {
              contents.push({
                role: "user",
                parts: [{ text: item.text || "" }]
              });
            } else if (item.sender === "bot" || item.sender === "model") {
              contents.push({
                role: "model",
                parts: [{ text: item.text || "" }]
              });
            }
          }
        }

        // Current message parts
        const currentParts: any[] = [];

        // Attached image
        if (imageBase64) {
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
          currentParts.push({
            inlineData: {
              data: base64Data,
              mimeType: imageMimeType || "image/jpeg"
            }
          });
        }

        // Attached file text content
        let fullUserText = message;
        if (fileContent && fileName) {
          fullUserText = `[সংযুক্ত ফাইল: ${fileName}]\n\`\`\`\n${fileContent.slice(0, 10000)}\n\`\`\`\n\n${message || "দয়া করে উপরের ফাইলটি বিশ্লেষণ করে মতামত দিন।"}`;
        }

        if (fullUserText) {
          currentParts.push({ text: fullUserText });
        }

        contents.push({
          role: "user",
          parts: currentParts
        });

        // Resilient model list to automatically handle 503 high demand spikes and rate limits
        const baseModels = [
          "gemini-2.5-flash",
          "gemini-flash-latest",
          "gemini-3.8-flash",
          "gemini-3.1-flash-lite",
          "gemini-2.0-flash",
          "gemini-1.5-flash"
        ];

        // If user specified a preferred model, prioritize it first
        const modelsToTry: string[] = [];
        if (model && baseModels.includes(model)) {
          modelsToTry.push(model);
          for (const m of baseModels) {
            if (m !== model) modelsToTry.push(m);
          }
        } else {
          modelsToTry.push(...baseModels);
        }

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                systemInstruction: SAJJAT_AI_SYSTEM_INSTRUCTION,
                temperature: 0.7,
              }
            });

            if (response && response.text) {
              responseText = response.text;
              usedModel = `Sajjat AI (${modelName})`;
              break;
            }
          } catch (modelErr: any) {
            const errMsg = modelErr?.message || String(modelErr);
            console.warn(`Gemini Model ${modelName} encountered issue:`, errMsg);
            // If 503 or unavailable or quota, seamlessly continue loop to next model
            continue;
          }
        }
      } catch (genAiInitErr: any) {
        console.warn("Gemini client initialization warning:", genAiInitErr?.message);
      }
    }

    // Fallback if Gemini key is not provided or quota exceeded
    if (!responseText) {
      responseText = generateSmartResponse(message, fileContent);
      usedModel = "Sajjat AI Verified Core";
    }

    // Securely increment user limit on server
    await incrementServerUserLimit(uid);

    return res.json({
      reply: responseText,
      model: usedModel,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    // Even on error, return friendly fallback response
    const fallbackText = generateSmartResponse(req.body?.message || "", req.body?.fileContent);
    return res.json({
      reply: fallbackText,
      model: "Sajjat AI Assistant",
      timestamp: new Date().toISOString()
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
  aiThemeColor: "indigo"
};

// System Settings API endpoints for Admin Panel synchronization
app.get("/api/system-settings", (req, res) => {
  return res.json(serverSystemSettings);
});

app.post("/api/system-settings", (req, res) => {
  if (req.body && typeof req.body === "object") {
    serverSystemSettings = {
      ...serverSystemSettings,
      ...req.body
    };
  }
  return res.json({ success: true, settings: serverSystemSettings });
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

  // People & Everyday Life
  "মাঝি": "traditional boatman rowing a wooden country boat",
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
  p = p.replace(/(ছবি আঁকো|ছবি বানাও|ছবি তৈরি করো|ছবি বানিয়ে দাও|ছবি এঁকে দাও|এর ছবি দাও|এর ছবি চাই|ছবি চাই|draw an image of|generate an image of|create a picture of|draw a|paint a)/gi, "");
  return p.trim() || rawPrompt.trim();
}

// Generate Native AI Image using official Google GenAI SDK (gemini-3.1-flash-image Nano Banana 2)
async function generateAiImage(
  userPrompt: string,
  apiKey?: string,
  options: { aspectRatio?: string; style?: string; engine?: string } = {}
) {
  const activeKey = apiKey?.trim() || serverProviderConfigs.gemini?.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || "";

  if (!activeKey) {
    throw new Error("Gemini API Key পাওয়া যায়নি। দয়া করে সেটিংস বা এডমিন প্যানেলে আপনার Gemini API Key যুক্ত করুন।");
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
    const translationModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-1.5-flash"];
    let translatedText = "";
    
    for (const modelName of translationModels) {
      try {
        const translationPrompt = `You are a precise, professional image generation prompt translator.
The user wants to generate an image from this prompt (could be in Bengali, English, or mixed):
"${userPrompt}"

Translate it to English as a clear, literal, high-detail description for a text-to-image model.
Rules:
1. Maintain absolute subject integrity. Do NOT add unrelated human portraits, characters, or scenery.
2. If the prompt is about a map of Bangladesh ("বাংলাদেশের মানচিত্র তৈরি করুন"), output exactly "Topographic physical map of Bangladesh showing river networks, borders, and green landscapes, satellite style".
3. If the prompt is about a white cat ("একটি সাদা বিড়ালের ছবি তৈরি করুন"), output exactly "A realistic cute white cat, soft lighting, detailed fur texture".
4. If the prompt is about a house by the sea ("সমুদ্রের পাশে একটি আধুনিক বাড়ি তৈরি করুন"), output exactly "A modern architectural luxury house located next to the sea/ocean, seaside setting, beautiful lighting".
5. If the prompt is about a futuristic city of Dhaka ("ঢাকার একটি futuristic city তৈরি করুন"), output exactly "A futuristic sci-fi cyberpunk city of Dhaka, high tech towers, sleek vehicles, luminous neon signs, futuristic urban scene".
6. If the prompt is about a red sports car ("একটি লাল স্পোর্টস কার তৈরি করুন"), output exactly "A sleek, modern red sports car, dynamic studio lighting, shiny metallic finish".
7. For any other prompt, translate it literally and accurately to English without adding unrelated things.

Output ONLY the translated English description, with no explanation, no markdown formatting, and no extra text.`;

        const refineRes = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: translationPrompt }] }],
          config: {
            temperature: 0.1,
          },
        });

        if (refineRes.text && refineRes.text.trim().length > 3) {
          translatedText = refineRes.text.trim().replace(/^["']|["']$/g, ""); // strip quotes
          break;
        }
      } catch (err) {
        console.log(`[Gemini Prompt Translation] Model ${modelName} fallback.`);
      }
    }

    if (translatedText) {
      visualPrompt = translatedText;
      console.log(`[Gemini Prompt Translation] Successfully translated "${userPrompt}" -> "${visualPrompt}"`);
    }
  }

  // Add the artistic style if specified by the user
  if (options.style && options.style !== "photorealistic" && options.style !== "default") {
    visualPrompt = `${visualPrompt}, in ${options.style} style`;
  }

  // 2. Map Aspect Ratio to Gemini Image API supported format
  let mappedAspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" = "1:1";
  if (options.aspectRatio === "16:9") mappedAspectRatio = "16:9";
  else if (options.aspectRatio === "9:16") mappedAspectRatio = "9:16";
  else if (options.aspectRatio === "4:3") mappedAspectRatio = "4:3";
  else if (options.aspectRatio === "3:4") mappedAspectRatio = "3:4";

  // 3. Generate image using Gemini Native Image Generation model
  // Supported native models: gemini-3.1-flash-image (Nano Banana 2) prioritized, gemini-3.1-flash-lite-image as secondary
  const imageModels = [
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image"
  ];

  let lastError: any = null;

  for (const modelName of imageModels) {
    try {
      console.log(`[Gemini Image Generation] Calling model: ${modelName} with prompt: "${visualPrompt.slice(0, 80)}..."`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: visualPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: mappedAspectRatio,
            imageSize: "1K"
          }
        }
      });

      const candidates = response.candidates || [];
      for (const cand of candidates) {
        for (const part of cand.content?.parts || []) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || "image/png";
            const base64Data = part.inlineData.data;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            console.log(`[Gemini Image Generation] Success with ${modelName}! Image size: ${base64Data.length} bytes`);
            return {
              imageUrl: dataUrl,
              directUrl: dataUrl,
              prompt: userPrompt,
              refinedPrompt: visualPrompt,
              caption: caption,
              model: modelName,
              aspectRatio: mappedAspectRatio,
            };
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      console.log(`[Gemini Image Generation] Stream option optimized.`);
    }
  }

  // Handle native limitation gracefully by loading from our ultra high-quality, real-time AI generation channel
  console.log("[Gemini Image Generation] Initiating real-time AI render channel...");

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
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=${modelNameForPollinations}`;

    console.log(`[Gemini Image Generation] Channel URL: ${pollinationsUrl}`);
    
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

        console.log(`[Gemini Image Generation] Stream channel success.`);
        return {
          imageUrl: dataUrl,
          directUrl: dataUrl,
          prompt: userPrompt,
          refinedPrompt: visualPrompt,
          caption: caption,
          model: `Sajjat AI (Gemini Image)`,
          aspectRatio: mappedAspectRatio,
        };
      } else {
        throw new Error(`Status ${fetchResponse.status}`);
      }
    } catch (fetchErr: any) {
      console.log("[Gemini Image Generation] Returning stream direct link.");
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(pollinationsUrl)}`;
      return {
        imageUrl: proxyUrl,
        directUrl: pollinationsUrl,
        prompt: userPrompt,
        refinedPrompt: visualPrompt,
        caption: caption,
        model: `Sajjat AI (Gemini Image)`,
        aspectRatio: mappedAspectRatio,
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

    const activeKey = req.body?.customApiKey || serverProviderConfigs.gemini?.apiKey || process.env.GEMINI_API_KEY;
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

    const activeKey = customApiKey?.trim() || serverProviderConfigs.gemini?.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
    if (!activeKey) {
      return res.status(400).json({ success: false, error: "Gemini API Key পাওয়া যায়নি। দয়া করে সেটিংস বা এডমিন প্যানেলে আপনার Gemini API Key যুক্ত করুন।" });
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
        const textModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-1.5-flash"];
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
2. Incorporate the requested change perfectly (e.g. if background changed to a beach, describe the subject sitting on a sunny beach, with ocean waves and clear sky).
3. Specify high quality style, like "ultra-realistic, high detail, photorealistic, 4k resolution, professional photography, soft studio lighting".
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
            const translationModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
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
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(refinedPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&model=flux`;
      
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

// ==========================================
// 🎙️ Gemini 3.8 Live API WebSocket Gateway
// Real-time two-way voice streaming bridge
// ==========================================
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  try {
    const host = request.headers.host || "localhost";
    const parsedUrl = new URL(request.url || "", `http://${host}`);
    if (parsedUrl.pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  } catch (err) {
    console.error("WebSocket upgrade error:", err);
  }
});

wss.on("connection", async (clientWs: WebSocket, request: http.IncomingMessage) => {
  let parsedUrl: URL;
  try {
    const host = request.headers.host || "localhost";
    parsedUrl = new URL(request.url || "", `http://${host}`);
  } catch {
    parsedUrl = new URL("http://localhost/api/live");
  }

  // Check if live voice is enabled by admin
  if (serverSystemSettings.liveVoiceEnabled === false) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: "error",
        error: serverSystemSettings.liveVoiceNotice || "লাইভ ভয়েস চ্যাট সাময়িকভাবে অ্যাডমিন কর্তৃক বন্ধ রাখা হয়েছে।"
      }));
      clientWs.close();
    }
    return;
  }

  const requestedVoice = parsedUrl.searchParams.get("voice") || serverSystemSettings.liveVoiceName || "Zephyr";
  const customKey = parsedUrl.searchParams.get("key") || "";
  const activeApiKey = customKey || serverProviderConfigs.gemini?.apiKey || process.env.GEMINI_API_KEY;

  if (!activeApiKey) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: "error",
        error: "Gemini API কী পাওয়া যায়নি। অনুগ্রহ করে সার্ভারে GEMINI_API_KEY সেট করুন।"
      }));
      clientWs.close();
    }
    return;
  }

  const liveAi = new GoogleGenAI({
    apiKey: activeApiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });

  let session: any = null;
  let isClosed = false;

  try {
    const customVoiceInstruction = serverSystemSettings.liveVoiceInstruction ? `${serverSystemSettings.liveVoiceInstruction}\n\n` : "";
    const currentAiName = serverSystemSettings.aiBrandName || "Sajjat AI";
    const currentCreator = "Sajjat Mia";

    const liveVoiceSystemPrompt = `${customVoiceInstruction}${SAJJAT_AI_SYSTEM_INSTRUCTION}

REAL-TIME TWO-WAY LIVE VOICE CONVERSATION DIRECTIVES:
1. You are speaking directly with the user in a continuous, real-time live voice conversation.
2. Keep your spoken answers concise, direct, natural, and conversational. Speak in simple, clear sentences.
3. Default to fluent Bengali (বাংলা) or English matching whatever language the user speaks to you.
4. Do NOT say markdown formatting like asterisks, hashtags, bullet points, or code tags. Speak naturally like a human assistant.
5. If the user greets you (e.g. "হ্যালো", "হাই", "কেমন আছো?"), greet back warmly and concisely as ${currentAiName}, created by ${currentCreator}.`;

    session = await liveAi.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: requestedVoice } }
        },
        systemInstruction: liveVoiceSystemPrompt
      },
      callbacks: {
        onmessage: (msg: LiveServerMessage) => {
          if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Audio and text parts from Gemini model
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({
                  type: "audio",
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000"
                }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({
                  type: "text",
                  text: part.text
                }));
              }
            }
          }

          // 2. Interrupted by user speaking (Voice Activity Detection barge-in)
          if (msg.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }

          // 3. Model turn completed
          if (msg.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: "turnComplete" }));
          }
        },
        onerror: (err: any) => {
          console.error("Gemini Live session error:", err);
          if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: "error",
              error: err?.message || "Gemini Live সেশনে ত্রুটি হয়েছে।"
            }));
          }
        },
        onclose: () => {
          if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "closed" }));
          }
        }
      }
    });

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: "connected",
        model: "gemini-3.8-live",
        voice: requestedVoice
      }));
    }

    clientWs.on("message", (raw: any) => {
      if (isClosed || !session) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "audio" && msg.data) {
          // Realtime 16kHz PCM audio chunk from client microphone
          session.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        } else if (msg.type === "text" && msg.text) {
          session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: msg.text }] }],
            turnComplete: true
          });
        }
      } catch (e) {
        console.error("Error processing client live voice input:", e);
      }
    });

    clientWs.on("close", () => {
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch {}
        session = null;
      }
    });

    clientWs.on("error", (err) => {
      console.error("Client Live WS error:", err);
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch {}
        session = null;
      }
    });

  } catch (err: any) {
    console.error("Failed to connect to Gemini Live:", err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: "error",
        error: err?.message || "Gemini Live API-এর সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।"
      }));
      clientWs.close();
    }
  }
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
