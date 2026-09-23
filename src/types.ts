export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  status?: 'active' | 'vip' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  content?: string;
  base64?: string;
  isImage?: boolean;
}

export interface BookItem {
  id: string;
  name: string;
  class: string; // e.g. "Class 9", "নবম শ্রেণি"
  subject: string; // e.g. "গণিত", "Math", "বিজ্ঞান"
  author?: string;
  publisher?: string;
  year?: string;
  chapters?: string;
  description?: string;
  pdfUrl: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  enabled: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  attachedFile?: AttachedFile;
  imageBase64?: string;
  imageMimeType?: string;
  status?: 'sending' | 'sent' | 'error';
  model?: string;
  isPersonalQA?: boolean;
  isBookSearch?: boolean;
  bookResults?: BookItem[];
  generatedImageUrl?: string;
  generatedImagePrompt?: string;
  watermarkedImageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type AuthMode = 'login' | 'register' | 'forgot';
export type ModalType = 
  | 'none' 
  | 'auth' 
  | 'profile' 
  | 'privacy' 
  | 'settings' 
  | 'help' 
  | 'notifications'
  | 'admin_login'
  | 'confirm_delete_all'
  | 'pdf_viewer'
  | 'book_library'
  | 'image_generator'
  | 'html_viewer'
  | 'live_voice';

export type GeminiModelId = 'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-flash-latest';

export type AdminApiProviderKey = 
  | 'gemini' 
  | 'grok' 
  | 'deepseek' 
  | 'openrouter' 
  | 'huggingface' 
  | 'cerebras' 
  | 'cohere' 
  | 'mistral' 
  | 'claude';

export interface ApiProviderConfig {
  id: AdminApiProviderKey;
  name: string;
  apiKey: string;
  modelId: string;
  enabled: boolean;
  active: boolean;
  status: 'connected' | 'not_connected' | 'testing' | 'error';
  lastTestedAt?: string;
  latencyMs?: number;
  description?: string;
  defaultModel: string;
  supportedModels: string[];
}

export interface SystemSettingsConfig {
  aiEnabled: boolean;
  voiceEnabled: boolean;
  // 🎙️ Live Voice Chat Controls (Admin Managed)
  liveVoiceEnabled?: boolean;
  liveVoiceNotice?: string;
  liveVoiceName?: string; // Zephyr, Kore, Puck, Charon, Fenrir, Aoede
  liveVoiceSpeed?: string; // 0.8, 1.0, 1.2
  liveVoiceInstruction?: string;

  // 🖼️ AI Image Generator & Editing Controls (Admin Managed)
  imageGenerationEnabled?: boolean;
  imageEditingEnabled?: boolean;
  imageModelPreset?: "gemini-3.1-flash-image" | "gemini-3.1-flash-lite-image" | "turbo" | "flux" | "sana" | string;
  imageGenerationNotice?: string;
  imageDefaultAspectRatio?: "1:1" | "16:9" | "9:16";
  imageWatermarkEnabled?: boolean;
  imageWatermarkText?: string;

  // ⚙️ Modular Feature Controls (Admin Managed)
  webSearchEnabled?: boolean;
  readAloudEnabled?: boolean;
  bookLibraryEnabled?: boolean;
  userNotificationsEnabled?: boolean;
  premiumSystemEnabled?: boolean;
  maintenanceModeEnabled?: boolean;

  // 🎨 AI Branding, Design & Color Customization (Admin Managed)
  aiBrandName?: string; // e.g. "Sajjat AI"
  aiTagline?: string;
  aiThemeColor?: "indigo" | "emerald" | "violet" | "rose" | "cyan" | "amber" | "blue";
  aiAvatarIcon?: "bot" | "brain" | "sparkles" | "zap" | "star";
  aiWelcomeTitle?: string;
  aiWelcomeSubtitle?: string;
  creatorName?: string;

  imageUploadEnabled: boolean;
  fileUploadEnabled: boolean;
  chatHistoryEnabled: boolean;
  notificationsEnabled: boolean;
  activeProvider: AdminApiProviderKey;
  activeModel: string;
  temperature: number;
  systemInstruction?: string;
  adminTapCount?: number;
  adminPassword?: string;
  aiLimitSystemEnabled?: boolean;
  defaultFreeDailyLimit?: number;
  updatedAt?: string;
}

export interface UserAiLimit {
  dailyLimit: number;
  usedCount: number;
  lastUsedDate: string; // YYYY-MM-DD
  isUnlimited: boolean;
  premiumPackageId?: string;
  premiumPackageName?: string;
  premiumExpiresAt?: string; // ISO String
}

export interface PremiumPackage {
  id: string;
  name: string;
  price: number;
  validityMonths: number;
  messageLimit: number; // e.g., 100 or 99999 for unlimited
  isUnlimited: boolean;
  enabled: boolean;
  createdAt: number;
}

export interface PurchaseRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  packageName: string;
  packageId: string;
  amount: number;
  validityMonths: number;
  paymentMethod: 'bkash' | 'nagad';
  senderNumber: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  reviewedAt?: number;
}

export interface GeminiModelInfo {
  id: GeminiModelId;
  name: string;
  badge: string;
  speed: string;
  description: string;
  bestFor: string;
  color: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'alert' | 'feature';
  target: 'all' | 'user';
  targetUserId?: string;
  targetUserEmail?: string;
  createdAt: string | number;
  senderName?: string;
  readBy?: Record<string, boolean>; // uid -> boolean
  expiresAt?: number | null; // Timestamp in ms or null
  expirationOption?: 'none' | '1d' | '3d' | '7d' | '30d' | string;
}

export interface AdminAISettings {
  defaultModel: GeminiModelId;
  temperature: number;
  fallbackEnabled: boolean;
  systemInstruction?: string;
  hasCustomKey?: boolean;
  activeModelName?: string;
  lastTestedAt?: string;
  apiStatus?: 'online' | 'error' | 'unconfigured';
}

export interface AppContentConfig {
  helpCenterIntro?: string;
  helpCenterItems?: Array<{
    id: string;
    title: string;
    description: string;
    category?: string;
  }>;
  privacyPolicyIntro?: string;
  privacyPolicySections?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  announcementBanner?: {
    enabled: boolean;
    text: string;
    link?: string;
  };
}

export interface AdminUserData extends UserProfile {
  chatCount?: number;
  totalMessages?: number;
  chats?: Record<string, ChatSession>;
}

export const DEFAULT_API_PROVIDERS: ApiProviderConfig[] = [
  {
    id: "gemini",
    name: "Gemini API (Google)",
    apiKey: "",
    modelId: "gemini-3.1-flash-lite",
    enabled: true,
    active: true,
    status: "connected",
    description: "Official Google Gemini AI Engine with ultra-fast responses and multimodal support.",
    defaultModel: "gemini-3.1-flash-lite",
    supportedModels: ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-1.5-pro"]
  },
  {
    id: "grok",
    name: "Grok API (xAI)",
    apiKey: "",
    modelId: "grok-beta",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "xAI Grok engine known for wit, up-to-date knowledge, and reasoning capabilities.",
    defaultModel: "grok-beta",
    supportedModels: ["grok-beta", "grok-2-latest", "grok-vision-beta"]
  },
  {
    id: "deepseek",
    name: "DeepSeek API",
    apiKey: "",
    modelId: "deepseek-chat",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "DeepSeek-V3 and DeepSeek-R1 high-performance reasoning & coding models.",
    defaultModel: "deepseek-chat",
    supportedModels: ["deepseek-chat", "deepseek-reasoner"]
  },
  {
    id: "openrouter",
    name: "OpenRouter API",
    apiKey: "",
    modelId: "openai/gpt-4o-mini",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "Unified gateway to 100+ AI models including GPT-4o, Claude 3.5, and Llama 3.",
    defaultModel: "openai/gpt-4o-mini",
    supportedModels: ["openai/gpt-4o-mini", "google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "anthropic/claude-3.5-haiku"]
  },
  {
    id: "huggingface",
    name: "Hugging Face Inference API",
    apiKey: "",
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "Serverless inference for thousands of open-source models on Hugging Face Hub.",
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    supportedModels: ["meta-llama/Llama-3.1-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3", "Qwen/Qwen2.5-72B-Instruct"]
  },
  {
    id: "cerebras",
    name: "Cerebras API",
    apiKey: "",
    modelId: "llama3.1-8b",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "World's fastest AI inference powered by Wafer-Scale Engine (up to 2000 tokens/sec).",
    defaultModel: "llama3.1-8b",
    supportedModels: ["llama3.1-8b", "llama-3.3-70b", "llama3.1-70b"]
  },
  {
    id: "cohere",
    name: "Cohere API",
    apiKey: "",
    modelId: "command-r",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "Enterprise-grade language models tailored for search, RAG, and reasoning.",
    defaultModel: "command-r",
    supportedModels: ["command-r", "command-r-plus", "command-light"]
  },
  {
    id: "mistral",
    name: "Mistral API",
    apiKey: "",
    modelId: "mistral-small-latest",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "Frontier open & commercial AI models developed by Mistral AI in Europe.",
    defaultModel: "mistral-small-latest",
    supportedModels: ["mistral-small-latest", "mistral-large-latest", "codestral-latest", "pixtral-large-latest"]
  },
  {
    id: "claude",
    name: "Claude API (Anthropic)",
    apiKey: "",
    modelId: "claude-3-5-sonnet-20241022",
    enabled: false,
    active: false,
    status: "not_connected",
    description: "State-of-the-art intelligent models with strong coding and nuanced comprehension.",
    defaultModel: "claude-3-5-sonnet-20241022",
    supportedModels: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]
  }
];

export const AVAILABLE_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.1-flash-lite",
    name: "Sajjat AI 3.1 Flash Lite",
    badge: "⚡ দ্রুততম",
    speed: "Ultra Fast (~0.3s)",
    description: "সবচেয়ে দ্রুত গতিতে উত্তর পাওয়ার জন্য পারফেক্ট। কোনো বিলম্ব ছাড়াই নিমেষেই চমৎকার রেসপন্স দেয়।",
    bestFor: "দ্রুত উত্তর, সাধারণ প্রশ্ন ও চ্যাটিং",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "gemini-3.8-flash",
    name: "Sajjat AI 3.8 Flash",
    badge: "🧠 বুদ্ধিমান ও ব্যালেন্সড",
    speed: "Balanced (~0.8s)",
    description: "উচ্চতর বিশ্লেষণ ক্ষমতা, কোডিং, গণিত ও বিস্তারিত ব্যাখ্যার জন্য সেরা মডেল।",
    bestFor: "কোডিং, গণিত, বিজ্ঞান ও বিস্তারিত বিশ্লেষণ",
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "gemini-flash-latest",
    name: "Sajjat AI Flash Latest",
    badge: "🚀 লেটেস্ট সংস্করণ",
    speed: "Fast (~0.6s)",
    description: "সর্বশেষ আধুনিক এআই সংস্করণের উন্নত ফিচার ও নির্ভরযোগ্য তথ্য।",
    bestFor: "দৈনন্দিন গবেষণা ও বিবিধ বিশ্লেষণ",
    color: "from-cyan-500 to-blue-600",
  },
];

export interface LiveChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderPhotoURL?: string;
  isGuest?: boolean;
  isAdmin?: boolean;
  text: string;
  imageUrl?: string;
  timestamp: number;
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export interface LivePresenceUser {
  id: string;
  name: string;
  isOnline: boolean;
  lastActive: number;
  isAdmin?: boolean;
}




