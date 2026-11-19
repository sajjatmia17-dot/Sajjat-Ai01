import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  Cpu,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  ExternalLink,
  Plus,
  Trash2,
  X,
  ArrowUpDown,
  ShieldCheck,
  Activity,
  Clock,
  Globe,
} from "lucide-react";
import {
  ApiProviderConfig,
  AdminApiProviderKey,
  ProviderApiType,
  ProviderAuthMethod,
  ProviderFeatureCapabilities,
} from "../../types";
import {
  fetchAdminProvidersApi,
  saveAdminProviderApi,
  deleteAdminProviderApi,
  testAdminProviderApi,
} from "../../api";
import { saveApiProviderConfig, saveSystemSettings } from "../../firebase";

interface AdminApiProvidersProps {
  onProviderActivated?: (providerId: AdminApiProviderKey) => void;
}

interface ProviderMeta {
  badge: string;
  docsUrl: string;
  placeholderKey: string;
  description: string;
}

const BUILTIN_META: Record<string, ProviderMeta> = {
  gemini: {
    badge: "Primary Multimodal Engine",
    docsUrl: "https://aistudio.google.com/app/apikey",
    placeholderKey: "AIzaSy...",
    description: "Text, image vision, document parsing, image studio & real-time voice.",
  },
  fal: {
    badge: "Image Generation Studio",
    docsUrl: "https://fal.ai",
    placeholderKey: "fal_key...",
    description: "High-speed image rendering engine (FLUX Schnell).",
  },
  grok: {
    badge: "xAI Grok",
    docsUrl: "https://console.x.ai",
    placeholderKey: "xai-...",
    description: "Fast reasoning and multimodal intelligence from xAI.",
  },
  deepseek: {
    badge: "Coding & Math",
    docsUrl: "https://platform.deepseek.com",
    placeholderKey: "sk-...",
    description: "DeepSeek-V3 and DeepSeek-R1 technical & reasoning models.",
  },
  openrouter: {
    badge: "Multi-Model Gateway",
    docsUrl: "https://openrouter.ai/keys",
    placeholderKey: "sk-or-v1-...",
    description: "Unified OpenAI-compatible gateway across frontier models.",
  },
  huggingface: {
    badge: "Open Source Hub",
    docsUrl: "https://huggingface.co/settings/tokens",
    placeholderKey: "hf_...",
    description: "Serverless inference for open-weight models.",
  },
  cerebras: {
    badge: "Ultra Low Latency",
    docsUrl: "https://cloud.cerebras.ai",
    placeholderKey: "csk-...",
    description: "High-throughput Llama inference engine.",
  },
  cohere: {
    badge: "Enterprise RAG",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    placeholderKey: "coh-...",
    description: "Command-R models optimized for multilingual search and reasoning.",
  },
  mistral: {
    badge: "European Frontier AI",
    docsUrl: "https://console.mistral.ai",
    placeholderKey: "mis_...",
    description: "Mistral Small / Large / Codestral models.",
  },
  claude: {
    badge: "Anthropic Claude",
    docsUrl: "https://console.anthropic.com",
    placeholderKey: "sk-ant-...",
    description: "Claude 3.5 Sonnet & Haiku with nuanced vision and coding.",
  },
};

const EMPTY_FEATURES: ProviderFeatureCapabilities = {
  textChat: true,
  imageVision: false,
  fileUpload: true,
  voice: false,
  imageGen: false,
};

export const AdminApiProviders: React.FC<AdminApiProvidersProps> = ({
  onProviderActivated,
}) => {
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        testing?: boolean;
        success?: boolean;
        latencyMs?: number;
        reply?: string;
        error?: string;
        rateLimitHeaders?: Record<string, string> | null;
      }
    >
  >({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [globalMessage, setGlobalMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Add / Edit Custom Provider Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState<{
    id?: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    modelId: string;
    apiType: ProviderApiType;
    authMethod: ProviderAuthMethod;
    customAuthHeaderName: string;
    priority: number;
    enabled: boolean;
    active: boolean;
    supportedFeatures: ProviderFeatureCapabilities;
    description: string;
  }>({
    name: "",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    modelId: "gpt-4o-mini",
    apiType: "openai_compatible",
    authMethod: "bearer",
    customAuthHeaderName: "X-API-Key",
    priority: 10,
    enabled: true,
    active: false,
    supportedFeatures: { ...EMPTY_FEATURES },
    description: "",
  });
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [customTestState, setCustomTestState] = useState<{
    testing?: boolean;
    success?: boolean;
    latencyMs?: number;
    error?: string;
    reply?: string;
  } | null>(null);
  const [customSaving, setCustomSaving] = useState(false);

  const loadProvidersFromServer = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchAdminProvidersApi();
      if (res.success) {
        setProviders(res.providers);
      } else {
        setLoadError(res.error || "Provider তালিকা লোড করা যায়নি।");
      }
    } catch (err: any) {
      setLoadError(err?.message || "সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProvidersFromServer();
  }, [loadProvidersFromServer]);

  const showBanner = (type: "success" | "error", text: string) => {
    setGlobalMessage({ type, text });
    setTimeout(() => setGlobalMessage(null), 4000);
  };

  const updateLocalField = (
    providerId: string,
    patch: Partial<ApiProviderConfig>
  ) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, ...patch } : p))
    );
  };

  const handleTestConnection = async (provider: ApiProviderConfig) => {
    setTestResults((prev) => ({
      ...prev,
      [provider.id]: { testing: true },
    }));

    try {
      const typedKey = (draftKeys[provider.id] || "").trim();
      const res = await testAdminProviderApi({
        providerId: provider.id,
        apiKey: typedKey || undefined,
        baseUrl: provider.baseUrl,
        modelId: provider.modelId,
        apiType: provider.apiType,
        authMethod: provider.authMethod,
        customAuthHeaderName: provider.customAuthHeaderName,
      });

      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          testing: false,
          success: res.success,
          latencyMs: res.latencyMs,
          reply: res.reply,
          error: res.error,
          rateLimitHeaders: res.rateLimitHeaders || null,
        },
      }));
      await loadProvidersFromServer();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          testing: false,
          success: false,
          error: err?.message || "কানেকশন টেস্ট ব্যর্থ হয়েছে।",
        },
      }));
    }
  };

  const handleSaveProvider = async (provider: ApiProviderConfig) => {
    setSavingMap((prev) => ({ ...prev, [provider.id]: true }));
    try {
      const typedKey = (draftKeys[provider.id] || "").trim();
      const res = await saveAdminProviderApi({
        id: provider.id,
        name: provider.name,
        apiKey: typedKey || undefined,
        baseUrl: provider.baseUrl,
        modelId: provider.modelId,
        apiType: provider.apiType,
        authMethod: provider.authMethod,
        customAuthHeaderName: provider.customAuthHeaderName,
        priority: Number(provider.priority) || 10,
        enabled: provider.enabled,
        active: provider.active,
        isCustom: provider.isCustom,
        supportedFeatures: provider.supportedFeatures,
      });

      if (!res.success) {
        showBanner("error", res.error || "সংরক্ষণ ব্যর্থ হয়েছে।");
        return;
      }

      // Clear draft secret from memory after server save
      setDraftKeys((prev) => ({ ...prev, [provider.id]: "" }));
      if (res.providers) {
        setProviders(res.providers);
      }
      // Save non-secret metadata only to RTDB
      await saveApiProviderConfig({
        ...provider,
        apiKey: "",
        hasKey: Boolean(typedKey || provider.hasKey),
      });

      setSavedMap((prev) => ({ ...prev, [provider.id]: true }));
      setTimeout(() => setSavedMap((prev) => ({ ...prev, [provider.id]: false })), 2000);
      showBanner("success", `"${provider.name}" সফলভাবে সার্ভারে সংরক্ষিত হয়েছে।`);
    } catch (err: any) {
      showBanner("error", err?.message || "সংরক্ষণে ত্রুটি ঘটেছে।");
    } finally {
      setSavingMap((prev) => ({ ...prev, [provider.id]: false }));
    }
  };

  const handleSetActiveProvider = async (provider: ApiProviderConfig) => {
    try {
      const res = await saveAdminProviderApi({
        id: provider.id,
        enabled: true,
        active: true,
      });
      if (!res.success) {
        showBanner("error", res.error || "Primary Provider সক্রিয় করা যায়নি।");
        return;
      }
      if (res.providers) {
        setProviders(res.providers);
      }
      await saveSystemSettings({
        activeProvider: provider.id,
        activeModel: provider.modelId,
      });
      showBanner("success", `"${provider.name}" এখন Primary Active AI ইঞ্জিন হিসেবে চালু।`);
      onProviderActivated?.(provider.id);
    } catch (err: any) {
      showBanner("error", err?.message || "ত্রুটি ঘটেছে।");
    }
  };

  const handleDeleteCustomProvider = async (provider: ApiProviderConfig) => {
    if (!provider.isCustom) return;
    try {
      const res = await deleteAdminProviderApi(provider.id);
      if (!res.success) {
        showBanner("error", res.error || "ডিলিট করা যায়নি।");
        return;
      }
      if (res.providers) {
        setProviders(res.providers);
      }
      showBanner("success", `"${provider.name}" মুছে ফেলা হয়েছে।`);
    } catch (err: any) {
      showBanner("error", err?.message || "ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  const openAddCustomModal = () => {
    setCustomForm({
      name: "",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1/chat/completions",
      modelId: "gpt-4o-mini",
      apiType: "openai_compatible",
      authMethod: "bearer",
      customAuthHeaderName: "X-API-Key",
      priority: providers.length + 1,
      enabled: true,
      active: false,
      supportedFeatures: { ...EMPTY_FEATURES },
      description: "",
    });
    setCustomTestState(null);
    setShowCustomKey(false);
    setShowCustomModal(true);
  };

  const openEditCustomModal = (p: ApiProviderConfig) => {
    setCustomForm({
      id: p.id,
      name: p.name,
      apiKey: "",
      baseUrl: p.baseUrl || "",
      modelId: p.modelId || "",
      apiType: p.apiType || "openai_compatible",
      authMethod: p.authMethod || "bearer",
      customAuthHeaderName: p.customAuthHeaderName || "X-API-Key",
      priority: p.priority ?? 10,
      enabled: p.enabled,
      active: p.active,
      supportedFeatures: p.supportedFeatures || { ...EMPTY_FEATURES },
      description: p.description || "",
    });
    setCustomTestState(null);
    setShowCustomKey(false);
    setShowCustomModal(true);
  };

  const handleTestCustomDraft = async () => {
    setCustomTestState({ testing: true });
    try {
      const res = await testAdminProviderApi({
        providerId: customForm.id,
        apiKey: customForm.apiKey.trim() || undefined,
        baseUrl: customForm.baseUrl.trim(),
        modelId: customForm.modelId.trim(),
        apiType: customForm.apiType,
        authMethod: customForm.authMethod,
        customAuthHeaderName: customForm.customAuthHeaderName.trim(),
      });
      setCustomTestState({
        testing: false,
        success: res.success,
        latencyMs: res.latencyMs,
        reply: res.reply,
        error: res.error,
      });
    } catch (err: any) {
      setCustomTestState({
        testing: false,
        success: false,
        error: err?.message || "টেস্ট ব্যর্থ হয়েছে।",
      });
    }
  };

  const handleSaveCustomModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim() || !customForm.baseUrl.trim() || !customForm.modelId.trim()) {
      showBanner("error", "Provider Name, Base URL এবং Model Name আবশ্যক।");
      return;
    }
    setCustomSaving(true);
    try {
      const res = await saveAdminProviderApi({
        id: customForm.id,
        name: customForm.name.trim(),
        apiKey: customForm.apiKey.trim() || undefined,
        baseUrl: customForm.baseUrl.trim(),
        modelId: customForm.modelId.trim(),
        apiType: customForm.apiType,
        authMethod: customForm.authMethod,
        customAuthHeaderName:
          customForm.authMethod === "custom_header"
            ? customForm.customAuthHeaderName.trim()
            : undefined,
        priority: Number(customForm.priority) || 10,
        enabled: customForm.enabled,
        active: customForm.active,
        isCustom: true,
        supportedFeatures: customForm.supportedFeatures,
        description: customForm.description.trim() || "Custom Admin-configured AI endpoint",
      });
      if (!res.success) {
        showBanner("error", res.error || "Custom Provider সংরক্ষণ ব্যর্থ হয়েছে।");
        return;
      }
      if (res.providers) setProviders(res.providers);
      setShowCustomModal(false);
      showBanner("success", `Custom Provider "${customForm.name}" সফলভাবে সংরক্ষিত হয়েছে!`);
      if (customForm.active && res.provider) {
        onProviderActivated?.(res.provider.id);
      }
    } catch (err: any) {
      showBanner("error", err?.message || "সংরক্ষণে সমস্যা হয়েছে।");
    } finally {
      setCustomSaving(false);
    }
  };

  const activeProvider = providers.find((p) => p.active && p.enabled) || providers[0];

  return (
    <div className="space-y-6">
      {/* Header & Fallback Overview */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                Server-Side AI Providers & Custom Endpoints
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Keys Server-Only
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                সকল API Key শুধুমাত্র নিরাপদ সার্ভার / Netlify Function-এ সংরক্ষিত থাকে। Primary ইঞ্জিন 429 বা ত্রুটি দেখালে স্বয়ংক্রিয়ভাবে Priority # অনুযায়ী পরবর্তী Enabled Provider-এ সুইচ হবে।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadProvidersFromServer}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAddCustomModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Custom Provider
            </button>
          </div>
        </div>

        {/* Active Primary Summary */}
        {activeProvider && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-500 dark:text-zinc-400">Primary Engine:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {activeProvider.name} ({activeProvider.modelId})
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Enabled Fallback Pool:{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {providers.filter((p) => p.enabled && p.hasKey && p.supportedFeatures?.textChat !== false).length}
                </strong>{" "}
                providers
              </span>
            </div>
          </div>
        )}

        {globalMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              globalMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300"
            }`}
          >
            {globalMessage.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{globalMessage.text}</span>
          </div>
        )}

        {loadError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {providers.map((provider) => {
          const meta = BUILTIN_META[provider.id] || {
            badge: provider.isCustom ? "Custom Provider" : "Provider",
            docsUrl: provider.baseUrl || "https://sajjat-ai.web.app",
            placeholderKey: "Enter new API key...",
            description: provider.description || "Custom endpoint configured by Admin.",
          };
          const isShowKey = showKeys[provider.id] || false;
          const draftKey = draftKeys[provider.id] || "";
          const testState = testResults[provider.id];
          const isSaving = savingMap[provider.id] || false;
          const isSaved = savedMap[provider.id] || false;

          const displayStatus =
            testState?.testing
              ? "testing"
              : provider.isLocked
              ? "error"
              : provider.status || (provider.hasKey ? "connected" : "not_connected");

          return (
            <div
              key={provider.id}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                provider.active
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : provider.enabled
                  ? "border-zinc-200 dark:border-zinc-800"
                  : "border-zinc-200/70 dark:border-zinc-800/70 opacity-80"
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        Priority #{provider.priority ?? 10}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {provider.isCustom ? "Custom" : meta.badge}
                      </span>
                      {provider.active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-2 truncate">
                      {provider.name}
                    </h3>
                  </div>

                  {/* Enable/Disable Switch */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!provider.isCustom && (
                      <a
                        href={meta.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Get API Key"
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateLocalField(provider.id, { enabled: !provider.enabled })
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        provider.enabled
                          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {provider.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
                  {provider.description || meta.description}
                </p>

                {/* API Key Input (Never shows raw saved secret) */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      <Key className="w-3 h-3 text-indigo-500" />
                      API Key{" "}
                      {provider.hasKey && (
                        <span className="text-[10px] text-emerald-500 font-mono">
                          ({provider.maskedKey || "Saved on Server"})
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setShowKeys((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      {isShowKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {isShowKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={isShowKey ? "text" : "password"}
                    value={draftKey}
                    onChange={(e) =>
                      setDraftKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                    }
                    placeholder={
                      provider.hasKey
                        ? `নতুন কী লিখলে আপডেট হবে (${provider.maskedKey})`
                        : meta.placeholderKey
                    }
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Model + Priority Row */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Model Name
                    </label>
                    <input
                      type="text"
                      list={`models-${provider.id}`}
                      value={provider.modelId || provider.defaultModel || ""}
                      onChange={(e) =>
                        updateLocalField(provider.id, { modelId: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id={`models-${provider.id}`}>
                      {provider.supportedModels?.map((m, idx) => (
                        <option key={`${provider.id}_${m}_${idx}`} value={m} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Priority #
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={provider.priority ?? 10}
                      onChange={(e) =>
                        updateLocalField(provider.id, {
                          priority: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Base URL (editable cleanly for custom & configurable endpoints) */}
                {provider.baseUrl && (
                  <div className="mt-2.5 space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> API Base URL
                    </label>
                    <input
                      type="text"
                      value={provider.baseUrl}
                      onChange={(e) =>
                        updateLocalField(provider.id, { baseUrl: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[11px] font-mono text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Supported Feature Capabilities */}
                {provider.supportedFeatures && (
                  <div className="mt-3 flex flex-wrap gap-1 text-[10px]">
                    {provider.supportedFeatures.textChat && (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        Text
                      </span>
                    )}
                    {provider.supportedFeatures.imageVision && (
                      <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                        Vision
                      </span>
                    )}
                    {provider.supportedFeatures.fileUpload && (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        Files
                      </span>
                    )}
                    {provider.supportedFeatures.voice && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Voice
                      </span>
                    )}
                    {provider.supportedFeatures.imageGen && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        Image Gen
                      </span>
                    )}
                  </div>
                )}

                {/* Live Server Diagnostics (Real HTTP errors, latency, rate-limit headers) */}
                <div className="mt-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold text-zinc-600 dark:text-zinc-300">
                      <Activity className="w-3 h-3 text-indigo-500" />
                      Status:{" "}
                      <span
                        className={
                          displayStatus === "connected"
                            ? "text-emerald-500"
                            : displayStatus === "rate_limited"
                            ? "text-amber-500"
                            : displayStatus === "error"
                            ? "text-rose-500"
                            : "text-zinc-400"
                        }
                      >
                        {displayStatus === "connected"
                          ? "Connected"
                          : displayStatus === "rate_limited"
                          ? "Rate Limited (429)"
                          : displayStatus === "error"
                          ? "Error"
                          : displayStatus === "testing"
                          ? "Testing..."
                          : "Not Configured"}
                      </span>
                    </span>
                    {typeof (testState?.latencyMs ?? provider.latencyMs) === "number" && (
                      <span className="font-mono text-[10px] text-zinc-400">
                        {testState?.latencyMs ?? provider.latencyMs}ms
                      </span>
                    )}
                  </div>

                  {provider.lastSuccessAt && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Clock className="w-3 h-3" />
                      Last OK: {new Date(provider.lastSuccessAt).toLocaleString()}
                    </div>
                  )}

                  {(testState?.error || provider.lastError) && (
                    <p className="text-[10px] text-rose-500 dark:text-rose-400 line-clamp-2 break-all">
                      Last Error: {testState?.error || provider.lastError}
                    </p>
                  )}

                  {testState?.success && testState?.reply && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic line-clamp-1">
                      Ping Reply: "{testState.reply}"
                    </p>
                  )}

                  {(testState?.rateLimitHeaders || provider.rateLimitHeaders) && (
                    <div className="pt-1 border-t border-zinc-200/70 dark:border-zinc-700/60 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 space-y-0.5">
                      {Object.entries(
                        testState?.rateLimitHeaders || provider.rateLimitHeaders || {}
                      )
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <div key={k} className="truncate">
                            {k}: {v}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(provider)}
                    disabled={testState?.testing}
                    className="flex-1 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${testState?.testing ? "animate-spin" : ""}`}
                    />
                    Test Ping
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveProvider(provider)}
                    disabled={isSaving}
                    className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                    {isSaved ? "Saved" : isSaving ? "..." : "Save"}
                  </button>

                  {provider.isCustom && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditCustomModal(provider)}
                        className="py-1.5 px-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs cursor-pointer"
                        title="Edit Custom Provider"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomProvider(provider)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer"
                        title="Delete Custom Provider"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {!provider.active && provider.supportedFeatures?.textChat !== false && (
                  <button
                    type="button"
                    onClick={() => handleSetActiveProvider(provider)}
                    className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Set as Active Primary
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Custom AI Provider Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {customForm.id ? "Edit Custom AI Provider" : "Add New Custom AI Provider"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  যেকোনো OpenAI-compatible, Anthropic, Cohere, HuggingFace বা Custom REST endpoint যোগ করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomModal} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Provider Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customForm.name}
                    onChange={(e) => setCustomForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="যেমন: Groq Cloud / Together AI"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customForm.modelId}
                    onChange={(e) => setCustomForm((f) => ({ ...f, modelId: e.target.value }))}
                    placeholder="যেমন: llama-3.3-70b-versatile"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  API Base URL *
                </label>
                <input
                  type="url"
                  required
                  value={customForm.baseUrl}
                  onChange={(e) => setCustomForm((f) => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="https://api.groq.com/openai/v1/chat/completions"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    API Key {customForm.id ? "(খালি রাখলে আগের কী বহাল থাকবে)" : "*"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomKey((s) => !s)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showCustomKey ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showCustomKey ? "text" : "password"}
                  required={!customForm.id}
                  value={customForm.apiKey}
                  onChange={(e) => setCustomForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder="আপনার গোপন API Key এখানে দিন..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    API Type
                  </label>
                  <select
                    value={customForm.apiType}
                    onChange={(e) =>
                      setCustomForm((f) => ({ ...f, apiType: e.target.value as ProviderApiType }))
                    }
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="openai_compatible">OpenAI-Compatible</option>
                    <option value="gemini">Gemini</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="cohere">Cohere</option>
                    <option value="huggingface">HuggingFace</option>
                    <option value="custom_rest">Custom REST</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Auth Method
                  </label>
                  <select
                    value={customForm.authMethod}
                    onChange={(e) =>
                      setCustomForm((f) => ({
                        ...f,
                        authMethod: e.target.value as ProviderAuthMethod,
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="bearer">Bearer Token</option>
                    <option value="x-api-key">x-api-key Header</option>
                    <option value="query_param">Query Param (?key=)</option>
                    <option value="custom_header">Custom Header</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Priority #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={customForm.priority}
                    onChange={(e) =>
                      setCustomForm((f) => ({ ...f, priority: Number(e.target.value) || 10 }))
                    }
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              {customForm.authMethod === "custom_header" && (
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Custom Auth Header Name
                  </label>
                  <input
                    type="text"
                    value={customForm.customAuthHeaderName}
                    onChange={(e) =>
                      setCustomForm((f) => ({ ...f, customAuthHeaderName: e.target.value }))
                    }
                    placeholder="X-Custom-Key"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              {/* Supported Features Checkboxes */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Supported Features (যে ফিচার সমর্থিত নয় তা Chat Input-এ বন্ধ থাকবে)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ["textChat", "Text Chat"],
                      ["imageVision", "Image Vision"],
                      ["fileUpload", "File Upload"],
                      ["voice", "Live Voice"],
                      ["imageGen", "Image Gen"],
                    ] as Array<[keyof ProviderFeatureCapabilities, string]>
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={customForm.supportedFeatures[key]}
                        onChange={(e) =>
                          setCustomForm((f) => ({
                            ...f,
                            supportedFeatures: {
                              ...f.supportedFeatures,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span className="text-zinc-800 dark:text-zinc-200">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Provider Ping Test Feedback */}
              {customTestState && (
                <div
                  className={`p-3 rounded-xl border ${
                    customTestState.testing
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                      : customTestState.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {customTestState.testing
                    ? "কানেকশন পরীক্ষা চলছে..."
                    : customTestState.success
                    ? `✅ সফল (${customTestState.latencyMs}ms): "${customTestState.reply}"`
                    : `❌ ব্যর্থ: ${customTestState.error}`}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={customForm.active}
                    onChange={(e) =>
                      setCustomForm((f) => ({ ...f, active: e.target.checked, enabled: true }))
                    }
                  />
                  <span>সংরক্ষণের পর Primary Engine করুন</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestCustomDraft}
                    disabled={customTestState?.testing}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold cursor-pointer"
                  >
                    Test Ping
                  </button>
                  <button
                    type="submit"
                    disabled={customSaving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    {customSaving ? "সংরক্ষণ হচ্ছে..." : "Save Provider"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
