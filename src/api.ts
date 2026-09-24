import { ChatMessage, AttachedFile } from "./types";
import { generateClientFallbackReply } from "./knowledge";
import { database } from "./firebase";
import { ref, get } from "firebase/database";

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
  debugInfo?: {
    userPrompt: string;
    finalImagePrompt: string;
    modelUsed: string;
    apiStatus: string;
  };
}

// Bilingual visual phrase replacement map for client-side direct image generation fallback
const BENGALI_PHRASES_MAP: Array<[RegExp, string]> = [
  [/মসজিদ|মসজিদের|মসজিদের ছবি/gi, "beautiful majestic mosque with minarets and dome"],
  [/মন্দির|মন্দিরের/gi, "beautiful traditional temple architecture"],
  [/বাড়ি|বাড়ি|বাড়ির|বাড়ির ছবি|সুন্দর বাড়ি/gi, "beautiful modern luxury house design"],
  [/জাহাজ|জাহাজের|জাহাজের ছবি|সমুদ্রের জাহাজ|বড় জাহাজ|বড় জাহাজের/gi, "grand ocean liner passenger ship sailing gracefully on deep blue sea water"],
  [/লঞ্চ|লঞ্চের|নৌযান/gi, "Bangladeshi passenger river launch ferry boat travelling on wide river"],
  [/স্টিমার|স্টিমারের/gi, "vintage passenger steamship vessel on river water"],
  [/বাংলাদেশি নদী|বাংলাদেশের নদী/gi, "Bangladeshi river landscape"],
  [/পালতোলা নৌকা|পাল তোলা নৌকা|পালতোলা নৌকার/gi, "traditional wooden boat with colorful canvas sail on river water"],
  [/নৌকা|নৌকার/gi, "traditional wooden country boat on calm water"],
  [/কাশফুল|কাশ ফুল/gi, "blooming white kash phool reeds along village riverbank"],
  [/নদীর দৃশ্য/gi, "scenic river landscape view"],
  [/পাহাড়ি দৃশ্য|পাহাড়ি দৃশ্য/gi, "mountainous landscape scenery"],
  [/সূর্যাস্তের আলো/gi, "golden sunset light"],
  [/সূর্যোদয়ের আলো|সূর্যোদয়ের আলো/gi, "morning sunrise light"],
  [/সবুজ গ্রাম/gi, "lush green rural Bengal village"],
  [/ধানখেত|ধানক্ষেত/gi, "golden green paddy fields"],
  [/স্পোর্টস কার/gi, "luxury high-performance sports car"],
  [/ভবিষ্যতের ঢাকা/gi, "futuristic sci-fi city of Dhaka"],
  [/বাংলাদেশের মানচিত্র/gi, "topographic physical map of Bangladesh"],
];

const HUMAN_KEYWORDS = [
  "মানুষ", "ব্যক্তি", "মেয়ে", "মেয়ে", "ছেলে", "নারী", "পুরুষ", "শিশু", "বাচ্চা",
  "ডাক্তার", "শিক্ষক", "প্রতিকৃতি", "পোর্ট্রেট",
  "person", "man", "woman", "girl", "boy", "child", "human", "portrait", "face", "people", "character", "model"
];

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
  "মসজিদ": "beautiful majestic mosque with minarets and dome",
  "মসজিদের": "beautiful majestic mosque with minarets and dome",
  "মন্দির": "beautiful traditional temple architecture",
  "বাড়ি": "beautiful modern luxury house design",
  "বাড়ি": "beautiful modern luxury house design",
  "ঘর": "cozy beautiful room interior",
  "মাঝি": "wooden country boat on river",
  "নৌকা": "traditional wooden country boat on calm water",
  "পালতোলা": "traditional wooden boat with colorful canvas sail on river",
  "কৃষক": "green rural agricultural farmland",
  "মেয়ে": "portrait of a graceful woman with natural lighting",
  "মেয়ে": "portrait of a graceful woman with natural lighting",
  "নারী": "portrait of an elegant woman in traditional attire",
  "ছেলে": "portrait of a young man with natural soft lighting",
  "শিশু": "happy joyful cute child smiling outdoors",
  "ডাক্তার": "caring professional doctor in modern clinic",
  "শিক্ষক": "dedicated teacher in classroom",
  "বৃদ্ধ": "wise elderly person with kind smile",
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
  clean = clean.replace(/(ছবি আঁকো|ছবি বানাও|ছবি তৈরি করো|ছবি বানিয়ে দাও|ছবি এঁকে দাও|এর ছবি দাও|এর ছবি চাই|ছবি চাই|ছবি তৈরি করে দেন|ছবি বানিয়ে দেন|ছবি তৈরি করে দাও|draw an image of|generate an image of|create a picture of|draw a|paint a)/gi, "");
  clean = clean.trim();

  const requestsHuman = HUMAN_KEYWORDS.some(kw => prompt.toLowerCase().includes(kw));

  let textToTranslate = clean;
  // First, replace known multi-word phrases
  for (const [regex, replacement] of BENGALI_PHRASES_MAP) {
    textToTranslate = textToTranslate.replace(regex, replacement);
  }

  // Tokenize & map remaining words
  const words = textToTranslate.split(/\s+/);
  const translatedParts: string[] = [];

  for (const rawWord of words) {
    // Strip trailing punctuation
    const wordClean = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()|"'।]/g, "").trim();
    if (!wordClean) continue;

    if (BENGALI_VISUAL_MAP[wordClean]) {
      translatedParts.push(BENGALI_VISUAL_MAP[wordClean]);
      continue;
    }

    const stemmed = wordClean.replace(/(ের|এর|টি|টা|গুলো|গুলোর|কে|তে)$/, "");
    if (BENGALI_VISUAL_MAP[stemmed]) {
      translatedParts.push(BENGALI_VISUAL_MAP[stemmed]);
      continue;
    }

    translatedParts.push(wordClean);
  }

  let translated = translatedParts.join(" ");

  // Strip any remaining raw Bengali script to ensure clean English prompt for text-to-image models
  translated = translated.replace(/[\u0980-\u09FF]+/g, "").replace(/\s+/g, " ").trim();

  if (!translated || translated.length < 3) {
    translated = "grand ocean liner passenger ship sailing on water";
  }

  // Strictly exclude humans if user did not request a person/portrait
  if (!requestsHuman) {
    return `${translated}, high quality, beautiful lighting, clear focus, no humans, no people, no portraits`;
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

async function translatePromptDynamicallyOnClient(userPrompt: string): Promise<string> {
  let clean = userPrompt.trim();
  clean = clean.replace(/^(draw:|image:|ছবি:|ছবি আঁকো:|ছবি তৈরি করো:|\/image|\/draw)\s*/i, "");
  clean = clean.replace(/^(আমাকে|একটি|একটা|দয়া করে|প্লিজ)\s+/i, "");
  clean = clean.replace(/(ছবি আঁকো|ছবি বানাও|ছবি তৈরি করো|ছবি বানিয়ে দাও|ছবি এঁকে দাও|এর ছবি দাও|এর ছবি চাই|ছবি চাই|ছবি তৈরি করে দেন|ছবি বানিয়ে দেন|ছবি তৈরি করে দাও|draw an image of|generate an image of|create a picture of|draw a|paint a)/gi, "");
  clean = clean.trim();

  const requestsHuman = HUMAN_KEYWORDS.some(kw => userPrompt.toLowerCase().includes(kw));

  // Try MyMemory Dynamic Translation first!
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=bn|en`;
    const response = await fetch(myMemoryUrl);
    if (response.ok) {
      const data = await response.json() as any;
      const apiTranslated = data.responseData?.translatedText;
      if (apiTranslated && apiTranslated.trim().length > 1 && !/[\u0980-\u09FF]/.test(apiTranslated)) {
        let result = apiTranslated.trim().replace(/^["']|["']$/g, "");
        if (!requestsHuman) {
          return `${result}, high quality, beautiful lighting, clear focus, no humans, no people, no portraits`;
        }
        return `${result}, ultra realistic, 4k resolution, high detail, photorealistic photography`;
      }
    }
  } catch (err) {
    console.warn("MyMemory client translation failed, using fallback mapper", err);
  }

  // Fallback to local synchronous mapper
  let textToTranslate = clean;
  for (const [regex, replacement] of BENGALI_PHRASES_MAP) {
    textToTranslate = textToTranslate.replace(regex, replacement);
  }

  const words = textToTranslate.split(/\s+/);
  const translatedParts: string[] = [];

  for (const rawWord of words) {
    const wordClean = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()|"'।]/g, "").trim();
    if (!wordClean) continue;

    if (BENGALI_VISUAL_MAP[wordClean]) {
      translatedParts.push(BENGALI_VISUAL_MAP[wordClean]);
      continue;
    }

    const stemmed = wordClean.replace(/(ের|এর|টি|টা|গুলো|গুলোর|কে|তে)$/, "");
    if (BENGALI_VISUAL_MAP[stemmed]) {
      translatedParts.push(BENGALI_VISUAL_MAP[stemmed]);
      continue;
    }

    translatedParts.push(wordClean);
  }

  let translated = translatedParts.join(" ");
  translated = translated.replace(/[\u0980-\u09FF]+/g, "").replace(/\s+/g, " ").trim();

  if (!translated || translated.length < 3) {
    translated = "beautiful majestic scenery";
  }

  if (!requestsHuman) {
    return `${translated}, high quality, beautiful lighting, clear focus, no humans, no people, no portraits`;
  }

  return `${translated}, ultra realistic, 4k resolution, high detail, photorealistic photography`;
}

async function clientDirectImageGeneration(params: GenerateImageParams): Promise<GenerateImageResponse> {
  const { prompt, aspectRatio = "1:1", style } = params;
  const translatedPrompt = await translatePromptDynamicallyOnClient(prompt);
  let finalPrompt = translatedPrompt;
  if (style && style !== "default" && style !== "photorealistic" && style !== "portrait") {
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
  // Disabled enhance=true to prevent Pollinations' prompt hallucination of unwanted human portraits
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=false&model=flux`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(pollinationsUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 500) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return {
          success: true,
          imageUrl: dataUrl,
          directUrl: dataUrl,
          prompt: prompt,
          refinedPrompt: finalPrompt,
          caption: `আমি আপনার অনুরোধ অনুযায়ী "${prompt}"-এর চমৎকার ছবি তৈরি করেছি!`,
          model: "Flux / Sajjat AI Neural Engine",
          aspectRatio: aspectRatio,
          debugInfo: {
            userPrompt: prompt,
            finalImagePrompt: finalPrompt,
            modelUsed: "Flux / Pollinations Channel",
            apiStatus: "Success"
          }
        };
      }
    }
  } catch (err: any) {
    console.error("Direct image generation error:", err);
  }

  return {
    success: false,
    error: "ছবি তৈরি করতে সমস্যা হয়েছে। দয়া করে আপনার প্রম্পট পরিবর্তন বা আবার চেষ্টা করুন।",
    debugInfo: {
      userPrompt: prompt,
      finalImagePrompt: finalPrompt,
      modelUsed: "Flux / Pollinations Channel",
      apiStatus: "Error"
    }
  };
}

export async function generateAiImageApi(params: GenerateImageParams): Promise<GenerateImageResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (!data.success && data.error) {
        return {
          success: false,
          error: data.error,
          debugInfo: data.debugInfo || {
            userPrompt: params.prompt,
            finalImagePrompt: params.prompt,
            modelUsed: params.engine || "Gemini Image Model",
            apiStatus: "Error"
          }
        };
      }
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

async function sendChatMessageDirectToProvider(params: SendChatParams): Promise<ChatResponse> {
  const { message, history = [], imageBase64, imageMimeType, attachedFile } = params;

  try {
    // 1. Get active provider & settings from Firebase RTDB
    let activeProviderId = "gemini";
    let activeModelId = "gemini-3.8-flash";
    let systemInstruction = "";

    try {
      const settingsSnap = await get(ref(database, "system_settings"));
      if (settingsSnap.exists()) {
        const settings = settingsSnap.val();
        if (settings.activeProvider) activeProviderId = settings.activeProvider;
        if (settings.activeModel) activeModelId = settings.activeModel;
        if (settings.systemInstruction) systemInstruction = settings.systemInstruction;
      }
    } catch (dbErr) {
      console.warn("Failed to read system_settings for client fallback:", dbErr);
    }

    // 2. Get the credentials for this provider
    let apiKey = "";
    let providerModelId = activeModelId;

    try {
      const providerSnap = await get(ref(database, `admin_config/api_providers/${activeProviderId}`));
      if (providerSnap.exists()) {
        const providerConfig = providerSnap.val();
        if (providerConfig.apiKey) apiKey = providerConfig.apiKey;
        if (providerConfig.modelId) providerModelId = providerConfig.modelId;
      }
    } catch (pErr) {
      console.warn(`Failed to read provider ${activeProviderId} config:`, pErr);
    }

    // 3. Last-resort fallback for Gemini key
    if (!apiKey) {
      activeProviderId = "gemini";
      const userCustomKey = localStorage.getItem("sajjat_custom_gemini_key");
      apiKey = userCustomKey || "AIzaSyBuz2yF2QdmwNqBwHGPneEnEZvvGo5WZz0";
      providerModelId = "gemini-3.8-flash";
    }

    const cleanModel = providerModelId || "gemini-1.5-flash";

    // 4. Make direct request depending on the provider ID
    if (activeProviderId === "gemini") {
      const contents = history.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      let promptText = message;
      if (attachedFile && !attachedFile.isImage && attachedFile.content) {
        promptText = `[File attached: ${attachedFile.name}]\n\nFile Content:\n${attachedFile.content}\n\nUser Question:\n${message}`;
      }

      if (imageBase64 || (attachedFile && attachedFile.isImage && attachedFile.base64)) {
        const imgB64 = imageBase64 || attachedFile?.base64 || "";
        const imgMime = imageMimeType || attachedFile?.type || "image/jpeg";
        const cleanB64 = imgB64.includes(",") ? imgB64.split(",")[1] : imgB64;

        contents.push({
          role: "user",
          parts: [
            { inlineData: { mimeType: imgMime, data: cleanB64 } },
            { text: promptText }
          ] as any,
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ text: promptText }],
        });
      }

      const reqBody: any = {
        contents,
        generationConfig: {
          temperature: 0.7,
        },
      };

      if (systemInstruction) {
        reqBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const geminiModelAlias = cleanModel
        .replace("gemini-3.1-flash-lite", "gemini-2.5-flash")
        .replace("gemini-3.8-flash", "gemini-2.5-flash")
        .replace("gemini-flash-latest", "gemini-2.5-flash");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelAlias}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini direct API error: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        throw new Error("No response text found in Gemini payload.");
      }

      return {
        reply,
        model: `Sajjat AI (${geminiModelAlias} client)`,
        timestamp: new Date().toISOString(),
      };
    } else {
      let endpoint = "https://openrouter.ai/api/v1/chat/completions";
      if (activeProviderId === "grok") endpoint = "https://api.x.ai/v1/chat/completions";
      else if (activeProviderId === "deepseek") endpoint = "https://api.deepseek.com/chat/completions";
      else if (activeProviderId === "cerebras") endpoint = "https://api.cerebras.ai/v1/chat/completions";
      else if (activeProviderId === "mistral") endpoint = "https://api.mistral.ai/v1/chat/completions";

      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }

      history.forEach((msg) => {
        messages.push({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        });
      });

      let promptText = message;
      if (attachedFile && !attachedFile.isImage && attachedFile.content) {
        promptText = `[File: ${attachedFile.name}]\n\n${attachedFile.content}\n\nQuestion:\n${message}`;
      }

      if (imageBase64 || (attachedFile && attachedFile.isImage && attachedFile.base64)) {
        const imgB64 = imageBase64 || attachedFile?.base64 || "";
        const imgMime = imageMimeType || attachedFile?.type || "image/jpeg";
        const finalUrl = imgB64.startsWith("data:") ? imgB64 : `data:${imgMime};base64,${imgB64}`;

        messages.push({
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: finalUrl } },
          ],
        });
      } else {
        messages.push({
          role: "user",
          content: promptText,
        });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cleanModel,
          messages,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${activeProviderId} direct completion error: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        throw new Error(`Empty reply from ${activeProviderId}.`);
      }

      return {
        reply,
        model: `Sajjat AI (${activeProviderId} direct)`,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    console.error("Direct client API call failed:", err);
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

  const isNetlify = typeof window !== "undefined" && 
    (window.location.hostname.includes("netlify.app") || window.location.hostname.includes("netlify.com") || window.location.hostname.includes("static"));

  if (isNetlify) {
    try {
      const directResponse = await sendChatMessageDirectToProvider(params);
      return directResponse;
    } catch (directErr: any) {
      console.error("Direct Netlify provider call failed:", directErr);
      return {
        reply: generateClientFallbackReply(message, attachedFile?.name),
        model: "Sajjat AI Neural Core (Netlify Backup)",
        timestamp: new Date().toISOString()
      };
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
        console.warn("API network call failed, activating direct client provider proxy:", networkError?.message);
        try {
          const directResponse = await sendChatMessageDirectToProvider(params);
          return directResponse;
        } catch (directErr: any) {
          console.warn("Direct client provider proxy also failed, falling back to local script:", directErr?.message);
          return {
            reply: generateClientFallbackReply(message, attachedFile?.name),
            model: "Sajjat AI Neural Core (Offline)",
            timestamp: new Date().toISOString()
          };
        }
      }
    }
  }

  try {
    const directResponse = await sendChatMessageDirectToProvider(params);
    return directResponse;
  } catch (directErr) {
    return {
      reply: generateClientFallbackReply(message, attachedFile?.name),
      model: "Sajjat AI Assistant",
      timestamp: new Date().toISOString()
    };
  }
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


