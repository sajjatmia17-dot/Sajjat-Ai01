import { ChatMessage, AttachedFile } from "./types";
import { generateClientFallbackReply } from "./knowledge";

interface SendChatParams {
  message: string;
  history?: ChatMessage[];
  imageBase64?: string;
  imageMimeType?: string;
  attachedFile?: AttachedFile;
  model?: string;
  uid?: string;
}

export interface ChatResponse {
  reply: string;
  model?: string;
  timestamp?: string;
  generatedImageUrl?: string;
  generatedImagePrompt?: string;
}

export interface GenerateImageParams {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  style?: string;
  engine?: string;
  customApiKey?: string;
}

export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  directUrl?: string;
  prompt?: string;
  refinedPrompt?: string;
  caption?: string;
  model?: string;
  aspectRatio?: string;
  error?: string;
}

export async function generateAiImageApi(params: GenerateImageParams): Promise<GenerateImageResponse> {
  const controller = new AbortController();
  // 60s timeout for genuine Gemini image generation
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const rawText = await res.text().catch(() => "");
      throw new Error(rawText || `সার্ভার থেকে ত্রুটি এসেছে (স্ট্যাটাস: ${res.status})`);
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "ছবি তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }

    if (!data.imageUrl && !data.directUrl) {
      throw new Error(data.error || "মডেল থেকে কোনো ছবি পাওয়া যায়নি।");
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new Error("ছবি তৈরির রিকোয়েস্টের সময় শেষ হয়েছে (Timeout)। দয়া করে আবার চেষ্টা করুন।");
    }
    throw err;
  }
}

export async function sendChatMessage(params: SendChatParams): Promise<ChatResponse> {
  const { 
    message, 
    history = [], 
    imageBase64, 
    imageMimeType, 
    attachedFile,
    model,
    uid
  } = params;

  // Try API call with 1 auto-retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
          model,
          imageBase64: imageBase64 || attachedFile?.base64,
          imageMimeType: imageMimeType || (attachedFile?.isImage ? attachedFile.type : undefined),
          fileContent: attachedFile && !attachedFile.isImage ? attachedFile.content : undefined,
          fileName: attachedFile?.name,
          uid,
        }),
      });

      if (res.ok) {
        const data: ChatResponse = await res.json();
        return data;
      }

      if (attempt === 1) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `সার্ভার ত্রুটি: ${res.status}`);
      }
    } catch (networkError: any) {
      if (attempt === 1) {
        console.warn("API network call failed, activating smart local engine fallback:", networkError?.message);
        // Seamless fallback to client intelligence engine
        const fallbackText = generateClientFallbackReply(message, attachedFile?.name);
        return {
          reply: fallbackText,
          model: "Sajjat AI Neural Core",
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Guaranteed fallback
  return {
    reply: generateClientFallbackReply(message, attachedFile?.name),
    model: "Sajjat AI Assistant",
    timestamp: new Date().toISOString()
  };
}

export interface EditImageParams {
  image: string; // original or previous base64 image
  instruction: string;
  customApiKey?: string;
}

export interface EditImageResponse {
  success: boolean;
  imageUrl?: string;
  method?: string;
  error?: string;
}

export async function editAiImageApi(params: EditImageParams): Promise<EditImageResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout for image-to-image

  try {
    const res = await fetch("/api/edit-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const rawText = await res.text().catch(() => "");
      throw new Error(rawText || `সার্ভার থেকে ত্রুটি এসেছে (স্ট্যাটাস: ${res.status})`);
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "ছবি এডিট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new Error("ছবি এডিট রিকোয়েস্টের সময় শেষ হয়েছে (Timeout)। দয়া করে আবার চেষ্টা করুন।");
    }
    throw err;
  }
}


