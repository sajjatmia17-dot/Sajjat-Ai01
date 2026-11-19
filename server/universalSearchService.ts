import { GoogleGenAI } from "@google/genai";
import net from "net";

export type UniversalSearchCategory =
  | "web"
  | "news"
  | "video"
  | "audio"
  | "image"
  | "document"
  | "website";

export interface UniversalSearchResultItem {
  id: string;
  category: UniversalSearchCategory;
  title: string;
  description: string;
  sourceName: string;
  originalUrl: string;
  youtubeVideoId?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  duration?: string;
  channelOrAuthor?: string;
  embedUrl?: string;
  playableAudioUrl?: string;
  playableVideoUrl?: string;
  previewOnly?: boolean;
  downloadAllowed: boolean;
  downloadUrl?: string;
  licenseInfo?: string;
  fileType?: string;
  relatedVideos?: UniversalSearchResultItem[];
}

export interface UniversalSearchPayload {
  intent: UniversalSearchCategory | "chat";
  refinedQuery: string;
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
  latencyMs?: number;
  autoPlayFirst?: boolean;
}

export interface UniversalSearchAdminConfig {
  enabled: boolean;
  youtubeEnabled: boolean;
  webSearchEnabled: boolean;
  videoSearchEnabled: boolean;
  audioSearchEnabled: boolean;
  imageSearchEnabled: boolean;
  websiteSearchEnabled: boolean;
  documentSearchEnabled: boolean;
  downloadPermissionEnabled: boolean;
}

export interface UniversalSearchHistoryLog {
  id: string;
  query: string;
  intent: UniversalSearchCategory;
  uid?: string;
  userName?: string;
  resultCount: number;
  sourcesUsed: string[];
  latencyMs: number;
  timestamp: number;
}

export interface UniversalSearchErrorLog {
  id: string;
  intent: string;
  provider: string;
  query: string;
  message: string;
  timestamp: number;
}

const DEFAULT_ADMIN_CONFIG: UniversalSearchAdminConfig = {
  enabled: true,
  youtubeEnabled: true,
  webSearchEnabled: true,
  videoSearchEnabled: true,
  audioSearchEnabled: true,
  imageSearchEnabled: true,
  websiteSearchEnabled: true,
  documentSearchEnabled: true,
  downloadPermissionEnabled: true,
};

let adminSearchConfig: UniversalSearchAdminConfig = { ...DEFAULT_ADMIN_CONFIG };

const searchUsageStats = {
  totalSearches: 0,
  byIntent: {
    web: 0,
    news: 0,
    video: 0,
    audio: 0,
    image: 0,
    document: 0,
    website: 0,
  } as Record<string, number>,
  apiCalls: {
    geminiGrounding: 0,
    googleCustomSearch: 0,
    youtubeApi: 0,
    youtubeDirectSearch: 0,
    youtubeOembed: 0,
    dailymotion: 0,
    itunes: 0,
    deezer: 0,
    internetArchive: 0,
    wikimediaCommons: 0,
    pexels: 0,
    pixabay: 0,
    arxiv: 0,
    openAlex: 0,
    openLibrary: 0,
    wikipedia: 0,
    websiteFetch: 0,
  } as Record<string, number>,
};

let searchHistoryLogs: UniversalSearchHistoryLog[] = [];
let searchErrorLogs: UniversalSearchErrorLog[] = [];

export function getUniversalSearchConfig(): UniversalSearchAdminConfig {
  return { ...adminSearchConfig };
}

export function updateUniversalSearchConfig(partial: Partial<UniversalSearchAdminConfig>): UniversalSearchAdminConfig {
  adminSearchConfig = {
    ...adminSearchConfig,
    ...partial,
  };
  return getUniversalSearchConfig();
}

export function clearUniversalSearchLogs(): void {
  searchHistoryLogs = [];
  searchErrorLogs = [];
}

export function getUniversalSearchAdminStats() {
  return {
    config: getUniversalSearchConfig(),
    envStatus: {
      geminiConfigured: isKeyValid(process.env.GEMINI_API_KEY),
      youtubeApiConfigured: isKeyValid(process.env.YOUTUBE_API_KEY),
      googleSearchApiConfigured:
        isKeyValid(process.env.GOOGLE_SEARCH_API_KEY) && isKeyValid(process.env.GOOGLE_SEARCH_CX),
      pexelsConfigured: isKeyValid(process.env.PEXELS_API_KEY),
      pixabayConfigured: isKeyValid(process.env.PIXABAY_API_KEY),
    },
    usage: {
      totalSearches: searchUsageStats.totalSearches,
      byIntent: { ...searchUsageStats.byIntent },
      apiCalls: { ...searchUsageStats.apiCalls },
      errorCount: searchErrorLogs.length,
    },
    history: searchHistoryLogs.slice(0, 60),
    errors: searchErrorLogs.slice(0, 50),
  };
}

function isKeyValid(val?: string): boolean {
  const s = (val || "").trim();
  return Boolean(s && !s.startsWith("MY_"));
}

function recordError(intent: string, provider: string, query: string, message: string) {
  searchErrorLogs = [
    {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      intent,
      provider,
      query: query.slice(0, 120),
      message: message.slice(0, 260),
      timestamp: Date.now(),
    },
    ...searchErrorLogs,
  ].slice(0, 100);
}

function recordHistory(entry: Omit<UniversalSearchHistoryLog, "id" | "timestamp">) {
  searchUsageStats.totalSearches += 1;
  searchUsageStats.byIntent[entry.intent] = (searchUsageStats.byIntent[entry.intent] || 0) + 1;
  searchHistoryLogs = [
    {
      ...entry,
      id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    },
    ...searchHistoryLogs,
  ].slice(0, 150);
}

function trackApiCall(key: string) {
  searchUsageStats.apiCalls[key] = (searchUsageStats.apiCalls[key] || 0) + 1;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!isKeyValid(apiKey)) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "SajjatAI-UniversalSearch/1.0 (+https://sajjat-ai.web.app)",
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web Source";
  }
}

function formatSeconds(sec?: number): string | undefined {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return undefined;
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatIsoDuration(iso?: string): string | undefined {
  if (!iso) return undefined;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  return formatSeconds(h * 3600 + m * 60 + s);
}

/**
 * SSRF protection for URL fetch and download proxying
 */
export function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "::1" ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    if (net.isIP(host)) {
      const parts = host.split(".").map(Number);
      if (parts.length === 4) {
        if (
          parts[0] === 10 ||
          parts[0] === 127 ||
          (parts[0] === 169 && parts[1] === 254) ||
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168)
        ) {
          return false;
        }
      } else {
        return false; // Block raw IPv6 literals for safety
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function isOpenLicenseDownloadHost(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    const allowedSuffixes = [
      "archive.org",
      "wikimedia.org",
      "arxiv.org",
      "pexels.com",
      "pixabay.com",
      "europepmc.org",
      "doaj.org",
      "ncbi.nlm.nih.gov",
      "openlibrary.org",
    ];
    return allowedSuffixes.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

/**
 * Extract URLs from user query
 */
function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  return matches.filter((u) => isSafePublicHttpUrl(u));
}

/**
 * Automatic Intent Detection (Zero manual category required)
 */
export function detectUniversalIntent(
  rawQuery: string,
  forcedCategory?: UniversalSearchCategory
): UniversalSearchCategory | "chat" {
  if (forcedCategory) return forcedCategory;

  const q = (rawQuery || "").trim();
  if (!q) return "chat";
  const lower = q.toLowerCase();

  // 1. Explicit URL analysis
  const urls = extractUrls(q);
  if (urls.length > 0) {
    return "website";
  }

  // Domain + website analysis phrasing
  if (
    /(এই\s*ওয়েবসাইট|এই\s*ওয়েবসাইট|ওয়েবসাইট\s*সম্পর্কে|ওয়েবসাইট\s*সম্পর্কে|analyze\s+website|website\s+summary|পেজ\s*বিশ্লেষণ)/i.test(
      q
    )
  ) {
    return "website";
  }

  // 2. YouTube Direct Search / Video / Song Play intent (plays inside Sajjat AI Internal YouTube Player)
  if (
    /(ভিডিও|youtube|ইউটিউব|নাটক|টিউটোরিয়াল\s*ভিডিও|টিউটোরিয়াল\s*ভিডিও|হাইলাইটস|highlights|video\s*search|watch\s+video|ভিডিও\s*দেখান|ভিডিও\s*দাও|ভিডিও\s*খুঁজ)/i.test(
      q
    ) ||
    /(গানটি|গান|গজল|ওয়াজ|ওয়াজ|নাশিদ|কবিতা|সঙ্গীত|সংগীত|song|music|track).*(চালাও|চালান|বাজাও|বাজান|শোনাও|শোনান|দেখাও|দেখান|play|watch)/i.test(
      q
    ) ||
    /^(play|চালাও|বাজাও)\s+/i.test(q)
  ) {
    return "video";
  }

  // 3. Music / Audio / Podcast / Audiobook search intent (MP3 / Audio Library / Podcast)
  if (
    /(গানটি|গান\s*দেন|গান\s*দাও|গান\s*শোনা|গান\s*খুঁজ|সঙ্গীত|সংগীত|গজল|ওয়াজ|ওয়াজ|কবিতা\s*অডিও|পডকাস্ট|অডিওবুক|অডিও\s*খুঁজ|song|music|mp3|audio|podcast|audiobook|instrumental|listen\s+to)/i.test(
      q
    ) &&
    !/(ছবি|ভিডিও|video)/i.test(q)
  ) {
    return "audio";
  }

  // 4. Document / PDF / Research Paper intent
  if (
    /(pdf|পিডিএফ|রিসার্চ\s*পেপার|গবেষণাপত্র|research\s*paper|academic\s*paper|article\s*search|ডকুমেন্ট\s*খুঁজ|বই\s*খুঁজে\s*দিন|বইয়ের\s*pdf|নোটস\s*pdf|ebook|e-book|arxiv)/i.test(
      q
    )
  ) {
    return "document";
  }

  // 5. Image SEARCH intent (distinct from AI Image Generation)
  const isAiArtCreation =
    /(ছবি\s*(আঁকো|আঁক|এঁকে|বানাও|বানিয়ে|তৈরি)|draw|generate\s+(an?\s+)?image|create\s+(an?\s+)?(image|picture|art))/i.test(
      q
    );
  if (
    !isAiArtCreation &&
    /(ছবি\s*(খুঁজে|খুঁজুন|খোঁজ|দাও\s*ইন্টারনেট|সার্চ)|পোস্টার\s*খুঁজ|লোগো\s*খুঁজ|থাম্বনেইল|photo\s+of|photos\s+of|image\s+search|find\s+(a\s+)?(image|photo|picture|logo|poster|wallpaper|thumbnail)|search\s+(for\s+)?(images?|photos?|pictures?))/i.test(
      q
    )
  ) {
    return "image";
  }

  // 6. News / Live Current Events intent
  if (
    /(আজকের\s*খবর|সর্বশেষ\s*খবর|সংবাদ|ব্রেকিং\s*নিউজ|নিউজ|খেলাধুলার\s*খবর|খেলার\s*খবর|আজকের\s*খেলা|আজকের\s*দাম|সোনার\s*দাম|টাকার\s*রেট|আবহাওয়া|আবহাওয়া|breaking\s+news|latest\s+news|today'?s?\s+news|headlines|live\s+score|weather\s+today|match\s+score)/i.test(
      q
    )
  ) {
    return "news";
  }

  // 7. General Internet Search intent
  if (
    /(ইন্টারনেট\s*(থেকে|সার্চ)|গুগল\s*(কর|সার্চ)|সার্চ\s*কর|খুঁজে\s*দিন|খুঁজে\s*দাও|তথ্য\s*খুঁজ|search\s+(the\s+)?web|google\s+|latest\s+|current\s+price|দাম\s*কত|২০২[৫-৯]\s*সালের|বর্তমান\s*(প্রধানমন্ত্রী|রাষ্ট্রপতি|অধিনায়ক|মূল্য|অবস্থা))/i.test(
      lower
    )
  ) {
    return "web";
  }

  return "chat";
}

const SEARCH_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
];

async function generateResilientGemini(
  ai: GoogleGenAI,
  contents: string,
  config?: Record<string, any>
) {
  let lastErr: any = null;
  for (const model of SEARCH_GEMINI_MODELS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini search timeout")), 5500)
      );
      return await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          ...(config ? { config } : {}),
        }),
        timeoutPromise,
      ]);
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        break;
      }
    }
  }
  throw lastErr || new Error("Gemini search unavailable");
}

/**
 * Translate / extract clean search keywords using Gemini for multi-API search
 */
async function buildSearchKeywords(rawQuery: string, intent: UniversalSearchCategory): Promise<string> {
  const cleaned = rawQuery
    .replace(
      /(আমাকে|দয়া করে|প্লিজ|অনুগ্রহ করে|ইউটিউব\s*থেকে|ইউটিউব|গানটি|গান|ভিডিওটি|ভিডিও|ছবিটি|ছবি|পিডিএফ|ডকুমেন্ট|খুঁজে দিন|খুঁজে দাও|খুঁজুন|দেখান|দেখাও|শোনান|শোনাও|চালাও|চালান|দেন|দাও|দিন|করুন|চাই)/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  // If short English or already concise query, return right away
  if (!/[\u0980-\u09FF]/.test(cleaned) && cleaned.length >= 2) {
    return cleaned;
  }

  const ai = getGeminiClient();
  if (!ai) return cleaned || rawQuery;

  try {
    const res = await generateResilientGemini(
      ai,
      `Extract concise, high-signal search keywords (preserve song/artist/Bengali names OR add clean Latin transliteration for Bangla songs so music/search APIs match accurately, max 6 words, no quotes, no explanation) for search type "${intent}".

User request: "${rawQuery}"`
    );
    const out = (res.text || "").trim().replace(/^["']|["']$/g, "");
    if (out && out.length >= 2 && out.length < 120) {
      return out;
    }
  } catch {
    // fallback cleanly
  }
  return cleaned || rawQuery;
}

/**
 * 1. UNIVERSAL WEB & NEWS SEARCH (Gemini Google Search Grounding + Wikipedia + Optional Google CSE)
 */
async function searchWebOrNews(
  rawQuery: string,
  intent: "web" | "news"
): Promise<{
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
}> {
  const ai = getGeminiClient();
  const results: UniversalSearchResultItem[] = [];
  const sourcesUsed: string[] = [];
  let summaryMarkdown = "";

  // A. Google Search Grounding via Gemini
  if (ai) {
    try {
      trackApiCall("geminiGrounding");
      const todayIso = new Date().toISOString().slice(0, 10);
      const groundingPrompt = `Current date: ${todayIso}.
User query: "${rawQuery}"

Instructions:
1. Search the internet using Google Search and synthesize verified information across multiple reputable sources.
2. Answer clearly in Bengali (বাংলা), or English if the user wrote in English.
3. Explicitly mention publication dates and source names whenever available in the search results.
4. NEVER fabricate facts, numbers, dates, or URLs. If reliable information is unavailable from search results, explicitly state that verified information could not be found.`;

      const response = await generateResilientGemini(ai, groundingPrompt, {
        tools: [{ googleSearch: {} }],
      });

      if (response.text) {
        summaryMarkdown = response.text.trim();
        sourcesUsed.push("Google Search Grounding");
      }

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const seenUris = new Set<string>();
      for (const chunk of chunks) {
        const uri = chunk.web?.uri;
        const title = chunk.web?.title;
        if (uri && !seenUris.has(uri) && isSafePublicHttpUrl(uri)) {
          seenUris.add(uri);
          const domain = extractDomain(uri);
          results.push({
            id: `web_${results.length}_${Date.now()}`,
            category: intent,
            title: title || domain,
            description: `${domain} থেকে সংগৃহীত যাচাইকৃত ওয়েব সূত্র।`,
            sourceName: domain,
            originalUrl: uri,
            publishedAt: intent === "news" ? todayIso : undefined,
            downloadAllowed: false,
            fileType: intent === "news" ? "News Article" : "Web Result",
          });
        }
      }
    } catch (err: any) {
      recordError(intent, "Google Search Grounding", rawQuery, err?.message || "Grounding failed");
    }
  }

  // B. Optional Google Custom Search API (when configured in env)
  if (isKeyValid(process.env.GOOGLE_SEARCH_API_KEY) && isKeyValid(process.env.GOOGLE_SEARCH_CX)) {
    try {
      trackApiCall("googleCustomSearch");
      const cseUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
        process.env.GOOGLE_SEARCH_API_KEY!
      )}&cx=${encodeURIComponent(process.env.GOOGLE_SEARCH_CX!)}&q=${encodeURIComponent(rawQuery)}&num=6`;
      const cseRes = await fetchWithTimeout(cseUrl);
      if (cseRes.ok) {
        const cseData = (await cseRes.json()) as any;
        sourcesUsed.push("Google Custom Search API");
        for (const item of cseData.items || []) {
          if (item.link && !results.some((r) => r.originalUrl === item.link)) {
            const thumb = item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.metatags?.[0]?.["og:image"];
            const pubDate =
              item.pagemap?.metatags?.[0]?.["article:published_time"] ||
              item.pagemap?.metatags?.[0]?.["date"];
            results.push({
              id: `cse_${results.length}_${Date.now()}`,
              category: intent,
              title: item.title || item.displayLink,
              description: item.snippet || "",
              sourceName: item.displayLink || extractDomain(item.link),
              originalUrl: item.link,
              thumbnailUrl: thumb,
              publishedAt: pubDate ? String(pubDate).slice(0, 10) : undefined,
              downloadAllowed: false,
              fileType: intent === "news" ? "News" : "Web",
            });
          }
        }
      }
    } catch (err: any) {
      recordError(intent, "Google Custom Search", rawQuery, err?.message || "CSE error");
    }
  }

  // C. Google News RSS live verified feed (zero-quota reliable news source for today's headlines & topic news)
  if (intent === "news" && results.length < 4) {
    try {
      const isGeneralToday = /(আজকের\s*খবর|সর্বশেষ\s*খবর|today'?s?\s*news|latest\s*news|headlines)/i.test(rawQuery);
      const isBangla = /[\u0980-\u09FF]/.test(rawQuery);
      const cleanTopic = rawQuery
        .replace(/(আজকের|সর্বশেষ|খবর|সংবাদ|নিউজ|কী|কি|দাও|দিন|দেখান|news|latest|today)/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const rssUrl =
        isGeneralToday || cleanTopic.length < 2
          ? isBangla
            ? "https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn"
            : "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
          : `https://news.google.com/rss/search?q=${encodeURIComponent(cleanTopic)}&hl=${
              isBangla ? "bn&gl=BD&ceid=BD:bn" : "en-US&gl=US&ceid=US:en"
            }`;

      const rssRes = await fetchWithTimeout(rssUrl, {}, 5500);
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        if (items.length > 0) sourcesUsed.push("Google News");
        for (const itemXml of items.slice(0, 6)) {
          const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "")
            .replace(/<!\[CDATA\[|\]\]>/g, "")
            .trim();
          const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
          const pubRaw = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "").trim();
          const sourceName = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "Google News")
            .replace(/<!\[CDATA\[|\]\]>/g, "")
            .trim();
          if (!title || !link || results.some((r) => r.originalUrl === link)) continue;
          const pubFormatted = pubRaw ? new Date(pubRaw).toISOString().slice(0, 10) : undefined;
          results.push({
            id: `gnews_${results.length}_${Date.now()}`,
            category: "news",
            title,
            description: `${sourceName} কর্তৃক প্রকাশিত যাচাইকৃত সংবাদ।`,
            sourceName,
            originalUrl: link,
            publishedAt: pubFormatted,
            downloadAllowed: false,
            fileType: "Live News",
          });
        }
      }
    } catch {
      // non-fatal
    }
  }

  // D. Wikipedia enrichment for factual queries
  if (intent === "web" && results.length < 4) {
    try {
      trackApiCall("wikipedia");
      const wikiHost = /[\u0980-\u09FF]/.test(rawQuery) ? "bn.wikipedia.org" : "en.wikipedia.org";
      const wikiUrl = `https://${wikiHost}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        rawQuery
      )}&format=json&srlimit=3&utf8=1`;
      const wikiRes = await fetchWithTimeout(wikiUrl, {}, 5000);
      if (wikiRes.ok) {
        const wikiData = (await wikiRes.json()) as any;
        const hits = wikiData?.query?.search || [];
        if (hits.length > 0) sourcesUsed.push("Wikipedia");
        for (const hit of hits) {
          const pageUrl = `https://${wikiHost}/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`;
          if (!results.some((r) => r.originalUrl === pageUrl)) {
            results.push({
              id: `wiki_${hit.pageid}`,
              category: "web",
              title: hit.title,
              description: String(hit.snippet || "").replace(/<[^>]+>/g, ""),
              sourceName: wikiHost,
              originalUrl: pageUrl,
              publishedAt: hit.timestamp ? String(hit.timestamp).slice(0, 10) : undefined,
              downloadAllowed: false,
              licenseInfo: "CC BY-SA 4.0",
              fileType: "Encyclopedia",
            });
          }
        }
      }
    } catch {
      // ignore wikipedia non-fatal failure
    }
  }

  if (!summaryMarkdown && results.length === 0) {
    summaryMarkdown =
      "দুঃখিত, এই বিষয়ে কোনো নির্ভরযোগ্য বা যাচাইকৃত অনলাইন উৎস পাওয়া যায়নি। দয়া করে আরও স্পষ্ট কীওয়ার্ড দিয়ে চেষ্টা করুন।";
  } else if (!summaryMarkdown && results.length > 0) {
    if (intent === "news") {
      const headlines = results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. **${r.title}** (${r.sourceName}${r.publishedAt ? ` · ${r.publishedAt}` : ""})`)
        .join("\n");
      summaryMarkdown = `সর্বশেষ যাচাইকৃত সংবাদ শিরোনাম (${sourcesUsed.join(", ")}):\n\n${headlines}`;
    } else {
      summaryMarkdown = `"${rawQuery}" বিষয়ে ইন্টারনেট থেকে ${results.length}টি যাচাইকৃত ফলাফল পাওয়া গেছে। নিচে উৎস ও বিস্তারিত লিংক দেওয়া হলো:`;
    }
  }

  return {
    summaryMarkdown,
    results: results.slice(0, 10),
    sourcesUsed: Array.from(new Set(sourcesUsed)),
  };
}

/**
 * 2. UNIVERSAL VIDEO SEARCH (YouTube API / Grounded+oEmbed Verified YouTube + Dailymotion + Internet Archive)
 */
async function searchVideos(
  rawQuery: string,
  config: UniversalSearchAdminConfig
): Promise<{
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
}> {
  const results: UniversalSearchResultItem[] = [];
  const sourcesUsed: string[] = [];

  const youtubeSearchPhrase = rawQuery
    .replace(
      /(আমাকে|দয়া করে|প্লিজ|অনুগ্রহ করে|ইউটিউব\s*থেকে|ইউটিউব\s*এ|ইউটিউব|youtube\s*on|on\s*youtube|youtube|ভিডিও\s*টি|ভিডিওটি|ভিডিও|গান\s*টি|গানটি|গান\s*চালাও|চালাও|চালান|বাজাও|বাজান|দেখান|দেখাও|শোনাও|শোনান|খুঁজে দিন|খুঁজে দাও|খুঁজুন|দেন|দাও|দিন|\bplay\b|\bwatch\b|\bvideo\b)/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  const cleanYoutubeQuery =
    youtubeSearchPhrase.length >= 2
      ? youtubeSearchPhrase
      : await buildSearchKeywords(rawQuery, "video");

  // A. Official YouTube Data API v3 (if enabled & key configured)
  if (config.youtubeEnabled && isKeyValid(process.env.YOUTUBE_API_KEY)) {
    try {
      trackApiCall("youtubeApi");
      const ytKey = process.env.YOUTUBE_API_KEY!;
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=8&q=${encodeURIComponent(
        cleanYoutubeQuery
      )}&key=${encodeURIComponent(ytKey)}`;
      const sRes = await fetchWithTimeout(searchUrl);
      if (sRes.ok) {
        const sData = (await sRes.json()) as any;
        const ids = (sData.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
        if (ids.length > 0) {
          const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${ids.join(
            ","
          )}&key=${encodeURIComponent(ytKey)}`;
          const dRes = await fetchWithTimeout(detailUrl);
          if (dRes.ok) {
            const dData = (await dRes.json()) as any;
            sourcesUsed.push("YouTube Data API v3");
            for (const v of dData.items || []) {
              const embeddable = v.status?.embeddable !== false;
              results.push({
                id: `yt_${v.id}`,
                category: "video",
                title: v.snippet?.title || "YouTube Video",
                description: (v.snippet?.description || "").slice(0, 180),
                sourceName: "YouTube",
                youtubeVideoId: v.id,
                channelOrAuthor: v.snippet?.channelTitle || "YouTube Creator",
                thumbnailUrl:
                  v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url,
                duration: formatIsoDuration(v.contentDetails?.duration),
                publishedAt: v.snippet?.publishedAt ? v.snippet.publishedAt.slice(0, 10) : undefined,
                originalUrl: `https://www.youtube.com/watch?v=${v.id}`,
                embedUrl: embeddable
                  ? `https://www.youtube.com/embed/${v.id}?rel=0&enablejsapi=1`
                  : undefined,
                downloadAllowed: false,
                licenseInfo: "YouTube স্ট্রিমিং — ডাউনলোড কপিরাইট দ্বারা সীমিত",
                fileType: "YouTube Video",
              });
            }
          }
        }
      } else {
        const txt = await sRes.text();
        recordError("video", "YouTube Data API", rawQuery, `${sRes.status}: ${txt.slice(0, 160)}`);
      }
    } catch (err: any) {
      recordError("video", "YouTube Data API", rawQuery, err?.message || "YouTube API failure");
    }
  }

  // B. Verified YouTube Direct Search (parses YouTube search results & verifies embeddability via oEmbed)
  if (config.youtubeEnabled && results.length < 5) {
    try {
      trackApiCall("youtubeDirectSearch");
      const isSongReq = /(গান|song|music|gajal|গজল|নাশিদ|nasheed)/i.test(rawQuery);
      const effectiveYtQuery = isSongReq ? `${cleanYoutubeQuery} song` : cleanYoutubeQuery;
      const ytPageRes = await fetchWithTimeout(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(effectiveYtQuery)}&hl=en&gl=BD`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
        6500
      );
      if (ytPageRes.ok) {
        const html = await ytPageRes.text();
        const dataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
        if (dataMatch) {
          const ytData = JSON.parse(dataMatch[1]) as any;
          const sections =
            ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
              ?.contents || [];
          const candidates: Array<{
            videoId: string;
            title: string;
            channel: string;
            duration?: string;
            publishedAt?: string;
            thumb?: string;
          }> = [];
          for (const sec of sections) {
            for (const entry of sec?.itemSectionRenderer?.contents || []) {
              const vr = entry?.videoRenderer;
              if (!vr || !vr.videoId) continue;
              if (results.some((r) => r.id === `yt_${vr.videoId}`)) continue;
              if (candidates.some((c) => c.videoId === vr.videoId)) continue;
              candidates.push({
                videoId: String(vr.videoId),
                title: vr.title?.runs?.map((r: any) => r.text).join("") || "YouTube Video",
                channel: vr.ownerText?.runs?.map((r: any) => r.text).join("") || "YouTube Channel",
                duration: vr.lengthText?.simpleText || undefined,
                publishedAt: vr.publishedTimeText?.simpleText || undefined,
                thumb:
                  vr.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
                  `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
              });
              if (candidates.length >= 6) break;
            }
            if (candidates.length >= 6) break;
          }

          const verifiedCandidates = await Promise.all(
            candidates.map(async (c) => {
              try {
                trackApiCall("youtubeOembed");
                const watchUrl = `https://www.youtube.com/watch?v=${c.videoId}`;
                const oeRes = await fetchWithTimeout(
                  `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
                  {},
                  3500
                );
                if (!oeRes.ok) return null;
                const oe = (await oeRes.json()) as any;
                return {
                  id: `yt_${c.videoId}`,
                  category: "video" as const,
                  title: oe.title || c.title,
                  description: `চ্যানেল: ${oe.author_name || c.channel}${
                    c.duration ? ` · সময়কাল: ${c.duration}` : ""
                  }`,
                  sourceName: "YouTube",
                  youtubeVideoId: c.videoId,
                  channelOrAuthor: oe.author_name || c.channel,
                  thumbnailUrl: oe.thumbnail_url || c.thumb,
                  duration: c.duration,
                  publishedAt: c.publishedAt,
                  originalUrl: watchUrl,
                  embedUrl: `https://www.youtube.com/embed/${c.videoId}?rel=0&enablejsapi=1`,
                  downloadAllowed: false,
                  licenseInfo: "YouTube স্ট্রিমিং — ডাউনলোড কপিরাইট দ্বারা সীমিত",
                  fileType: "YouTube Video",
                };
              } catch {
                return null;
              }
            })
          );

          const validDirect = verifiedCandidates.filter(Boolean) as UniversalSearchResultItem[];
          if (validDirect.length > 0) {
            sourcesUsed.push("YouTube Search (Verified Embed)");
            results.push(...validDirect);
          }
        }
      }
    } catch (err: any) {
      recordError("video", "YouTube Direct Search", rawQuery, err?.message || "Direct search error");
    }
  }

  // C. Gemini Google Search Grounding + YouTube oEmbed secondary fallback if needed
  if (config.youtubeEnabled && results.length < 3) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        trackApiCall("geminiGrounding");
        const gRes = await generateResilientGemini(
          ai,
          `Find real, existing YouTube video watch URLs (youtube.com/watch?v=... or youtu.be/...) relevant to: "${cleanYoutubeQuery}". Include exact URLs from search results.`,
          { tools: [{ googleSearch: {} }] }
        );
        const candidateIds = new Set<string>();
        const collectIds = (text: string) => {
          const matches = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g) || [];
          for (const m of matches) {
            const idMatch = m.match(/([a-zA-Z0-9_-]{11})$/);
            if (idMatch) candidateIds.add(idMatch[1]);
          }
        };
        if (gRes.text) collectIds(gRes.text);
        for (const c of gRes.candidates?.[0]?.groundingMetadata?.groundingChunks || []) {
          if (c.web?.uri) collectIds(c.web.uri);
        }

        const toVerify = Array.from(candidateIds).slice(0, 6);
        const verified = await Promise.all(
          toVerify.map(async (vid) => {
            if (results.some((r) => r.id === `yt_${vid}`)) return null;
            try {
              trackApiCall("youtubeOembed");
              const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
              const oeRes = await fetchWithTimeout(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
                {},
                4000
              );
              if (!oeRes.ok) return null;
              const oe = (await oeRes.json()) as any;
              return {
                id: `yt_${vid}`,
                category: "video" as const,
                title: oe.title || "YouTube Video",
                description: `চ্যানেল: ${oe.author_name || "YouTube"} — যাচাইকৃত এম্বেডযোগ্য ভিডিও।`,
                sourceName: "YouTube",
                youtubeVideoId: vid,
                channelOrAuthor: oe.author_name,
                thumbnailUrl: oe.thumbnail_url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                originalUrl: watchUrl,
                embedUrl: `https://www.youtube.com/embed/${vid}?rel=0&enablejsapi=1`,
                downloadAllowed: false,
                licenseInfo: "YouTube স্ট্রিমিং — ডাউনলোড কপিরাইট দ্বারা সীমিত",
                fileType: "YouTube Video",
              };
            } catch {
              return null;
            }
          })
        );
        const validYt = verified.filter(Boolean) as UniversalSearchResultItem[];
        if (validYt.length > 0) {
          sourcesUsed.push("YouTube (Grounded oEmbed)");
          results.push(...validYt);
        }
      } catch (err: any) {
        recordError("video", "YouTube Discovery", rawQuery, err?.message || "Discovery failed");
      }
    }
  }

  // D. Dailymotion Public API (only needed when YouTube returned fewer than 5 results)
  if (results.length < 5) {
    const searchTerms = await buildSearchKeywords(rawQuery, "video");
    try {
      trackApiCall("dailymotion");
      const dmUrl = `https://api.dailymotion.com/videos?search=${encodeURIComponent(
        searchTerms
      )}&fields=id,title,thumbnail_480_url,duration,owner.screenname,url,embed_url,created_time&limit=4`;
      const dmRes = await fetchWithTimeout(dmUrl, {}, 4000);
      if (dmRes.ok) {
        const dmData = (await dmRes.json()) as any;
        const list = dmData?.list || [];
        if (list.length > 0) sourcesUsed.push("Dailymotion");
        for (const item of list) {
          results.push({
            id: `dm_${item.id}`,
            category: "video",
            title: item.title,
            description: `Dailymotion-এ প্রকাশিত যাচাইকৃত ভিডিও।`,
            sourceName: "Dailymotion",
            channelOrAuthor: item["owner.screenname"] || "Dailymotion Channel",
            thumbnailUrl: item.thumbnail_480_url,
            duration: formatSeconds(item.duration),
            publishedAt: item.created_time
              ? new Date(item.created_time * 1000).toISOString().slice(0, 10)
              : undefined,
            originalUrl: item.url,
            embedUrl: item.embed_url || `https://www.dailymotion.com/embed/video/${item.id}`,
            downloadAllowed: false,
            licenseInfo: "স্ট্রিমিং ও এম্বেড অনুমোদিত",
            fileType: "Video Stream",
          });
        }
      }
    } catch (err: any) {
      recordError("video", "Dailymotion", rawQuery, err?.message || "Dailymotion unavailable");
    }

    // E. Internet Archive Open Video (only when results are still < 4)
    if (results.length < 4) {
      try {
        trackApiCall("internetArchive");
        const iaQuery = `(${searchTerms}) AND mediatype:(movies)`;
        const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
          iaQuery
        )}&fl[]=identifier,title,description,creator,publicdate,licenseurl&rows=3&output=json`;
        const iaRes = await fetchWithTimeout(iaUrl, {}, 4000);
        if (iaRes.ok) {
          const iaData = (await iaRes.json()) as any;
          const docs = iaData?.response?.docs || [];
          if (docs.length > 0) sourcesUsed.push("Internet Archive (Open License)");
          await Promise.all(
            docs.map(async (doc: any) => {
              const id = doc.identifier;
              let mp4Url: string | undefined;
              try {
                const metaRes = await fetchWithTimeout(
                  `https://archive.org/metadata/${encodeURIComponent(id)}/files`,
                  {},
                  2500
                );
                if (metaRes.ok) {
                  const metaJson = (await metaRes.json()) as any;
                  const mp4File =
                    (metaJson.result || []).find(
                      (f: any) => f.name && /\.mp4$/i.test(f.name) && !f.name.includes("_512kb")
                    ) || (metaJson.result || []).find((f: any) => f.name && /\.mp4$/i.test(f.name));
                  if (mp4File?.name) {
                    mp4Url = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(
                      mp4File.name
                    )}`;
                  }
                }
              } catch {
                // ignore
              }
              const canDownload = Boolean(config.downloadPermissionEnabled && mp4Url);
              results.push({
                id: `ia_vid_${id}`,
                category: "video",
                title: Array.isArray(doc.title) ? doc.title[0] : doc.title || id,
                description: String(
                  Array.isArray(doc.description)
                    ? doc.description[0]
                    : doc.description || "ওপেন লাইসেন্স আর্কাইভ ভিডিও"
                )
                  .replace(/<[^>]+>/g, "")
                  .slice(0, 180),
                sourceName: "Internet Archive",
                channelOrAuthor: Array.isArray(doc.creator)
                  ? doc.creator[0]
                  : doc.creator || "Archive Contributor",
                thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
                publishedAt: doc.publicdate ? String(doc.publicdate).slice(0, 10) : undefined,
                originalUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
                playableVideoUrl: mp4Url,
                downloadAllowed: canDownload,
                downloadUrl: canDownload ? mp4Url : undefined,
                licenseInfo: doc.licenseurl ? "Creative Commons / Open Archive" : "Public Archive",
                fileType: mp4Url ? "MP4 Video" : "Archive Video",
              });
            })
          );
        }
      } catch {
        // non-fatal
      }
    }
  }

  // Attach Related Videos list using shallow copies (never circular references)
  if (results.length > 1) {
    const flatSnapshots = results.map(({ relatedVideos: _omit, ...plain }) => plain);
    results.forEach((item, idx) => {
      item.relatedVideos = flatSnapshots
        .filter((_, j) => j !== idx)
        .slice(0, 4)
        .map((snap) => ({ ...snap }));
    });
  }

  const notice =
    "কপিরাইট নীতি অনুযায়ী YouTube ও Dailymotion ভিডিও সরাসরি Sajjat AI প্লেয়ারে চালানো যাবে, তবে অনুমতি ছাড়া ডাউনলোড করা যাবে না। ওপেন-লাইসেন্স ভিডিওর ক্ষেত্রে ডাউনলোড বাটন সক্রিয় থাকবে।";

  const summaryMarkdown =
    results.length > 0
      ? `"${rawQuery}" অনুসন্ধানের জন্য **${results.length}টি যাচাইকৃত ভিডিও** পাওয়া গেছে (${sourcesUsed.join(", ")})। নিচে **চালান (Play)** বাটনে ক্লিক করে সরাসরি ভিডিও দেখতে এবং Related Videos ব্রাউজ করতে পারেন।`
      : `দুঃখিত, "${rawQuery}"-এর জন্য কোনো প্লেযোগ্য যাচাইকৃত ভিডিও খুঁজে পাওয়া যায়নি। ভিন্ন কীওয়ার্ড দিয়ে পুনরায় চেষ্টা করুন।`;

  return {
    summaryMarkdown,
    results: results.slice(0, 10),
    sourcesUsed: Array.from(new Set(sourcesUsed)),
    notice,
  };
}

/**
 * 3. UNIVERSAL AUDIO & MUSIC SEARCH (iTunes Music/Podcast/Audiobook + Deezer + Internet Archive Open Audio)
 */
async function searchAudio(
  rawQuery: string,
  config: UniversalSearchAdminConfig
): Promise<{
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
}> {
  const audioPhrase = rawQuery
    .replace(
      /(আমাকে|দয়া করে|প্লিজ|অনুগ্রহ করে|গানটি|গান|অডিওটি|অডিও|পডকাস্ট|অডিওবুক|খুঁজে দিন|খুঁজে দাও|খুঁজুন|শোনান|শোনাও|দেন|দাও|দিন|করুন)/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  const searchTerms =
    audioPhrase.length >= 2 ? audioPhrase : await buildSearchKeywords(rawQuery, "audio");
  const results: UniversalSearchResultItem[] = [];
  const sourcesUsed: string[] = [];

  const isPodcast = /(podcast|পডকাস্ট)/i.test(rawQuery);
  const isAudiobook = /(audiobook|অডিওবুক|অডিও বই|গল্পের অডিও)/i.test(rawQuery);
  const itunesMedia = isPodcast ? "podcast" : isAudiobook ? "audiobook" : "music";

  // A & B. Run iTunes Official Search + Deezer Music Search concurrently for low latency
  const runItunes = async () => {
    try {
      trackApiCall("itunes");
      const trimmedVariants = Array.from(
        new Set([
          searchTerms,
          searchTerms.replace(/^(হে|ওহে|একটা|একটি)\s+/i, "").trim(),
        ].filter((q) => q.length >= 2))
      );
      for (const qTerm of trimmedVariants) {
        const itUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
          qTerm
        )}&media=${itunesMedia}&limit=6`;
        const itRes = await fetchWithTimeout(itUrl, {}, 4000);
        if (itRes.ok) {
          const itData = (await itRes.json()) as any;
          const items = itData?.results || [];
          if (items.length > 0 && !sourcesUsed.includes("Apple Music / iTunes")) {
            sourcesUsed.push("Apple Music / iTunes");
          }
          for (const item of items) {
            const origUrl = item.trackViewUrl || item.collectionViewUrl;
            if (!origUrl || results.some((r) => r.originalUrl === origUrl)) continue;
            const art = item.artworkUrl100
              ? String(item.artworkUrl100).replace("100x100bb", "600x600bb")
              : undefined;
            results.push({
              id: `itunes_${item.trackId || item.collectionId}_${results.length}`,
              category: "audio",
              title: item.trackName || item.collectionName || "Audio Track",
              description: `${item.artistName || "Unknown Artist"}${
                item.collectionName ? ` • অ্যালবাম: ${item.collectionName}` : ""
              }`,
              sourceName: isPodcast ? "Apple Podcasts" : isAudiobook ? "Apple Books Audio" : "Apple Music / iTunes",
              channelOrAuthor: item.artistName || "Artist",
              thumbnailUrl: art,
              duration: item.trackTimeMillis ? formatSeconds(item.trackTimeMillis / 1000) : undefined,
              publishedAt: item.releaseDate ? String(item.releaseDate).slice(0, 10) : undefined,
              originalUrl: origUrl,
              playableAudioUrl: item.previewUrl || undefined,
              previewOnly: Boolean(item.previewUrl),
              downloadAllowed: false,
              licenseInfo: item.previewUrl
                ? "অফিশিয়াল প্রিভিউ স্ট্রিম — পূর্ণ অডিও মূল প্ল্যাটফর্মে শুনুন"
                : "মূল প্ল্যাটফর্মে শুনুন",
              fileType: isPodcast ? "Podcast" : isAudiobook ? "Audiobook" : "Music Track",
            });
          }
          if (items.length > 0) break;
        }
      }
    } catch (err: any) {
      recordError("audio", "iTunes Search", rawQuery, err?.message || "iTunes error");
    }
  };

  const runDeezer = async () => {
    if (isPodcast || isAudiobook) return;
    try {
      trackApiCall("deezer");
      const cleanDzTerm = searchTerms.replace(/^(হে|ওহে|একটা|একটি)\s+/i, "").trim() || searchTerms;
      const dzUrl = `https://api.deezer.com/search?q=${encodeURIComponent(cleanDzTerm)}&limit=5`;
      const dzRes = await fetchWithTimeout(dzUrl, {}, 4000);
      if (dzRes.ok) {
        const dzData = (await dzRes.json()) as any;
        const tracks = dzData?.data || [];
        if (tracks.length > 0) sourcesUsed.push("Deezer Music");
        for (const t of tracks) {
          if (!t.link || results.some((r) => r.originalUrl === t.link)) continue;
          results.push({
            id: `dz_${t.id}`,
            category: "audio",
            title: t.title,
            description: `${t.artist?.name || "Artist"} • ${t.album?.title || "Single"}`,
            sourceName: "Deezer",
            channelOrAuthor: t.artist?.name || "Artist",
            thumbnailUrl: t.album?.cover_big || t.album?.cover_medium,
            duration: formatSeconds(t.duration),
            originalUrl: t.link,
            playableAudioUrl: t.preview || undefined,
            previewOnly: Boolean(t.preview),
            downloadAllowed: false,
            licenseInfo: "৩০ সেকেন্ড অনুমোদিত প্রিভিউ (কপিরাইট সুরক্ষিত)",
            fileType: "Music Preview",
          });
        }
      }
    } catch (err: any) {
      recordError("audio", "Deezer API", rawQuery, err?.message || "Deezer error");
    }
  };

  await Promise.all([runItunes(), runDeezer()]);

  // C. Internet Archive Open Audio (Full tracks, speeches, audiobooks, instrumentals — only if < 4 tracks found)
  if (results.length < 4) {
    try {
      trackApiCall("internetArchive");
      const iaAudioQ = `(${searchTerms}) AND mediatype:(audio)`;
      const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
        iaAudioQ
      )}&fl[]=identifier,title,creator,description,publicdate,licenseurl&rows=4&output=json`;
      const iaRes = await fetchWithTimeout(iaUrl, {}, 4000);
      if (iaRes.ok) {
        const iaData = (await iaRes.json()) as any;
        const docs = iaData?.response?.docs || [];
        if (docs.length > 0) sourcesUsed.push("Internet Archive Open Audio");
        await Promise.all(
          docs.map(async (doc: any) => {
            const id = doc.identifier;
            let mp3Url: string | undefined;
            let duration: string | undefined;
            try {
              const metaRes = await fetchWithTimeout(
                `https://archive.org/metadata/${encodeURIComponent(id)}/files`,
                {},
                2500
              );
              if (metaRes.ok) {
                const meta = (await metaRes.json()) as any;
                const audioFile = (meta.result || []).find(
                  (f: any) => f.name && /\.(mp3|ogg|m4a)$/i.test(f.name)
                );
                if (audioFile?.name) {
                  mp3Url = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(
                    audioFile.name
                  )}`;
                  if (audioFile.length && !Number.isNaN(Number(audioFile.length))) {
                    duration = formatSeconds(Number(audioFile.length));
                  }
                }
              }
            } catch {
              // ignore
            }
            const canDownload = Boolean(config.downloadPermissionEnabled && mp3Url);
            results.push({
              id: `ia_aud_${id}`,
              category: "audio",
              title: Array.isArray(doc.title) ? doc.title[0] : doc.title || id,
              description: String(
                Array.isArray(doc.description) ? doc.description[0] : doc.description || "ওপেন লাইসেন্স অডিও"
              )
                .replace(/<[^>]+>/g, "")
                .slice(0, 160),
              sourceName: "Internet Archive Audio",
              channelOrAuthor: Array.isArray(doc.creator) ? doc.creator[0] : doc.creator || "Archive Creator",
              thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
              duration,
              publishedAt: doc.publicdate ? String(doc.publicdate).slice(0, 10) : undefined,
              originalUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
              playableAudioUrl: mp3Url,
              previewOnly: false,
              downloadAllowed: canDownload,
              downloadUrl: canDownload ? mp3Url : undefined,
              licenseInfo: "Creative Commons / Public Domain — ফ্রি স্ট্রিমিং ও ডাউনলোড অনুমোদিত",
              fileType: "Open License Audio",
            });
          })
        );
      }
    } catch {
      // non-fatal
    }
  }

  // D. Grounded web lookup if user asked about song info/lyrics or no playable tracks returned
  let extraInfo = "";
  if (results.length === 0) {
    const webFallback = await searchWebOrNews(rawQuery, "web");
    extraInfo = webFallback.summaryMarkdown;
    results.push(...webFallback.results.slice(0, 4));
    sourcesUsed.push(...webFallback.sourcesUsed);
  }

  const notice =
    "কপিরাইট সুরক্ষিত বাণিজ্যিক গানের ক্ষেত্রে অনুমোদিত প্রিভিউ ও মূল প্ল্যাটফর্মের লিংক দেওয়া হয়েছে; ওপেন-লাইসেন্স / পাবলিক ডোমেইন অডিও সরাসরি ডাউনলোড করা যাবে।";

  const summaryMarkdown =
    extraInfo ||
    (results.length > 0
      ? `"${rawQuery}"-এর জন্য **${results.length}টি অডিও/মিউজিক ফলাফল** পাওয়া গেছে (${sourcesUsed.join(
          ", "
        )})। নিচের প্লেয়ার দিয়ে সরাসরি শুনতে, Favorite বা Playlist-এ যুক্ত করতে পারবেন।`
      : `দুঃখিত, "${rawQuery}" অনুযায়ী কোনো অডিও খুঁজে পাওয়া যায়নি।`);

  return {
    summaryMarkdown,
    results: results.slice(0, 10),
    sourcesUsed: Array.from(new Set(sourcesUsed)),
    notice,
  };
}

/**
 * 4. IMAGE SEARCH (Wikimedia Commons + Optional Pexels / Pixabay / Google Custom Search)
 */
async function searchImages(
  rawQuery: string,
  config: UniversalSearchAdminConfig
): Promise<{
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
}> {
  const searchTerms = await buildSearchKeywords(rawQuery, "image");
  const results: UniversalSearchResultItem[] = [];
  const sourcesUsed: string[] = [];

  // A. Optional Pexels API
  if (isKeyValid(process.env.PEXELS_API_KEY)) {
    try {
      trackApiCall("pexels");
      const pRes = await fetchWithTimeout(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=6`,
        { headers: { Authorization: process.env.PEXELS_API_KEY! } },
        5000
      );
      if (pRes.ok) {
        const pData = (await pRes.json()) as any;
        if ((pData.photos || []).length > 0) sourcesUsed.push("Pexels");
        for (const p of pData.photos || []) {
          const dl = p.src?.large2x || p.src?.original;
          results.push({
            id: `pexels_${p.id}`,
            category: "image",
            title: p.alt || searchTerms,
            description: `ফটোগ্রাফার: ${p.photographer}`,
            sourceName: "Pexels",
            channelOrAuthor: p.photographer,
            thumbnailUrl: p.src?.medium || p.src?.large,
            originalUrl: p.url,
            downloadAllowed: Boolean(config.downloadPermissionEnabled && dl),
            downloadUrl: config.downloadPermissionEnabled ? dl : undefined,
            licenseInfo: "Pexels Free License",
            fileType: "Photo",
          });
        }
      }
    } catch (err: any) {
      recordError("image", "Pexels", rawQuery, err?.message || "Pexels error");
    }
  }

  // B. Optional Pixabay API
  if (isKeyValid(process.env.PIXABAY_API_KEY)) {
    try {
      trackApiCall("pixabay");
      const pxRes = await fetchWithTimeout(
        `https://pixabay.com/api/?key=${encodeURIComponent(
          process.env.PIXABAY_API_KEY!
        )}&q=${encodeURIComponent(searchTerms)}&per_page=6&safesearch=true`,
        {},
        5000
      );
      if (pxRes.ok) {
        const pxData = (await pxRes.json()) as any;
        if ((pxData.hits || []).length > 0) sourcesUsed.push("Pixabay");
        for (const h of pxData.hits || []) {
          const dl = h.largeImageURL || h.webformatURL;
          results.push({
            id: `pixabay_${h.id}`,
            category: "image",
            title: h.tags || searchTerms,
            description: `Pixabay গ্রাফিক্স/ছবি • আপলোডার: ${h.user}`,
            sourceName: "Pixabay",
            channelOrAuthor: h.user,
            thumbnailUrl: h.webformatURL,
            originalUrl: h.pageURL,
            downloadAllowed: Boolean(config.downloadPermissionEnabled && dl),
            downloadUrl: config.downloadPermissionEnabled ? dl : undefined,
            licenseInfo: "Pixabay Content License (Free Download)",
            fileType: "Image / Graphic",
          });
        }
      }
    } catch (err: any) {
      recordError("image", "Pixabay", rawQuery, err?.message || "Pixabay error");
    }
  }

  // C. Wikimedia Commons API (Verified Creative Commons & Public Domain Images)
  try {
    trackApiCall("wikimediaCommons");
    const wmUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      searchTerms
    )}&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=720&format=json`;
    const wmRes = await fetchWithTimeout(wmUrl, {}, 6000);
    if (wmRes.ok) {
      const wmData = (await wmRes.json()) as any;
      const pages = Object.values(wmData?.query?.pages || {}) as any[];
      const validPages = pages.filter((p) => {
        const info = p.imageinfo?.[0];
        const mime = info?.mime || "";
        return info?.thumburl && (mime.startsWith("image/") && !mime.includes("tiff"));
      });
      if (validPages.length > 0) sourcesUsed.push("Wikimedia Commons");
      for (const p of validPages.slice(0, 8)) {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        const cleanTitle = String(p.title || "")
          .replace(/^File:/, "")
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/_/g, " ");
        const licenseShort = meta.LicenseShortName?.value || "Creative Commons / Wikimedia";
        const artist = String(meta.Artist?.value || "Wikimedia Contributor").replace(/<[^>]+>/g, "").trim();
        const isFreeLicense = /cc|public domain|pd|gpl|mit|free/i.test(licenseShort);
        const canDownload = Boolean(config.downloadPermissionEnabled && isFreeLicense && info.url);

        results.push({
          id: `wm_${p.pageid}`,
          category: "image",
          title: cleanTitle || searchTerms,
          description: `লাইসেন্স: ${licenseShort}${artist ? ` • উৎস/শিল্পী: ${artist.slice(0, 60)}` : ""}`,
          sourceName: "Wikimedia Commons",
          channelOrAuthor: artist.slice(0, 60),
          thumbnailUrl: info.thumburl || info.url,
          originalUrl: info.descriptionurl || info.url,
          downloadAllowed: canDownload,
          downloadUrl: canDownload ? info.url : undefined,
          licenseInfo: licenseShort,
          fileType: "Licensed Image",
        });
      }
    }
  } catch (err: any) {
    recordError("image", "Wikimedia Commons", rawQuery, err?.message || "Wikimedia error");
  }

  const summaryMarkdown =
    results.length > 0
      ? `"${rawQuery}"-এর জন্য **${results.length}টি অনুমোদিত ও লাইসেন্সপ্রাপ্ত ছবি** পাওয়া গেছে (${sourcesUsed.join(
          ", "
        )})। লাইসেন্স অনুযায়ী ছবিগুলোর মূল উৎস দেখতে বা ডাউনলোড করতে পারেন।`
      : `দুঃখিত, "${rawQuery}" অনুযায়ী অনুমোদিত ইমেজ উৎসে কোনো ছবি পাওয়া যায়নি।`;

  return {
    summaryMarkdown,
    results: results.slice(0, 10),
    sourcesUsed: Array.from(new Set(sourcesUsed)),
  };
}

/**
 * 5. DOCUMENT & PDF SEARCH (arXiv + OpenAlex Open Access + Open Library + Internet Archive Texts)
 */
async function searchDocuments(
  rawQuery: string,
  config: UniversalSearchAdminConfig
): Promise<{
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
}> {
  const searchTerms = await buildSearchKeywords(rawQuery, "document");
  const results: UniversalSearchResultItem[] = [];
  const sourcesUsed: string[] = [];

  // A. OpenAlex Open-Access Research Papers & Educational Resources
  try {
    trackApiCall("openAlex");
    const oaUrl = `https://api.openalex.org/works?search=${encodeURIComponent(
      searchTerms
    )}&filter=is_oa:true&per-page=5`;
    const oaRes = await fetchWithTimeout(oaUrl, {}, 5500);
    if (oaRes.ok) {
      const oaData = (await oaRes.json()) as any;
      const works = oaData?.results || [];
      if (works.length > 0) sourcesUsed.push("OpenAlex Research");
      for (const w of works) {
        const pdfUrl = w.open_access?.oa_url || w.best_oa_location?.pdf_url || w.primary_location?.pdf_url;
        const landingUrl = w.primary_location?.landing_page_url || w.doi || pdfUrl || w.id;
        if (!landingUrl) continue;
        const authors = (w.authorships || [])
          .slice(0, 3)
          .map((a: any) => a.author?.display_name)
          .filter(Boolean)
          .join(", ");
        const isDirectPdf = Boolean(pdfUrl && /\.pdf(\?|$)/i.test(pdfUrl));
        const canDownload = Boolean(config.downloadPermissionEnabled && pdfUrl && isOpenLicenseDownloadHost(pdfUrl));

        results.push({
          id: `oa_${String(w.id).split("/").pop()}`,
          category: "document",
          title: w.title || "Research Paper",
          description: `${authors ? `লেখক: ${authors} • ` : ""}${
            w.primary_location?.source?.display_name || "Open Access Journal"
          }`,
          sourceName: w.primary_location?.source?.display_name || "OpenAlex",
          channelOrAuthor: authors || "Academic Author",
          publishedAt: w.publication_year ? String(w.publication_year) : undefined,
          originalUrl: landingUrl,
          downloadAllowed: canDownload,
          downloadUrl: canDownload ? pdfUrl : undefined,
          licenseInfo: "Open Access Academic Resource",
          fileType: isDirectPdf ? "PDF Research Paper" : "Research Article",
        });
      }
    }
  } catch (err: any) {
    recordError("document", "OpenAlex", rawQuery, err?.message || "OpenAlex error");
  }

  // B. arXiv Research PDFs
  try {
    trackApiCall("arxiv");
    const axUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      searchTerms
    )}&max_results=4`;
    const axRes = await fetchWithTimeout(axUrl, {}, 5500);
    if (axRes.ok) {
      const xml = await axRes.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      if (entries.length > 0) sourcesUsed.push("arXiv.org");
      for (const entry of entries) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
        const pubMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
        const authorMatches = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim());
        const absUrl = idMatch?.[1]?.trim();
        if (!absUrl) continue;
        const pdfUrl = absUrl.replace("/abs/", "/pdf/") + ".pdf";
        const canDownload = Boolean(config.downloadPermissionEnabled);

        results.push({
          id: `arxiv_${absUrl.split("/").pop()}`,
          category: "document",
          title: (titleMatch?.[1] || "arXiv Paper").replace(/\s+/g, " ").trim(),
          description: (summaryMatch?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 200) + "...",
          sourceName: "arXiv.org",
          channelOrAuthor: authorMatches.slice(0, 3).join(", "),
          publishedAt: pubMatch?.[1]?.slice(0, 10),
          originalUrl: absUrl,
          downloadAllowed: canDownload,
          downloadUrl: canDownload ? pdfUrl : undefined,
          licenseInfo: "arXiv Open Access PDF",
          fileType: "PDF Paper",
        });
      }
    }
  } catch (err: any) {
    recordError("document", "arXiv", rawQuery, err?.message || "arXiv error");
  }

  // C. Internet Archive Open Books / PDFs (`mediatype:texts`)
  try {
    trackApiCall("internetArchive");
    const iaDocQ = `(${searchTerms}) AND mediatype:(texts)`;
    const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      iaDocQ
    )}&fl[]=identifier,title,creator,description,publicdate&rows=4&output=json`;
    const iaRes = await fetchWithTimeout(iaUrl, {}, 5000);
    if (iaRes.ok) {
      const iaData = (await iaRes.json()) as any;
      const docs = iaData?.response?.docs || [];
      if (docs.length > 0) sourcesUsed.push("Internet Archive Books");
      for (const doc of docs) {
        const id = doc.identifier;
        let pdfUrl: string | undefined;
        try {
          const metaRes = await fetchWithTimeout(
            `https://archive.org/metadata/${encodeURIComponent(id)}/files`,
            {},
            3500
          );
          if (metaRes.ok) {
            const meta = (await metaRes.json()) as any;
            const pdfFile = (meta.result || []).find((f: any) => f.name && /\.pdf$/i.test(f.name));
            if (pdfFile?.name) {
              pdfUrl = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(
                pdfFile.name
              )}`;
            }
          }
        } catch {
          // ignore
        }
        const canDownload = Boolean(config.downloadPermissionEnabled && pdfUrl);
        results.push({
          id: `ia_doc_${id}`,
          category: "document",
          title: Array.isArray(doc.title) ? doc.title[0] : doc.title || id,
          description: String(
            Array.isArray(doc.description) ? doc.description[0] : doc.description || "ওপেন অ্যাক্সেস বই / PDF ডকুমেন্ট"
          )
            .replace(/<[^>]+>/g, "")
            .slice(0, 170),
          sourceName: "Internet Archive Library",
          channelOrAuthor: Array.isArray(doc.creator) ? doc.creator[0] : doc.creator || "Author",
          thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          publishedAt: doc.publicdate ? String(doc.publicdate).slice(0, 10) : undefined,
          originalUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
          downloadAllowed: canDownload,
          downloadUrl: canDownload ? pdfUrl : undefined,
          licenseInfo: pdfUrl ? "Open Access Archive PDF" : "Online Reader Only",
          fileType: pdfUrl ? "PDF Book" : "Digital Book",
        });
      }
    }
  } catch {
    // non-fatal
  }

  // D. Grounded web document search if results are still sparse
  let groundedSummary = "";
  if (results.length < 3) {
    const webDoc = await searchWebOrNews(`${rawQuery} filetype:pdf OR "free pdf"`, "web");
    groundedSummary = webDoc.summaryMarkdown;
    for (const r of webDoc.results) {
      if (!results.some((x) => x.originalUrl === r.originalUrl)) {
        results.push({ ...r, category: "document", fileType: "Web Document / Resource" });
      }
    }
    sourcesUsed.push(...webDoc.sourcesUsed);
  }

  const summaryMarkdown =
    groundedSummary ||
    (results.length > 0
      ? `"${rawQuery}"-এর জন্য **${results.length}টি ডকুমেন্ট, বই ও গবেষণাপত্র** পাওয়া গেছে (${sourcesUsed.join(
          ", "
        )})। অনুমোদিত ওপেন-অ্যাক্সেস PDF ফাইল সরাসরি দেখা ও ডাউনলোড করা যাবে।`
      : `দুঃখিত, "${rawQuery}" অনুযায়ী কোনো ওপেন-অ্যাক্সেস PDF বা ডকুমেন্ট পাওয়া যায়নি।`);

  return {
    summaryMarkdown,
    results: results.slice(0, 10),
    sourcesUsed: Array.from(new Set(sourcesUsed)),
  };
}

/**
 * 6. PUBLIC WEBSITE ANALYSIS (Never bypasses login/paywall; uses public fetch + Gemini urlContext)
 */
async function analyzePublicWebsite(rawQuery: string): Promise<{
  summaryMarkdown: string;
  results: UniversalSearchResultItem[];
  sourcesUsed: string[];
  notice?: string;
}> {
  const urls = extractUrls(rawQuery);
  if (urls.length === 0) {
    // No explicit URL in prompt — run grounded search to identify the site cleanly
    const web = await searchWebOrNews(rawQuery, "web");
    return {
      ...web,
      notice: "নির্দিষ্ট ওয়েবসাইট বিশ্লেষণ করতে সম্পূর্ণ URL (যেমন https://example.com) দিলে আরও নিখুঁত বিশ্লেষণ করা যাবে।",
    };
  }

  const targetUrl = urls[0];
  const domain = extractDomain(targetUrl);
  const sourcesUsed: string[] = [];
  let pageTitle = domain;
  let pageDesc = "";
  let ogImage: string | undefined;
  let pubDate: string | undefined;
  let extractedBody = "";
  let restrictedNotice: string | undefined;

  // Attempt safe public fetch
  try {
    trackApiCall("websiteFetch");
    const pageRes = await fetchWithTimeout(targetUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });

    if (pageRes.status === 401 || pageRes.status === 402 || pageRes.status === 403) {
      restrictedNotice = `এই ওয়েবসাইটটি (${domain}) HTTP ${pageRes.status} দ্বারা সুরক্ষিত বা পেইড/লগইন সীমাবদ্ধতা দিয়ে সীমিত। নিরাপত্তা ও নীতিমালা অনুযায়ী কোনো লগইন বা পে-ওয়াল বাইপাস করা হয়নি।`;
    } else if (!pageRes.ok) {
      restrictedNotice = `ওয়েবসাইট (${domain}) থেকে তথ্য পাওয়া যায়নি (HTTP ${pageRes.status})।`;
    } else {
      const contentType = pageRes.headers.get("content-type") || "";
      const rawText = await pageRes.text();
      sourcesUsed.push(domain);

      if (contentType.includes("html")) {
        const titleM = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleM) pageTitle = titleM[1].replace(/\s+/g, " ").trim();

        const descM =
          rawText.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
          rawText.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
        if (descM) pageDesc = descM[1].trim();

        const imgM = rawText.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (imgM && isSafePublicHttpUrl(imgM[1])) ogImage = imgM[1];

        const dateM =
          rawText.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
          rawText.match(/<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i);
        if (dateM) pubDate = dateM[1].slice(0, 10);

        extractedBody = rawText
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000);
      } else {
        extractedBody = rawText.slice(0, 10000);
      }
    }
  } catch (err: any) {
    recordError("website", domain, targetUrl, err?.message || "Fetch timeout/error");
    restrictedNotice = `${domain}-এ সরাসরি সংযোগ করা যায়নি (${err?.message || "Connection restricted"})।`;
  }

  let summaryMarkdown = "";
  const ai = getGeminiClient();

  if (ai && !restrictedNotice) {
    try {
      trackApiCall("geminiGrounding");
      const response = await generateResilientGemini(
        ai,
        `Analyze this public webpage concisely in Bengali (or English if user wrote in English).
User request: "${rawQuery}"
URL: ${targetUrl}
Page Title: ${pageTitle}
Meta Description: ${pageDesc}
Extracted Public Content:
${extractedBody.slice(0, 6500)}

Rules:
- Summarize key points, purpose, and verified facts found on the page.
- Do NOT invent anything not present in the webpage.`,
        {
          tools: [{ urlContext: {} }],
        }
      );
      if (response.text) {
        summaryMarkdown = response.text.trim();
        sourcesUsed.push("Gemini URL Context");
      }
    } catch {
      // Fallback summarize with extractedBody only
      try {
        const res2 = await generateResilientGemini(
          ai,
          `Summarize this public webpage in Bengali cleanly:\nURL: ${targetUrl}\nTitle: ${pageTitle}\nContent: ${extractedBody.slice(
            0,
            6000
          )}`
        );
        if (res2.text) summaryMarkdown = res2.text.trim();
      } catch {
        // handled below
      }
    }
  }

  if (!summaryMarkdown) {
    summaryMarkdown = restrictedNotice
      ? `${restrictedNotice}\n\nআপনি চাইলে নিচের মূল লিংক থেকে সরাসরি ব্রাউজারে পেজটি ভিজিট করতে পারেন।`
      : `**${pageTitle}** (${domain})\n\n${pageDesc || extractedBody.slice(0, 500) || "পাবলিক পেজের তথ্য সংগ্রহ করা হয়েছে।"}`;
  }

  const card: UniversalSearchResultItem = {
    id: `site_${Date.now()}`,
    category: "website",
    title: pageTitle,
    description: pageDesc || extractedBody.slice(0, 180) || restrictedNotice || `${domain} ওয়েবসাইট`,
    sourceName: domain,
    originalUrl: targetUrl,
    thumbnailUrl: ogImage,
    publishedAt: pubDate,
    downloadAllowed: false,
    licenseInfo: restrictedNotice ? "অ্যাক্সেস সীমিত (মূল সাইটে দেখুন)" : "পাবলিক ওয়েবপেজ",
    fileType: "Website Analysis",
  };

  return {
    summaryMarkdown,
    results: [card],
    sourcesUsed: Array.from(new Set(sourcesUsed)),
    notice: restrictedNotice,
  };
}

/**
 * MAIN ORCHESTRATOR: Universal Search & Media Intelligence
 */
export async function executeUniversalSearch(params: {
  query: string;
  forcedCategory?: UniversalSearchCategory;
  uid?: string;
  userName?: string;
}): Promise<UniversalSearchPayload> {
  const start = Date.now();
  const { query, forcedCategory, uid, userName } = params;
  const config = getUniversalSearchConfig();

  // Master toggle check
  if (!config.enabled) {
    return {
      intent: "chat",
      refinedQuery: query,
      summaryMarkdown: "",
      results: [],
      sourcesUsed: [],
      notice: "অ্যাডমিন কর্তৃক Universal Search সিস্টেম বর্তমানে বন্ধ রাখা হয়েছে।",
    };
  }

  const intent = detectUniversalIntent(query, forcedCategory);
  if (intent === "chat") {
    return {
      intent: "chat",
      refinedQuery: query,
      summaryMarkdown: "",
      results: [],
      sourcesUsed: [],
    };
  }

  // Category permission checks from Admin Panel
  const categoryBlocked =
    ((intent === "web" || intent === "news") && !config.webSearchEnabled) ||
    (intent === "video" && !config.videoSearchEnabled) ||
    (intent === "audio" && !config.audioSearchEnabled) ||
    (intent === "image" && !config.imageSearchEnabled) ||
    (intent === "website" && !config.websiteSearchEnabled) ||
    (intent === "document" && !config.documentSearchEnabled);

  if (categoryBlocked) {
    return {
      intent,
      refinedQuery: query,
      summaryMarkdown: `দুঃখিত, অ্যাডমিন প্যানেল থেকে **${intent.toUpperCase()} সার্চ** সুবিধাটি সাময়িকভাবে বন্ধ রাখা হয়েছে।`,
      results: [],
      sourcesUsed: [],
      notice: "Admin Search Control দ্বারা সীমিত।",
      latencyMs: Date.now() - start,
    };
  }

  let out: {
    summaryMarkdown: string;
    results: UniversalSearchResultItem[];
    sourcesUsed: string[];
    notice?: string;
  };

  try {
    if (intent === "video") {
      out = await searchVideos(query, config);
    } else if (intent === "audio") {
      out = await searchAudio(query, config);
    } else if (intent === "image") {
      out = await searchImages(query, config);
    } else if (intent === "document") {
      out = await searchDocuments(query, config);
    } else if (intent === "website") {
      out = await analyzePublicWebsite(query);
    } else {
      out = await searchWebOrNews(query, intent);
    }
  } catch (err: any) {
    recordError(intent, "UniversalSearchCore", query, err?.message || "Unexpected error");
    out = {
      summaryMarkdown: `দুঃখিত, অনুসন্ধানের সময় একটি ত্রুটি হয়েছে: ${err?.message || "অজানা ত্রুটি"}`,
      results: [],
      sourcesUsed: [],
    };
  }

  const latencyMs = Date.now() - start;
  recordHistory({
    query: query.slice(0, 160),
    intent,
    uid,
    userName,
    resultCount: out.results.length,
    sourcesUsed: out.sourcesUsed,
    latencyMs,
  });

  const autoPlayFirst =
    intent === "video" &&
    /(চালাও|চালান|বাজাও|বাজান|শোনাও|শোনান|দেখাও|\bplay\b|\bwatch\b)/i.test(query);

  return {
    intent,
    refinedQuery: query,
    summaryMarkdown: out.summaryMarkdown,
    results: out.results,
    sourcesUsed: out.sourcesUsed,
    notice: out.notice,
    latencyMs,
    autoPlayFirst,
  };
}
