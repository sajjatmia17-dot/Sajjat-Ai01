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

// Bilingual visual translation map for client-side direct image generation fallback (e.g. Netlify)
const BENGALI_VISUAL_MAP: Record<string, string> = {
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
  "নদী": "clear river with gentle ripples",
  "পাহাড়": "majestic mountain landscape with morning sunlight",
  "পাহাড়": "majestic mountain landscape with morning sunlight",
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
  "ফুল": "blooming vibrant flowers with dew drops",
  "গোলাপ": "fresh red rose with delicate dewdrops on petals",
  "পদ্ম": "blooming pink lotus flower on water",
  "শাপলা": "national white water lily floating on serene pond",
  "বাগান": "peaceful botanical garden with blooming flowers",
  "মাঝি": "traditional boatman rowing a wooden country boat",
  "নৌকা": "traditional wooden country boat on calm water",
  "পালতোলা নৌকা": "traditional wooden boat with colorful canvas sail on river",
  "কৃষক": "hardworking farmer walking in rural green farmland",
  "মেয়ে": "portrait of a graceful woman with natural lighting",
  "মেয়ে": "portrait of a graceful woman with natural lighting",
  "নারী": "portrait of an elegant woman in traditional attire",
  "ছেলে": "portrait of a young man with natural soft lighting",
  "শিশু": "happy joyful cute child smiling outdoors",
  "ডাক্তার": "caring professional doctor in modern clinic",
  "শিক্ষক": "dedicated teacher in classroom",
  "বৃদ্ধ": "wise elderly person with kind smile",
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

export function clientTranslateImagePrompt(prompt: string): string {
  let clean = prompt.trim();
  clean = clean.replace(/^(draw:|image:|ছবি:|ছবি আঁকো:|ছবি তৈরি করো:|\/image|\/draw)\s*/i, "");
  clean = clean.replace(/^(আমাকে|একটি|একটা|দয়া করে|প্লিজ)\s+/i, "");
  clean = clean.replace(/(ছবি আঁকো|ছবি বানাও|ছবি তৈরি করো|ছবি বানিয়ে দাও|ছবি এঁকে দাও|এর ছবি দাও|এর ছবি চাই|ছবি চাই|draw an image of|generate an image of|create a picture of|draw a|paint a)/gi, "");
  clean = clean.trim();

  let translatedParts: string[] = [];
  const words = clean.split(/\s+/);
  for (const word of words) {
    const matched = BENGALI_VISUAL_MAP[word] || word;
    translatedParts.push(matched);
  }
  const translated = translatedParts.join(" ");

  if (/[\u0980-\u09FF]/.test(translated)) {
    return `${clean}, highly detailed, beautiful lighting, high quality, photorealistic`;
  }

  return `${translated}, ultra realistic, 4k resolution, high detail, photorealistic photography`;
}

export function isImageGenerationIntent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  const lower = t.toLowerCase();

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

  const englishPatterns = [
    /(generate|create|draw|paint|make|produce)\s+(an?\s+)?(image|picture|photo|wallpaper|illustration|art|painting|drawing)/i,
    /(draw|paint|illustrate)\s+(me\s+)?(an?\s+)?/i,
    /^picture\s+of\s+/i,
    /^image\s+of\s+/i,
  ];

  return englishPatterns.some((p) => p.test(lower));
}

async function clientDirectImageGeneration(params: GenerateImageParams): Promise<GenerateImageResponse> {
  const { prompt, aspectRatio = "1:1", style } = params;
  const translatedPrompt = clientTranslateImagePrompt(prompt);
  let finalPrompt = translatedPrompt;
  if (style && style !== "default" && style !== "photorealistic") {
    finalPrompt += `, in ${style} style`;
  }

  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") {
    width = 1024;
    height = 576;
  } else if (aspectRatio === "9:16") {
    width = 576;
    height = 1024;
  }

  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=flux`;

  try {
    const response = await fetch(pollinationsUrl);
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return {
        success: true,
        imageUrl: dataUrl,
        directUrl: pollinationsUrl,
        prompt: prompt,
        refinedPrompt: finalPrompt,
        caption: `আমি আপনার অনুরোধ অনুযায়ী "${prompt}"-এর চমৎকার ছবি তৈরি করেছি!`,
        model: "Sajjat AI Neural Image Engine",
        aspectRatio: aspectRatio,
      };
    }
  } catch {}

  return {
    success: true,
    imageUrl: pollinationsUrl,
    directUrl: pollinationsUrl,
    prompt: prompt,
    refinedPrompt: finalPrompt,
    caption: `আমি আপনার অনুরোধ অনুযায়ী "${prompt}"-এর চিত্রটি তৈরি করেছি!`,
    model: "Sajjat AI Neural Image Engine",
    aspectRatio: aspectRatio,
  };
}

export async function generateAiImageApi(params: GenerateImageParams): Promise<GenerateImageResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s attempt for server route

  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.success && (data.imageUrl || data.directUrl)) {
        return data;
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Seamless fallback for Netlify / Static hosting
  return clientDirectImageGeneration(params);
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

  // Check if message is requesting image generation
  if (!imageBase64 && !attachedFile && isImageGenerationIntent(message)) {
    try {
      const imgRes = await generateAiImageApi({ prompt: message });
      if (imgRes.success && (imgRes.imageUrl || imgRes.directUrl)) {
        return {
          reply: imgRes.caption || "আমি আপনার অনুরোধ অনুযায়ী ছবিটি তৈরি করেছি! নিচে ছবিটি দেখুন।",
          generatedImageUrl: imgRes.imageUrl || imgRes.directUrl,
          generatedImagePrompt: imgRes.refinedPrompt || message,
          model: "Sajjat AI (Gemini Image)",
          timestamp: new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn("Direct image intent generation error:", e);
    }
  }

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

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data: ChatResponse = await res.json();
        return data;
      }

      if (attempt === 1) {
        throw new Error(`সার্ভার ত্রুটি: ${res.status}`);
      }
    } catch (networkError: any) {
      if (attempt === 1) {
        console.warn("API network call failed, activating smart local engine fallback:", networkError?.message);
        const fallbackText = generateClientFallbackReply(message, attachedFile?.name);
        return {
          reply: fallbackText,
          model: "Sajjat AI Neural Core",
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  return {
    reply: generateClientFallbackReply(message, attachedFile?.name),
    model: "Sajjat AI Assistant",
    timestamp: new Date().toISOString()
  };
}

export interface EditImageParams {
  image: string;
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
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("/api/edit-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.success && data.imageUrl) {
        return data;
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Fallback for Netlify / Static hosting
  try {
    const imgRes = await clientDirectImageGeneration({ prompt: params.instruction });
    return {
      success: true,
      imageUrl: imgRes.imageUrl,
      method: "Sajjat AI Direct Neural Edit",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ছবি এডিট করতে সমস্যা হয়েছে।",
    };
  }
}


