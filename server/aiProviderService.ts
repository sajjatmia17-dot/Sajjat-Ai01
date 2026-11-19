import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

export type ProviderApiType =
  | "openai_compatible"
  | "gemini"
  | "anthropic"
  | "cohere"
  | "huggingface"
  | "custom_rest";

export type ProviderAuthMethod =
  | "bearer"
  | "x-api-key"
  | "query_param"
  | "custom_header";

export interface ProviderFeatureCapabilities {
  textChat: boolean;
  imageVision: boolean;
  fileUpload: boolean;
  voice: boolean;
  imageGen: boolean;
}

export interface ServerProviderRecord {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  defaultModel: string;
  supportedModels: string[];
  apiType: ProviderApiType;
  authMethod: ProviderAuthMethod;
  customAuthHeaderName?: string;
  priority: number;
  isCustom: boolean;
  enabled: boolean;
  active: boolean;
  supportedFeatures: ProviderFeatureCapabilities;
  description?: string;
  status: "connected" | "not_connected" | "error" | "rate_limited";
  lastError: string | null;
  lastSuccessAt: string | null;
  lastTestedAt: string | null;
  latencyMs: number | null;
  rateLimitHeaders: Record<string, string> | null;
  isLocked?: boolean;
}

export interface ChatTurnMessage {
  role?: "user" | "assistant" | "model";
  sender?: "user" | "bot";
  text?: string;
  content?: string;
}

export interface ProviderChatRequest {
  message: string;
  history?: ChatTurnMessage[];
  imageBase64?: string;
  imageMimeType?: string;
  fileContent?: string;
  fileName?: string;
  requestedModel?: string;
  preferredProviderId?: string;
  systemInstruction: string;
}

export interface ProviderChatResponse {
  reply: string;
  model: string;
  providerId: string;
  providerName: string;
  fallbackUsed: boolean;
  fallbackFrom?: string;
  latencyMs: number;
  timestamp: string;
}

const PROVIDERS_STORE_PATH = path.resolve(process.cwd(), ".sajjat-providers.json");

function isValidEnvKey(val?: string): string {
  const k = (val || "").trim();
  if (!k || k === "MY_GEMINI_API_KEY" || k.length < 6) return "";
  return k;
}

function buildBuiltInProviders(): Record<string, ServerProviderRecord> {
  const geminiKey = isValidEnvKey(process.env.GEMINI_API_KEY);
  const falKey = isValidEnvKey(process.env.FAL_KEY || process.env.FAL_API_KEY);
  const grokKey = isValidEnvKey(process.env.GROK_API_KEY);
  const deepseekKey = isValidEnvKey(process.env.DEEPSEEK_API_KEY);
  const openrouterKey = isValidEnvKey(process.env.OPENROUTER_API_KEY);
  const hfKey = isValidEnvKey(process.env.HUGGINGFACE_API_KEY);
  const cerebrasKey = isValidEnvKey(process.env.CEREBRAS_API_KEY);
  const cohereKey = isValidEnvKey(process.env.COHERE_API_KEY);
  const mistralKey = isValidEnvKey(process.env.MISTRAL_API_KEY);
  const claudeKey = isValidEnvKey(process.env.CLAUDE_API_KEY);

  return {
    gemini: {
      id: "gemini",
      name: "Google Gemini Engine",
      apiKey: geminiKey,
      baseUrl: "https://generativelanguage.googleapis.com",
      modelId: "gemini-4-hydrogen",
      defaultModel: "gemini-4-hydrogen",
      supportedModels: ["gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.1-flash-lite"],
      apiType: "gemini",
      authMethod: "query_param",
      priority: 1,
      isCustom: false,
      enabled: true,
      active: true,
      supportedFeatures: {
        textChat: true,
        imageVision: true,
        fileUpload: true,
        voice: true,
        imageGen: true,
      },
      description: "Primary multimodal engine for Bengali/English reasoning, vision & voice.",
      status: geminiKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    fal: {
      id: "fal",
      name: "Fal.ai Image Engine",
      apiKey: falKey,
      baseUrl: "https://fal.run/fal-ai/flux/schnell",
      modelId: "fal-ai/flux/schnell",
      defaultModel: "fal-ai/flux/schnell",
      supportedModels: ["fal-ai/flux/schnell", "fal-ai/flux/dev"],
      apiType: "custom_rest",
      authMethod: "custom_header",
      customAuthHeaderName: "Authorization",
      priority: 99,
      isCustom: false,
      enabled: Boolean(falKey),
      active: false,
      supportedFeatures: {
        textChat: false,
        imageVision: false,
        fileUpload: false,
        voice: false,
        imageGen: true,
      },
      description: "Dedicated high-speed AI image generation & editing provider.",
      status: falKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    grok: {
      id: "grok",
      name: "xAI Grok API",
      apiKey: grokKey,
      baseUrl: "https://api.x.ai/v1/chat/completions",
      modelId: "grok-2-latest",
      defaultModel: "grok-2-latest",
      supportedModels: ["grok-2-latest", "grok-beta", "grok-2-vision-1212"],
      apiType: "openai_compatible",
      authMethod: "bearer",
      priority: 2,
      isCustom: false,
      enabled: Boolean(grokKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: true,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: grokKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    deepseek: {
      id: "deepseek",
      name: "DeepSeek API",
      apiKey: deepseekKey,
      baseUrl: "https://api.deepseek.com/chat/completions",
      modelId: "deepseek-chat",
      defaultModel: "deepseek-chat",
      supportedModels: ["deepseek-chat", "deepseek-reasoner"],
      apiType: "openai_compatible",
      authMethod: "bearer",
      priority: 3,
      isCustom: false,
      enabled: Boolean(deepseekKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: false,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: deepseekKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    openrouter: {
      id: "openrouter",
      name: "OpenRouter API",
      apiKey: openrouterKey,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      modelId: "openai/gpt-4o-mini",
      defaultModel: "openai/gpt-4o-mini",
      supportedModels: [
        "openai/gpt-4o-mini",
        "meta-llama/llama-3.3-70b-instruct",
        "anthropic/claude-3.5-haiku",
      ],
      apiType: "openai_compatible",
      authMethod: "bearer",
      priority: 4,
      isCustom: false,
      enabled: Boolean(openrouterKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: true,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: openrouterKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    huggingface: {
      id: "huggingface",
      name: "Hugging Face Inference API",
      apiKey: hfKey,
      baseUrl: "https://router.huggingface.co/hf-inference/v1/chat/completions",
      modelId: "meta-llama/Llama-3.1-8B-Instruct",
      defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
      supportedModels: [
        "meta-llama/Llama-3.1-8B-Instruct",
        "Qwen/Qwen2.5-72B-Instruct",
      ],
      apiType: "huggingface",
      authMethod: "bearer",
      priority: 5,
      isCustom: false,
      enabled: Boolean(hfKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: false,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: hfKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    cerebras: {
      id: "cerebras",
      name: "Cerebras API",
      apiKey: cerebrasKey,
      baseUrl: "https://api.cerebras.ai/v1/chat/completions",
      modelId: "llama3.1-8b",
      defaultModel: "llama3.1-8b",
      supportedModels: ["llama3.1-8b", "llama-3.3-70b"],
      apiType: "openai_compatible",
      authMethod: "bearer",
      priority: 6,
      isCustom: false,
      enabled: Boolean(cerebrasKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: false,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: cerebrasKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    cohere: {
      id: "cohere",
      name: "Cohere API",
      apiKey: cohereKey,
      baseUrl: "https://api.cohere.com/v1/chat",
      modelId: "command-r",
      defaultModel: "command-r",
      supportedModels: ["command-r", "command-r-plus-08-2024"],
      apiType: "cohere",
      authMethod: "bearer",
      priority: 7,
      isCustom: false,
      enabled: Boolean(cohereKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: false,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: cohereKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    mistral: {
      id: "mistral",
      name: "Mistral API",
      apiKey: mistralKey,
      baseUrl: "https://api.mistral.ai/v1/chat/completions",
      modelId: "mistral-small-latest",
      defaultModel: "mistral-small-latest",
      supportedModels: ["mistral-small-latest", "mistral-large-latest"],
      apiType: "openai_compatible",
      authMethod: "bearer",
      priority: 8,
      isCustom: false,
      enabled: Boolean(mistralKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: false,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: mistralKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
    claude: {
      id: "claude",
      name: "Anthropic Claude API",
      apiKey: claudeKey,
      baseUrl: "https://api.anthropic.com/v1/messages",
      modelId: "claude-3-5-sonnet-20241022",
      defaultModel: "claude-3-5-sonnet-20241022",
      supportedModels: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
      apiType: "anthropic",
      authMethod: "x-api-key",
      priority: 9,
      isCustom: false,
      enabled: Boolean(claudeKey),
      active: false,
      supportedFeatures: {
        textChat: true,
        imageVision: true,
        fileUpload: true,
        voice: false,
        imageGen: false,
      },
      status: claudeKey ? "connected" : "not_connected",
      lastError: null,
      lastSuccessAt: null,
      lastTestedAt: null,
      latencyMs: null,
      rateLimitHeaders: null,
    },
  };
}

let providerStore: Record<string, ServerProviderRecord> = buildBuiltInProviders();
let storeLoaded = false;

function loadStoreOnce(): void {
  if (storeLoaded) return;
  storeLoaded = true;

  // 1. Optional JSON env override for serverless Netlify deployments
  try {
    const rawEnv = process.env.SAJJAT_CUSTOM_PROVIDERS_JSON;
    if (rawEnv) {
      const parsed = JSON.parse(rawEnv);
      if (parsed && typeof parsed === "object") {
        for (const [id, rec] of Object.entries<any>(parsed)) {
          providerStore[id] = {
            ...(providerStore[id] || {}),
            ...rec,
            id,
          };
        }
      }
    }
  } catch {
    // ignore invalid env json
  }

  // 2. Persistent local file store for Express/Node runtime
  try {
    if (fs.existsSync(PROVIDERS_STORE_PATH)) {
      const raw = fs.readFileSync(PROVIDERS_STORE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [id, rec] of Object.entries<any>(parsed)) {
          const base = providerStore[id];
          providerStore[id] = {
            ...(base || {}),
            ...rec,
            id,
            // Preserve live env key if stored key is empty
            apiKey: rec.apiKey || base?.apiKey || "",
          };
        }
      }
    }
  } catch {
    // Read-only FS on Netlify Functions - stay safely in memory
  }
}

function persistStore(): void {
  try {
    fs.writeFileSync(PROVIDERS_STORE_PATH, JSON.stringify(providerStore, null, 2), "utf8");
  } catch {
    // Non-fatal on serverless read-only environments
  }
}

export function maskApiKey(key: string): string {
  const clean = (key || "").trim();
  if (!clean) return "";
  if (clean.length <= 8) return "••••••••";
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function extractRateLimitHeaders(headers: Headers): Record<string, string> | null {
  const captured: Record<string, string> = {};
  headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (
      lower.includes("ratelimit") ||
      lower === "retry-after" ||
      lower.includes("remaining-credits")
    ) {
      captured[lower] = value;
    }
  });
  return Object.keys(captured).length > 0 ? captured : null;
}

function resolveOpenAiEndpoint(baseUrl: string): string {
  const clean = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!clean) return "https://api.openai.com/v1/chat/completions";
  if (clean.endsWith("/chat/completions")) return clean;
  if (clean.endsWith("/v1")) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

function buildAuthHeadersAndUrl(
  url: string,
  authMethod: ProviderAuthMethod,
  apiKey: string,
  customAuthHeaderName?: string
): { targetUrl: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let targetUrl = url;

  if (authMethod === "x-api-key") {
    headers["x-api-key"] = apiKey;
  } else if (authMethod === "query_param") {
    const sep = targetUrl.includes("?") ? "&" : "?";
    targetUrl = `${targetUrl}${sep}key=${encodeURIComponent(apiKey)}`;
  } else if (authMethod === "custom_header" && customAuthHeaderName) {
    headers[customAuthHeaderName.trim()] = apiKey;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return { targetUrl, headers };
}

function extractGenericReply(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.choices?.[0]?.message?.content) {
    return String(data.choices[0].message.content);
  }
  if (data.choices?.[0]?.text) {
    return String(data.choices[0].text);
  }
  if (Array.isArray(data.content) && data.content[0]?.text) {
    return String(data.content[0].text);
  }
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return String(data.candidates[0].content.parts[0].text);
  }
  if (data.text) return String(data.text);
  if (data.reply) return String(data.reply);
  if (data.output) return typeof data.output === "string" ? data.output : JSON.stringify(data.output);
  if (data.response) return String(data.response);
  if (data.generated_text) return String(data.generated_text);
  if (Array.isArray(data) && data[0]?.generated_text) return String(data[0].generated_text);
  return "";
}

export async function invokeSingleProvider(params: {
  provider: ServerProviderRecord;
  message: string;
  history?: ChatTurnMessage[];
  imageBase64?: string;
  imageMimeType?: string;
  fileContent?: string;
  fileName?: string;
  requestedModel?: string;
  systemInstruction: string;
}): Promise<{
  reply: string;
  usedModel: string;
  rateLimitHeaders: Record<string, string> | null;
  statusCode: number;
}> {
  const { provider, message, history = [], imageBase64, imageMimeType, fileContent, fileName, requestedModel, systemInstruction } = params;
  const apiKey = (provider.apiKey || "").trim();
  if (!apiKey) {
    throw Object.assign(new Error(`Provider "${provider.name}" has no API key configured.`), {
      statusCode: 400,
    });
  }

  let promptText = message || "";
  if (fileContent && fileName) {
    promptText = `[সংযুক্ত ফাইল: ${fileName}]\n\`\`\`\n${fileContent.slice(0, 12000)}\n\`\`\`\n\n${
      promptText || "দয়া করে উপরের ফাইলটি বিশ্লেষণ করে বিস্তারিত উত্তর দিন।"
    }`;
  }

  const chosenModel =
    provider.id === "gemini" && requestedModel
      ? requestedModel
          .replace("gemini-3.6-flash", "gemini-4-hydrogen")
          .replace("gemini-1.5-flash", "gemini-4-hydrogen")
      : provider.modelId || provider.defaultModel;

  // 1. Gemini Adapter (Official @google/genai SDK)
  if (provider.apiType === "gemini") {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const contents: any[] = [];
    for (const item of history.slice(-6)) {
      const txt = item.text || item.content || "";
      if (!txt.trim()) continue;
      contents.push({
        role: item.sender === "user" || item.role === "user" ? "user" : "model",
        parts: [{ text: txt }],
      });
    }

    const parts: any[] = [];
    if (imageBase64 && provider.supportedFeatures.imageVision) {
      const cleanB64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      parts.push({
        inlineData: {
          mimeType: imageMimeType || "image/jpeg",
          data: cleanB64,
        },
      });
    }
    parts.push({ text: promptText || "ছবিটি বিশ্লেষণ করুন।" });
    contents.push({ role: "user", parts });

    const candidateModels = Array.from(
      new Set([chosenModel, "gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.1-flash-lite"])
    );

    let lastErr: any = null;
    for (const m of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model: m,
          contents,
          config: { systemInstruction },
        });
        if (res.text && res.text.trim()) {
          return {
            reply: res.text.trim(),
            usedModel: m,
            rateLimitHeaders: null,
            statusCode: 200,
          };
        }
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw Object.assign(new Error(lastErr?.message || "Gemini API generation failed"), {
      statusCode: lastErr?.status || 500,
    });
  }

  // Build standardized chat messages for HTTP-based adapters
  const messages: Array<{ role: string; content: any }> = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  for (const item of history.slice(-6)) {
    const txt = item.text || item.content || "";
    if (!txt.trim()) continue;
    messages.push({
      role: item.sender === "user" || item.role === "user" ? "user" : "assistant",
      content: txt,
    });
  }

  if (imageBase64 && provider.supportedFeatures.imageVision) {
    const mime = imageMimeType || "image/jpeg";
    const dataUri = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mime};base64,${imageBase64}`;
    messages.push({
      role: "user",
      content: [
        { type: "text", text: promptText || "Describe this image in detail." },
        { type: "image_url", image_url: { url: dataUri } },
      ],
    });
  } else {
    messages.push({ role: "user", content: promptText });
  }

  // 2. Anthropic Claude Adapter
  if (provider.apiType === "anthropic") {
    const endpoint = provider.baseUrl?.trim() || "https://api.anthropic.com/v1/messages";
    const { targetUrl, headers } = buildAuthHeadersAndUrl(
      endpoint,
      provider.authMethod || "x-api-key",
      apiKey,
      provider.customAuthHeaderName
    );
    headers["anthropic-version"] = "2023-06-01";

    const claudeMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (Array.isArray(m.content) && imageBase64) {
          const cleanB64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
          return {
            role: m.role,
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: imageMimeType || "image/jpeg",
                  data: cleanB64,
                },
              },
              { type: "text", text: promptText || "Describe this image." },
            ],
          };
        }
        return {
          role: m.role,
          content: typeof m.content === "string" ? m.content : promptText,
        };
      });

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: 4096,
        system: systemInstruction,
        messages: claudeMessages,
      }),
    });

    const rlHeaders = extractRateLimitHeaders(res.headers);
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw Object.assign(new Error(`HTTP ${res.status}: ${errTxt.slice(0, 220)}`), {
        statusCode: res.status,
        rateLimitHeaders: rlHeaders,
      });
    }
    const data = await res.json();
    const reply = extractGenericReply(data);
    if (!reply) throw new Error("Empty response from Anthropic endpoint.");
    return { reply, usedModel: chosenModel, rateLimitHeaders: rlHeaders, statusCode: res.status };
  }

  // 3. Cohere Adapter
  if (provider.apiType === "cohere") {
    const endpoint = provider.baseUrl?.trim() || "https://api.cohere.com/v1/chat";
    const { targetUrl, headers } = buildAuthHeadersAndUrl(
      endpoint,
      provider.authMethod || "bearer",
      apiKey,
      provider.customAuthHeaderName
    );

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: chosenModel,
        message: promptText,
        preamble: systemInstruction,
        chat_history: history.slice(-6).map((h) => ({
          role: h.sender === "user" || h.role === "user" ? "USER" : "CHATBOT",
          message: h.text || h.content || "",
        })),
      }),
    });

    const rlHeaders = extractRateLimitHeaders(res.headers);
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw Object.assign(new Error(`HTTP ${res.status}: ${errTxt.slice(0, 220)}`), {
        statusCode: res.status,
        rateLimitHeaders: rlHeaders,
      });
    }
    const data = await res.json();
    const reply = extractGenericReply(data);
    if (!reply) throw new Error("Empty response from Cohere endpoint.");
    return { reply, usedModel: chosenModel, rateLimitHeaders: rlHeaders, statusCode: res.status };
  }

  // 4. OpenAI-Compatible / HuggingFace / Custom REST Adapter
  const endpoint =
    provider.apiType === "custom_rest"
      ? (provider.baseUrl || "").trim()
      : provider.apiType === "huggingface"
      ? provider.baseUrl?.trim() ||
        "https://router.huggingface.co/hf-inference/v1/chat/completions"
      : resolveOpenAiEndpoint(provider.baseUrl);

  if (!endpoint) {
    throw Object.assign(new Error(`Provider "${provider.name}" has no Base URL configured.`), {
      statusCode: 400,
    });
  }

  const { targetUrl, headers } = buildAuthHeadersAndUrl(
    endpoint,
    provider.authMethod || "bearer",
    apiKey,
    provider.customAuthHeaderName
  );
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = "https://sajjat-ai.web.app";
    headers["X-Title"] = "Sajjat Ai";
  }

  const payload =
    provider.apiType === "custom_rest"
      ? {
          model: chosenModel,
          messages,
          prompt: promptText,
          inputs: promptText,
          temperature: 0.7,
        }
      : {
          model: chosenModel,
          messages,
          temperature: 0.7,
        };

  const res = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const rlHeaders = extractRateLimitHeaders(res.headers);
  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw Object.assign(new Error(`HTTP ${res.status}: ${errTxt.slice(0, 220)}`), {
      statusCode: res.status,
      rateLimitHeaders: rlHeaders,
    });
  }

  const data = await res.json();
  const reply = extractGenericReply(data);
  if (!reply) {
    throw new Error(`Empty reply returned from ${provider.name}.`);
  }

  return { reply, usedModel: chosenModel, rateLimitHeaders: rlHeaders, statusCode: res.status };
}

/**
 * Priority-ordered single-pass automatic fallback execution across enabled providers.
 * Tries Active Primary first (if enabled + key configured), then enabled backups by ascending priority.
 */
export async function executeChatWithFallback(
  req: ProviderChatRequest
): Promise<ProviderChatResponse> {
  loadStoreOnce();
  const startedAt = Date.now();

  const allTextProviders = Object.values(providerStore).filter(
    (p) =>
      p.enabled &&
      p.supportedFeatures?.textChat !== false &&
      Boolean(p.apiKey && p.apiKey.trim().length > 4)
  );

  // Ordered candidate list: active primary first, then lowest priority number first
  const primary =
    (req.preferredProviderId &&
      allTextProviders.find((p) => p.id === req.preferredProviderId)) ||
    allTextProviders.find((p) => p.active);

  const backups = allTextProviders
    .filter((p) => !primary || p.id !== primary.id)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  const candidates = primary ? [primary, ...backups] : backups;

  if (candidates.length === 0) {
    throw new Error(
      "কোনো সক্রিয় AI Provider বা API Key কনফিগার করা নেই। Admin Panel থেকে API Provider যোগ করুন।"
    );
  }

  let primaryErrorName: string | undefined;
  let lastError: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const t0 = Date.now();
    try {
      const result = await invokeSingleProvider({
        provider: candidate,
        message: req.message,
        history: req.history,
        imageBase64: req.imageBase64,
        imageMimeType: req.imageMimeType,
        fileContent: req.fileContent,
        fileName: req.fileName,
        requestedModel: req.requestedModel,
        systemInstruction: req.systemInstruction,
      });

      const latencyMs = Date.now() - t0;
      const nowIso = new Date().toISOString();
      providerStore[candidate.id] = {
        ...providerStore[candidate.id],
        status: "connected",
        lastError: null,
        lastSuccessAt: nowIso,
        latencyMs,
        rateLimitHeaders: result.rateLimitHeaders || providerStore[candidate.id].rateLimitHeaders,
      };
      persistStore();

      return {
        reply: result.reply,
        model: `Sajjat Ai (${result.usedModel})`,
        providerId: candidate.id,
        providerName: candidate.name,
        fallbackUsed: i > 0,
        fallbackFrom: i > 0 ? primaryErrorName : undefined,
        latencyMs: Date.now() - startedAt,
        timestamp: nowIso,
      };
    } catch (err: any) {
      lastError = err;
      if (i === 0) primaryErrorName = candidate.name;
      const statusCode = Number(err?.statusCode || 500);
      providerStore[candidate.id] = {
        ...providerStore[candidate.id],
        status: statusCode === 429 ? "rate_limited" : "error",
        lastError: err?.message || "Upstream provider call failed",
        latencyMs: Date.now() - t0,
        rateLimitHeaders: err?.rateLimitHeaders || providerStore[candidate.id].rateLimitHeaders,
      };
      persistStore();
      console.warn(
        `[AI Provider Fallback] ${candidate.id} failed (${statusCode}): ${err?.message}`
      );
    }
  }

  throw new Error(lastError?.message || "সকল AI Provider ব্যর্থ হয়েছে।");
}

export function listAdminProvidersMasked(): {
  activeProviderId: string;
  providers: Array<Omit<ServerProviderRecord, "apiKey"> & { hasKey: boolean; maskedKey: string }>;
} {
  loadStoreOnce();
  const active =
    Object.values(providerStore).find((p) => p.active && p.supportedFeatures?.textChat !== false) ||
    providerStore.gemini;

  const list = Object.values(providerStore)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map(({ apiKey, ...rest }) => ({
      ...rest,
      hasKey: Boolean(apiKey && apiKey.trim().length > 4),
      maskedKey: maskApiKey(apiKey),
    }));

  return {
    activeProviderId: active?.id || "gemini",
    providers: list,
  };
}

export function upsertAdminProvider(input: {
  id?: string;
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
  apiType?: ProviderApiType;
  authMethod?: ProviderAuthMethod;
  customAuthHeaderName?: string;
  priority?: number;
  enabled?: boolean;
  active?: boolean;
  isCustom?: boolean;
  supportedFeatures?: Partial<ProviderFeatureCapabilities>;
  description?: string;
}): Omit<ServerProviderRecord, "apiKey"> & { hasKey: boolean; maskedKey: string } {
  loadStoreOnce();

  let id = (input.id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  if (!id) {
    const slug = (input.name || "custom")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    id = `custom_${slug || "provider"}_${Date.now().toString(36)}`;
  }

  const existing = providerStore[id];
  const nextApiKey =
    typeof input.apiKey === "string" && input.apiKey.trim().length > 0
      ? input.apiKey.trim()
      : existing?.apiKey || "";

  const nextFeatures: ProviderFeatureCapabilities = {
    textChat: input.supportedFeatures?.textChat ?? existing?.supportedFeatures?.textChat ?? true,
    imageVision:
      input.supportedFeatures?.imageVision ?? existing?.supportedFeatures?.imageVision ?? false,
    fileUpload:
      input.supportedFeatures?.fileUpload ?? existing?.supportedFeatures?.fileUpload ?? true,
    voice: input.supportedFeatures?.voice ?? existing?.supportedFeatures?.voice ?? false,
    imageGen: input.supportedFeatures?.imageGen ?? existing?.supportedFeatures?.imageGen ?? false,
  };

  if (input.active) {
    for (const k of Object.keys(providerStore)) {
      providerStore[k] = { ...providerStore[k], active: k === id };
    }
  }

  const record: ServerProviderRecord = {
    id,
    name: (input.name || existing?.name || id).trim(),
    apiKey: nextApiKey,
    baseUrl: (input.baseUrl ?? existing?.baseUrl ?? "").trim(),
    modelId: (input.modelId ?? existing?.modelId ?? existing?.defaultModel ?? "gpt-4o-mini").trim(),
    defaultModel: existing?.defaultModel || (input.modelId || "gpt-4o-mini").trim(),
    supportedModels: existing?.supportedModels || [
      (input.modelId || "gpt-4o-mini").trim(),
    ],
    apiType: input.apiType || existing?.apiType || "openai_compatible",
    authMethod: input.authMethod || existing?.authMethod || "bearer",
    customAuthHeaderName: input.customAuthHeaderName ?? existing?.customAuthHeaderName,
    priority:
      typeof input.priority === "number" && !Number.isNaN(input.priority)
        ? Math.max(1, Math.round(input.priority))
        : existing?.priority ?? Object.keys(providerStore).length + 1,
    isCustom: input.isCustom ?? existing?.isCustom ?? !["gemini", "fal", "grok", "deepseek", "openrouter", "huggingface", "cerebras", "cohere", "mistral", "claude"].includes(id),
    enabled: input.enabled ?? existing?.enabled ?? Boolean(nextApiKey),
    active: input.active ?? existing?.active ?? false,
    supportedFeatures: nextFeatures,
    description: input.description ?? existing?.description,
    status: nextApiKey ? existing?.status === "error" || existing?.status === "rate_limited" ? existing.status : "connected" : "not_connected",
    lastError: existing?.lastError ?? null,
    lastSuccessAt: existing?.lastSuccessAt ?? null,
    lastTestedAt: existing?.lastTestedAt ?? null,
    latencyMs: existing?.latencyMs ?? null,
    rateLimitHeaders: existing?.rateLimitHeaders ?? null,
  };

  providerStore[id] = record;
  persistStore();

  const { apiKey: _hidden, ...safe } = record;
  return {
    ...safe,
    hasKey: Boolean(nextApiKey && nextApiKey.length > 4),
    maskedKey: maskApiKey(nextApiKey),
  };
}

export function deleteAdminProvider(id: string): { deleted: boolean; error?: string } {
  loadStoreOnce();
  const target = providerStore[id];
  if (!target) {
    return { deleted: false, error: "Provider খুঁজে পাওয়া যায়নি।" };
  }
  if (!target.isCustom) {
    return { deleted: false, error: "Built-in provider ডিলিট করা যাবে না — আপনি চাইলে Disable করতে পারেন।" };
  }
  const wasActive = target.active;
  delete providerStore[id];
  if (wasActive && providerStore.gemini) {
    providerStore.gemini.active = true;
  }
  persistStore();
  return { deleted: true };
}

export async function testAdminProviderPing(input: {
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
  apiType?: ProviderApiType;
  authMethod?: ProviderAuthMethod;
  customAuthHeaderName?: string;
}): Promise<{
  success: boolean;
  latencyMs: number;
  reply?: string;
  error?: string;
  rateLimitHeaders?: Record<string, string> | null;
}> {
  loadStoreOnce();
  const existing = input.providerId ? providerStore[input.providerId] : undefined;
  const apiKey = (input.apiKey || existing?.apiKey || "").trim();
  const nowIso = new Date().toISOString();
  const t0 = Date.now();

  if (!apiKey) {
    return {
      success: false,
      latencyMs: 0,
      error: "কোনো API Key প্রদান করা হয়নি।",
    };
  }

  // Dedicated Fal.ai test ping
  if (input.providerId === "fal") {
    try {
      const falModel = (input.modelId || existing?.modelId || "fal-ai/flux/schnell").trim();
      const falResponse = await fetch(`https://fal.run/${falModel}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "a tiny green dot",
          image_size: "square",
          sync_mode: true,
        }),
      });
      const rlHeaders = extractRateLimitHeaders(falResponse.headers);
      const latencyMs = Date.now() - t0;
      if (!falResponse.ok) {
        const errText = await falResponse.text().catch(() => "");
        const isLocked =
          falResponse.status === 401 ||
          falResponse.status === 403 ||
          errText.includes("TOP_UP") ||
          errText.includes("locked") ||
          errText.includes("invalid key");
        if (existing) {
          providerStore[existing.id] = {
            ...existing,
            status: "error",
            isLocked,
            lastError: `Fal.ai HTTP ${falResponse.status}: ${errText.slice(0, 180)}`,
            lastTestedAt: nowIso,
            latencyMs,
            rateLimitHeaders: rlHeaders,
          };
          persistStore();
        }
        return {
          success: false,
          latencyMs,
          error: `Fal.ai HTTP ${falResponse.status}: ${errText.slice(0, 180)}`,
          rateLimitHeaders: rlHeaders,
        };
      }
      if (existing) {
        providerStore[existing.id] = {
          ...existing,
          status: "connected",
          isLocked: false,
          lastError: null,
          lastSuccessAt: nowIso,
          lastTestedAt: nowIso,
          latencyMs,
          rateLimitHeaders: rlHeaders,
        };
        persistStore();
      }
      return {
        success: true,
        latencyMs,
        reply: "OK - Fal.ai image engine is operational.",
        rateLimitHeaders: rlHeaders,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - t0,
        error: err?.message || "Fal.ai connection test failed",
      };
    }
  }

  const tempProvider: ServerProviderRecord = {
    id: existing?.id || input.providerId || "test_provider",
    name: existing?.name || input.providerId || "Custom Provider",
    apiKey,
    baseUrl: (input.baseUrl ?? existing?.baseUrl ?? "").trim(),
    modelId: (input.modelId ?? existing?.modelId ?? existing?.defaultModel ?? "gemini-4-hydrogen").trim(),
    defaultModel: existing?.defaultModel || "gemini-4-hydrogen",
    supportedModels: existing?.supportedModels || [],
    apiType: input.apiType || existing?.apiType || "openai_compatible",
    authMethod: input.authMethod || existing?.authMethod || "bearer",
    customAuthHeaderName: input.customAuthHeaderName ?? existing?.customAuthHeaderName,
    priority: existing?.priority ?? 10,
    isCustom: existing?.isCustom ?? true,
    enabled: true,
    active: false,
    supportedFeatures: existing?.supportedFeatures || {
      textChat: true,
      imageVision: false,
      fileUpload: true,
      voice: false,
      imageGen: false,
    },
    status: "connected",
    lastError: null,
    lastSuccessAt: null,
    lastTestedAt: nowIso,
    latencyMs: null,
    rateLimitHeaders: null,
  };

  try {
    const res = await invokeSingleProvider({
      provider: tempProvider,
      message: "Ping test: reply concisely with 'OK'.",
      systemInstruction: "Reply concisely with 'OK'.",
    });
    const latencyMs = Date.now() - t0;

    if (existing) {
      providerStore[existing.id] = {
        ...existing,
        status: "connected",
        lastError: null,
        lastSuccessAt: nowIso,
        lastTestedAt: nowIso,
        latencyMs,
        rateLimitHeaders: res.rateLimitHeaders || existing.rateLimitHeaders,
      };
      persistStore();
    }

    return {
      success: true,
      latencyMs,
      reply: res.reply.slice(0, 140),
      rateLimitHeaders: res.rateLimitHeaders,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    const statusCode = Number(err?.statusCode || 500);
    if (existing) {
      providerStore[existing.id] = {
        ...existing,
        status: statusCode === 429 ? "rate_limited" : "error",
        lastError: err?.message || "Test ping failed",
        lastTestedAt: nowIso,
        latencyMs,
        rateLimitHeaders: err?.rateLimitHeaders || existing.rateLimitHeaders,
      };
      persistStore();
    }
    return {
      success: false,
      latencyMs,
      error: err?.message || "Connection test failed",
      rateLimitHeaders: err?.rateLimitHeaders || null,
    };
  }
}

export function getProviderApiKey(providerId: string): string {
  loadStoreOnce();
  return (providerStore[providerId]?.apiKey || "").trim();
}

export function getProviderRecord(providerId: string): ServerProviderRecord | undefined {
  loadStoreOnce();
  return providerStore[providerId];
}

export function setProviderLocked(providerId: string, locked: boolean): void {
  loadStoreOnce();
  if (providerStore[providerId]) {
    providerStore[providerId] = {
      ...providerStore[providerId],
      isLocked: locked,
      status: locked ? "error" : providerStore[providerId].status,
    };
    persistStore();
  }
}

export function getPublicAiCapabilities(): {
  activeProviderId: string;
  activeProviderName: string;
  activeModel: string;
  supportedFeatures: ProviderFeatureCapabilities;
  enabledTextProvidersCount: number;
} {
  loadStoreOnce();
  const enabledText = Object.values(providerStore).filter(
    (p) =>
      p.enabled &&
      p.supportedFeatures?.textChat !== false &&
      Boolean(p.apiKey && p.apiKey.trim().length > 4)
  );
  const active =
    enabledText.find((p) => p.active) ||
    enabledText.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0] ||
    providerStore.gemini;

  return {
    activeProviderId: active?.id || "gemini",
    activeProviderName: active?.name || "Sajjat Ai Engine",
    activeModel: active?.modelId || "gemini-4-hydrogen",
    supportedFeatures: active?.supportedFeatures || {
      textChat: true,
      imageVision: true,
      fileUpload: true,
      voice: true,
      imageGen: true,
    },
    enabledTextProvidersCount: enabledText.length,
  };
}
