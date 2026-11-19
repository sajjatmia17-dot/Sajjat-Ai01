import { GoogleGenAI, Type } from "@google/genai";

export type PhoneControlRuntime = "node-server" | "netlify-function";

export interface PhoneControlStatusResult {
  ok: boolean;
  configured: boolean;
  runtime: PhoneControlRuntime;
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

export interface ScreenAnalysisResult {
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
  timestamp: string;
}

export interface VoiceCommandResult {
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
  timestamp: string;
}

const PHONE_CONTROL_MODEL = "gemini-4-hydrogen";
const PHONE_LIVE_MODEL = "gemini-3.8-live";
const FALLBACK_MODELS = [PHONE_CONTROL_MODEL, "gemini-3.8-flash", "gemini-3.1-flash-lite"];

function getServerGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || "").trim();
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      apiVersion: "v1beta",
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function getPhoneControlStatus(runtime: PhoneControlRuntime): PhoneControlStatusResult {
  const apiKey = getServerGeminiKey();
  const configured = apiKey.length > 5 && apiKey !== "MY_GEMINI_API_KEY";

  return {
    ok: true,
    configured,
    runtime,
    liveWsSupported: runtime === "node-server",
    model: PHONE_CONTROL_MODEL,
    liveModel: PHONE_LIVE_MODEL,
    message: configured
      ? runtime === "node-server"
        ? "Sajjat Ai Mobile Control সার্ভার ও লাইভ ভয়েস সংযোগের জন্য প্রস্তুত।"
        : "Netlify Function ব্যাকএন্ড সংযুক্ত (ভয়েস ও স্ক্রিন বিশ্লেষণ প্রস্তুত; লাইভ WebSocket-এর জন্য স্মার্ট ভয়েস লুপ ব্যবহৃত হবে)।"
      : "সার্ভারে এআই API Key পাওয়া যায়নি। এনভায়রনমেন্ট ভেরিয়েবল কনফিগার করুন।",
    setupGuide: configured
      ? null
      : {
          envVarName: "GEMINI_API_KEY",
          netlifySteps: [
            "Netlify Dashboard-এ আপনার প্রজেক্ট খুলে Site configuration → Environment variables-এ যান।",
            "Add a variable বাটনে ক্লিক করে Key হিসেবে API Key কনফিগার করুন।",
            "Save করার পর Deploys ট্যাব থেকে Trigger deploy → Deploy site দিন।",
          ],
          aiStudioSteps: [
            "Google AI Studio বা প্রজেক্ট Secrets প্যানেলে প্রয়োজনীয় API Key সেট করুন।",
          ],
        },
    timestamp: new Date().toISOString(),
  };
}

export async function analyzeScreenWithGemini(params: {
  imageBase64: string;
  mimeType?: string;
  question?: string;
  language?: "bn" | "en";
}): Promise<ScreenAnalysisResult> {
  const apiKey = getServerGeminiKey();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return {
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "সার্ভারে এআই API Key সেট করা নেই। Netlify Environment Variables-এ যোগ করে পুনরায় ডিপ্লয় করুন।",
      timestamp: new Date().toISOString(),
    };
  }

  const rawImage = (params.imageBase64 || "").trim();
  if (!rawImage) {
    return {
      success: false,
      errorCode: "INVALID_INPUT",
      error: "বিশ্লেষণের জন্য স্ক্রিন ফ্রেম বা স্ক্রিনশট পাওয়া যায়নি।",
      timestamp: new Date().toISOString(),
    };
  }

  const dataUrlMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const mimeType = dataUrlMatch?.[1] || params.mimeType || "image/jpeg";
  const cleanBase64 = dataUrlMatch?.[2] || rawImage;

  const userQuestion = (params.question || "").trim();
  const promptText = `You are "Sajjat Ai Mobile Control" screen assistant created by Sajjat Mia.
Analyze the user's shared screen or uploaded screenshot carefully.
${userQuestion ? `User's specific question: "${userQuestion}"` : "Explain what is visible on the screen right now and guide the user on what to do next."}

Rules:
- Respond strictly in clear, natural Bengali (বাংলা) so anyone can easily understand.
- Describe what app, page, buttons, inputs, errors, or menus are visible.
- Provide 2 to 4 practical, step-by-step actions telling the user exactly where to click/tap or what to do next.
- Never invent UI elements that are not visible in the image.
- If sensitive data like passwords, OTP, or bank card numbers appear, warn the user gently in safetyNote.`;

  const ai = createGeminiClient(apiKey);
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              { text: promptText },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "1-2 short sentences in Bengali summarizing the screen for voice playback.",
              },
              whatIsOnScreen: {
                type: Type.STRING,
                description: "Detailed clear Bengali explanation of what is shown on the screen.",
              },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step-by-step instructions in Bengali on where to click/tap next.",
              },
              suggestedActionLabel: {
                type: Type.STRING,
                description: "Short Bengali label for the primary next click/tap action.",
              },
              safetyNote: {
                type: Type.STRING,
                description: "Optional Bengali privacy/safety warning if sensitive fields are visible, else empty string.",
              },
            },
            required: ["summary", "whatIsOnScreen", "nextSteps", "suggestedActionLabel"],
          },
        },
      });

      const rawText = response.text?.trim() || "";
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          success: true,
          model: modelName,
          analysis: {
            summary: String(parsed.summary || "স্ক্রিন বিশ্লেষণ সম্পন্ন হয়েছে।"),
            whatIsOnScreen: String(parsed.whatIsOnScreen || parsed.summary || ""),
            nextSteps: Array.isArray(parsed.nextSteps)
              ? parsed.nextSteps.map((s: any) => String(s)).filter(Boolean)
              : [],
            suggestedActionLabel: String(parsed.suggestedActionLabel || ""),
            safetyNote: parsed.safetyNote ? String(parsed.safetyNote) : undefined,
          },
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Phone Control Analyze] Model ${modelName} error:`, err?.message || err);
    }
  }

  return {
    success: false,
    errorCode: "API_ERROR",
    error: lastError?.message || "Sajjat Ai দিয়ে স্ক্রিন বিশ্লেষণ করতে সমস্যা হয়েছে।",
    timestamp: new Date().toISOString(),
  };
}

export async function processPhoneVoiceCommand(params: {
  text: string;
  language?: "bn" | "en";
  hasScreenShare?: boolean;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<VoiceCommandResult> {
  const apiKey = getServerGeminiKey();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return {
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "সার্ভারে এআই API Key সেট করা নেই। Netlify Environment Variables-এ যোগ করুন।",
      timestamp: new Date().toISOString(),
    };
  }

  const userText = (params.text || "").trim();
  if (!userText) {
    return {
      success: false,
      errorCode: "INVALID_INPUT",
      error: "কোনো ভয়েস বা টেক্সট নির্দেশ পাওয়া যায়নি।",
      timestamp: new Date().toISOString(),
    };
  }

  const historyContext = (params.history || [])
    .slice(-4)
    .map((h) => `${h.role === "user" ? "User" : "Sajjat AI"}: ${h.text}`)
    .join("\n");

  const prompt = `You are "Sajjat Ai Mobile Control" — a helpful voice & phone guidance assistant inside the Sajjat Ai web app (created by Sajjat Mia).
Analyze the user's spoken/typed command and classify the intent accurately.

Available intents:
1. "open_app": When user wants to open an app (e.g. "Open WhatsApp", "হোয়াটসঅ্যাপ খোলো", "Open Facebook", "ফেসবুক চালাও", "IMO খোলো", "TikTok খোলো", "YouTube খোলো", "Gmail", "Maps", "Telegram", "Instagram", "Messenger", "Settings", "Phone", "Play Store"). Set appKey to lowercase canonical name like "whatsapp", "facebook", "imo", "tiktok", "youtube", "messenger", "instagram", "telegram", "gmail", "maps", "playstore", "settings", "phone", or the app name.
2. "phone_search": When user asks where to find a phone setting or app on Android/iPhone or Facebook settings (e.g. "WiFi setting kothay", "Facebook settings কোথায়", "Bluetooth চালু করবো কীভাবে", "ডিসপ্লে ব্রাইটনেস বা অ্যাপ পারমিশন কোথায়", "ফোনে কোনো অ্যাপ খুঁজছি"). IMPORTANT: Never claim a pure web browser can click inside third-party Android apps or read private Android System Settings directly! Explain clearly how the user can find it manually and put an honest limitation note in limitationNote.
3. "analyze_screen": When user asks to check, read, or guide them on their screen (e.g. "স্ক্রিনে কী দেখাচ্ছে", "কোথায় ক্লিক করবো", "Analyze my screen").
4. "chat": Any general question, conversation, study/coding help, or daily assistance.

${historyContext ? `Recent conversation:\n${historyContext}\n` : ""}
Screen share active right now: ${params.hasScreenShare ? "Yes" : "No"}
Preferred reply language: ${params.language === "en" ? "English (with Bangla support if user spoke Bangla)" : "Natural Bengali (বাংলা)"}

User command: "${userText}"`;

  const ai = createGeminiClient(apiKey);
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description: 'One of: "open_app", "phone_search", "analyze_screen", "chat"',
              },
              appKey: {
                type: Type.STRING,
                description: "Canonical lowercase app name if intent is open_app, else empty string.",
              },
              searchTopic: {
                type: Type.STRING,
                description: "Setting or app topic if intent is phone_search, else empty string.",
              },
              spokenReply: {
                type: Type.STRING,
                description: "Concise natural reply (2-3 sentences) suitable to be read aloud via SpeechSynthesis.",
              },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Optional step-by-step instructions (especially for phone_search or guidance).",
              },
              limitationNote: {
                type: Type.STRING,
                description: "Honest web limitation notice when phone_search or system control is requested, else empty string.",
              },
            },
            required: ["intent", "spokenReply", "steps"],
          },
        },
      });

      const rawText = response.text?.trim() || "";
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const validIntents = ["open_app", "phone_search", "analyze_screen", "chat"];
        const intent = validIntents.includes(parsed.intent) ? parsed.intent : "chat";

        return {
          success: true,
          model: modelName,
          result: {
            intent,
            appKey: parsed.appKey ? String(parsed.appKey).toLowerCase().trim() : undefined,
            searchTopic: parsed.searchTopic ? String(parsed.searchTopic).trim() : undefined,
            spokenReply: String(parsed.spokenReply || "আমি আপনার নির্দেশটি বুঝতে পেরেছি।"),
            steps: Array.isArray(parsed.steps)
              ? parsed.steps.map((s: any) => String(s)).filter(Boolean)
              : [],
            limitationNote: parsed.limitationNote ? String(parsed.limitationNote) : undefined,
          },
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Phone Control Voice] Model ${modelName} error:`, err?.message || err);
    }
  }

  return {
    success: false,
    errorCode: "API_ERROR",
    error: lastError?.message || "ভয়েস নির্দেশ প্রসেস করতে সমস্যা হয়েছে।",
    timestamp: new Date().toISOString(),
  };
}
