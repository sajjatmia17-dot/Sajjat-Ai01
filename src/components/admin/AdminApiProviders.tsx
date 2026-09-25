import React, { useState, useEffect } from "react";
import { 
  Key, 
  Cpu, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Save, 
  Zap, 
  Radio, 
  Server, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { ApiProviderConfig, AdminApiProviderKey } from "../../types";
import { getBackendBaseUrl } from "../../api";
import { 
  subscribeToApiProviders, 
  saveApiProviderConfig,
  saveSystemSettings,
  DEFAULT_API_PROVIDERS 
} from "../../firebase";

interface AdminApiProvidersProps {
  onProviderActivated?: (providerId: AdminApiProviderKey) => void;
}

interface ProviderMeta {
  id: AdminApiProviderKey;
  name: string;
  badge: string;
  color: string;
  docsUrl: string;
  placeholderKey: string;
  description: string;
}

const PROVIDER_METAS: Record<AdminApiProviderKey, ProviderMeta> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini API",
    badge: "Official Core Engine",
    color: "from-blue-500 to-indigo-600",
    docsUrl: "https://aistudio.google.com/app/apikey",
    placeholderKey: "AIzaSy...",
    description: "Ultra-fast multimodal reasoning model with deep Bangla understanding and web search capabilities."
  },
  grok: {
    id: "grok",
    name: "xAI Grok API",
    badge: "Real-time Intelligence",
    color: "from-zinc-700 to-black",
    docsUrl: "https://console.x.ai",
    placeholderKey: "xai-...",
    description: "High performance wit and up-to-date reasoning from Elon Musk's xAI platform."
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek API",
    badge: "Top Coding & Math",
    color: "from-blue-600 to-cyan-600",
    docsUrl: "https://platform.deepseek.com",
    placeholderKey: "sk-...",
    description: "DeepSeek-V3 & DeepSeek-R1 frontier reasoning & code generation at extremely low cost."
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter API",
    badge: "100+ Models Aggregator",
    color: "from-purple-600 to-pink-600",
    docsUrl: "https://openrouter.ai/keys",
    placeholderKey: "sk-or-v1-...",
    description: "Access GPT-4o, Claude 3.5 Sonnet, Llama 3.3, and all frontier models via a single API."
  },
  huggingface: {
    id: "huggingface",
    name: "Hugging Face Inference API",
    badge: "Open Source Hub",
    color: "from-yellow-500 to-amber-600",
    docsUrl: "https://huggingface.co/settings/tokens",
    placeholderKey: "hf_...",
    description: "Serverless inference for thousands of open-source models like Llama 3.1, Mistral, and Qwen."
  },
  cerebras: {
    id: "cerebras",
    name: "Cerebras API",
    badge: "Wafer-Scale 2000 tps",
    color: "from-emerald-600 to-teal-700",
    docsUrl: "https://cloud.cerebras.ai",
    placeholderKey: "csk-...",
    description: "The world's fastest AI inference engine delivering instant response generation at 2000 tokens/second."
  },
  cohere: {
    id: "cohere",
    name: "Cohere API",
    badge: "Enterprise RAG & Search",
    color: "from-coral-500 to-rose-600",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    placeholderKey: "coh-...",
    description: "Command R+ and Command models specialized in multi-step reasoning and semantic search."
  },
  mistral: {
    id: "mistral",
    name: "Mistral API",
    badge: "European Frontier AI",
    color: "from-amber-600 to-orange-600",
    docsUrl: "https://console.mistral.ai",
    placeholderKey: "mis_...",
    description: "Mistral Large, Mistral Small, and Codestral top tier European AI models."
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude API",
    badge: "Nuanced Thinking & Logic",
    color: "from-orange-700 to-amber-800",
    docsUrl: "https://console.anthropic.com",
    placeholderKey: "sk-ant-api...",
    description: "Claude 3.5 Sonnet & Claude 3.5 Haiku benchmark leaders in coding, writing, and logic."
  }
};

export const AdminApiProviders: React.FC<AdminApiProvidersProps> = ({ onProviderActivated }) => {
  const [providers, setProviders] = useState<ApiProviderConfig[]>(() => Object.values(DEFAULT_API_PROVIDERS));
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, {
    testing?: boolean;
    success?: boolean;
    latencyMs?: number;
    reply?: string;
    error?: string;
  }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, boolean>>({});
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  // Subscribe to real-time API provider configs in Firebase
  useEffect(() => {
    const unsub = subscribeToApiProviders((savedRecord) => {
      const defaultList = Object.values(DEFAULT_API_PROVIDERS);
      if (savedRecord) {
        const merged = defaultList.map((def) => {
          const found = savedRecord[def.id];
          return found ? { ...def, ...found } : def;
        });
        setProviders(merged);
      }
    });
    return () => unsub();
  }, []);

  const handleKeyChange = (providerId: AdminApiProviderKey, newKey: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, apiKey: newKey } : p))
    );
  };

  const handleModelChange = (providerId: AdminApiProviderKey, newModel: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, modelId: newModel } : p))
    );
  };

  const handleToggleEnable = (providerId: AdminApiProviderKey) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  // Live Test Provider Connection
  const handleTestConnection = async (provider: ApiProviderConfig) => {
    setTestResults((prev) => ({
      ...prev,
      [provider.id]: { testing: true }
    }));

    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/admin/test-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: provider.apiKey,
          modelId: provider.modelId
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResults((prev) => ({
          ...prev,
          [provider.id]: {
            testing: false,
            success: true,
            latencyMs: data.latencyMs,
            reply: data.reply
          }
        }));

        // Update provider status
        setProviders((prev) =>
          prev.map((p) => (p.id === provider.id ? { ...p, status: "connected", latencyMs: data.latencyMs } : p))
        );
      } else {
        setTestResults((prev) => ({
          ...prev,
          [provider.id]: {
            testing: false,
            success: false,
            error: data.error || "Connection test failed",
            latencyMs: data.latencyMs
          }
        }));
        setProviders((prev) =>
          prev.map((p) => (p.id === provider.id ? { ...p, status: "error" } : p))
        );
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          testing: false,
          success: false,
          error: err?.message || "Network error while testing connection."
        }
      }));
    }
  };

  // Save single provider
  const handleSaveProvider = async (provider: ApiProviderConfig) => {
    try {
      // 1. Save in Firebase
      await saveApiProviderConfig(provider);

      // 2. Save on Server memory for active proxying
      await fetch(`${getBackendBaseUrl()}/api/admin/save-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: provider.apiKey,
          modelId: provider.modelId,
          enabled: provider.enabled,
          active: provider.active
        })
      });

      setSaveStatus((prev) => ({ ...prev, [provider.id]: true }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [provider.id]: false }));
      }, 2000);
    } catch (err) {
      console.error("Save provider error:", err);
      alert("সংরক্ষণ করতে সমস্যা হয়েছে।");
    }
  };

  // Set active provider
  const handleSetActiveProvider = async (providerId: AdminApiProviderKey) => {
    const target = providers.find((p) => p.id === providerId);
    if (!target) return;

    try {
      const updated = providers.map((p) => ({
        ...p,
        active: p.id === providerId
      }));
      setProviders(updated);

      // Update in Firebase
      for (const p of updated) {
        await saveApiProviderConfig(p);
      }

      await saveSystemSettings({
        activeProvider: providerId,
        activeModel: target.modelId
      });

      // Update server
      await fetch(`${getBackendBaseUrl()}/api/admin/save-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          active: true
        })
      });

      setGlobalMessage(`সফলভাবে "${target.name}"-কে প্রধান AI ইঞ্জিন হিসেবে নির্বাচন করা হয়েছে।`);
      setTimeout(() => setGlobalMessage(null), 3000);

      if (onProviderActivated) {
        onProviderActivated(providerId);
      }
    } catch (err) {
      console.error("Set active provider error:", err);
    }
  };

  const activeProvider = providers.find((p) => p.active) || providers[0];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Multi-Provider AI & Model Configuration
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                    ৯টি Provider সমর্থিত
                  </span>
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Gemini, Grok, DeepSeek, OpenRouter, Hugging Face, Cerebras, Cohere, Mistral এবং Claude পরিচালনা ও লাইভ টেস্ট করুন।
                </p>
              </div>
            </div>
          </div>

          {/* Active Provider Tag */}
          <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/80 px-4 py-2.5 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">বর্তমান সক্রিয় ইঞ্জিন</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeProvider?.name} ({activeProvider?.modelId})</p>
            </div>
          </div>
        </div>

        {globalMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{globalMessage}</span>
          </div>
        )}
      </div>

      {/* Grid of 9 Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {providers.map((provider) => {
          const meta = PROVIDER_METAS[provider.id] || {
            id: provider.id,
            name: provider.name,
            badge: "Provider",
            color: "from-zinc-600 to-zinc-800",
            docsUrl: "https://google.com",
            placeholderKey: "api-key...",
            description: provider.description || ""
          };

          const isShowKey = showKeys[provider.id] || false;
          const testState = testResults[provider.id];
          const isSaved = saveStatus[provider.id];

          return (
            <div
              key={provider.id}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between ${
                provider.active
                  ? "border-purple-500 ring-2 ring-purple-500/20 shadow-purple-500/5"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {meta.badge}
                      </span>
                      {provider.active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1.5">
                      {provider.name}
                    </h3>
                  </div>

                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Get API Key"
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {meta.description}
                </p>

                {/* API Key Input */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      <Key className="w-3 h-3 text-purple-500" />
                      API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider.id)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
                    >
                      {isShowKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {isShowKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={isShowKey ? "text" : "password"}
                      value={provider.apiKey || ""}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      placeholder={meta.placeholderKey}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Model ID Selection */}
                <div className="mt-3 space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    মডেল (Model ID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list={`models-${provider.id}`}
                      value={provider.modelId || provider.defaultModel}
                      onChange={(e) => handleModelChange(provider.id, e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <datalist id={`models-${provider.id}`}>
                      {provider.supportedModels?.map((m, idx) => (
                        <option key={`model_opt_${provider.id}_${m}_${idx}`} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Test Feedback Area */}
                {testState && (
                  <div className="mt-3 text-xs">
                    {testState.testing ? (
                      <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>সার্ভারে পিং টেস্ট চলছে...</span>
                      </div>
                    ) : testState.success ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> কানেকশন সফল</span>
                          <span className="text-[10px] font-mono">{testState.latencyMs}ms</span>
                        </div>
                        {testState.reply && (
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-200 italic line-clamp-1">
                            "{testState.reply}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 space-y-1">
                        <div className="flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>টেস্ট ব্যর্থ হয়েছে</span>
                        </div>
                        <p className="text-[11px] line-clamp-2">{testState.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(provider)}
                    disabled={testState?.testing}
                    className="flex-1 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${testState?.testing ? "animate-spin" : ""}`} />
                    Test Ping
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveProvider(provider)}
                    className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                    {isSaved ? "সংরক্ষিত" : "Save"}
                  </button>
                </div>

                {!provider.active && (
                  <button
                    type="button"
                    onClick={() => handleSetActiveProvider(provider.id)}
                    className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold transition-all"
                  >
                    Set as Active Engine
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
