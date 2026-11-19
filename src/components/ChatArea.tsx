import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Bot, 
  User as UserIcon, 
  Copy, 
  Check, 
  Code, 
  GraduationCap, 
  BrainCircuit, 
  Compass,
  ArrowDown,
  FileText,
  FileCode,
  Trash2,
  Zap,
  MessageSquare,
  Sparkles,
  Settings,
  Radio,
  Image as ImageIcon,
  Star,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Pause,
  Play,
  Square,
  RotateCcw,
  Share2,
} from "lucide-react";
import { ChatMessage, UserProfile, ModalType, GeminiModelId, AVAILABLE_MODELS, SystemSettingsConfig, UniversalSearchResultItem } from "../types";
import { GeneratedImageCard } from "./GeneratedImageCard";
import { SearchResultsBlock } from "./SearchResultsBlock";
import { findBestBanglaVoice } from "../utils/phoneControlHelpers";

function stripMarkdownForSpeech(raw: string): string {
  return (raw || "")
    .replace(/```[\s\S]*?```/g, " কোড অংশ। ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/^\s*[-*+\d.]+\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\n+/g, "। ")
    .replace(/\s+/g, " ")
    .trim();
}

const THEME_GRADIENTS: Record<string, string> = {
  indigo: "from-indigo-600 via-purple-600 to-cyan-400",
  cyan: "from-cyan-400 via-teal-400 to-blue-500",
  emerald: "from-emerald-400 via-teal-500 to-cyan-500",
  violet: "from-fuchsia-500 via-purple-600 to-indigo-500",
  rose: "from-rose-500 via-pink-500 to-orange-400",
  amber: "from-amber-400 via-yellow-500 to-orange-500",
  blue: "from-blue-500 via-sky-400 to-indigo-500",
};

// Dedicated Code Block component with copy functionality
const CodeBlock: React.FC<{ language?: string; codeString: string }> = ({ language, codeString }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 not-prose shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
        <span className="font-mono text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-indigo-400" />
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white flex items-center gap-1 text-[11px] text-slate-300 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">কপি হয়েছে</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>কপি করুন</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-emerald-400 bg-slate-950 leading-relaxed">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

// Static Markdown Renderers to prevent React 19 static flag issues and invalid DOM nesting
const markdownComponents = {
  pre: ({ children }: any) => <div className="my-1">{children}</div>,
  code: ({ className, children }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children || "").replace(/\n$/, "");
    
    if (match || codeString.includes("\n")) {
      return <CodeBlock language={match?.[1]} codeString={codeString} />;
    }
    
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-slate-800/90 text-indigo-300 font-mono text-xs border border-slate-700/50">
        {children}
      </code>
    );
  },
  p: ({ children }: any) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="my-0.5">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold text-white mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold text-indigo-300 mt-2 mb-1">{children}</h3>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-3 border-indigo-500 pl-3 italic text-slate-300 my-2 bg-indigo-950/20 py-1 rounded-r-lg">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-2xl border border-slate-800 bg-slate-950/80 shadow-md">
      <table className="w-full text-xs text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-slate-900 text-slate-200 border-b border-slate-800">{children}</thead>,
  tbody: ({ children }: any) => <tbody className="divide-y divide-slate-800/60">{children}</tbody>,
  tr: ({ children }: any) => <tr className="hover:bg-slate-900/40 transition-colors">{children}</tr>,
  th: ({ children }: any) => <th className="py-2.5 px-3.5 font-semibold text-slate-200">{children}</th>,
  td: ({ children }: any) => <td className="py-2 px-3.5 text-slate-300">{children}</td>,
  a: ({ href, children, ...props }: any) => {
    const isDownload = href?.includes("download") || href?.endsWith(".html");
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        download={isDownload ? true : undefined}
        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors px-1 py-0.5 rounded-sm hover:bg-slate-800"
        {...props}
      >
        {children}
      </a>
    );
  },
};

const BotMarkdownMessage: React.FC<{ text: string }> = React.memo(({ text }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-slate-200">
      <ReactMarkdown components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
});

BotMarkdownMessage.displayName = "BotMarkdownMessage";

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendPrompt: (prompt: string) => void;
  onRetry: (promptOverride?: string) => void;
  onFeedbackMessage?: (messageId: string, feedback: "like" | "dislike" | null) => void;
  onOpenModal?: (type: ModalType) => void;
  user: UserProfile | null;
  onDeleteMessage?: (messageId: string) => void;
  onClearActiveChat?: () => void;
  selectedModel: GeminiModelId;
  activeSessionTitle?: string;
  systemSettings?: SystemSettingsConfig | null;
  onPlayAudioTrack?: (track: UniversalSearchResultItem, queue: UniversalSearchResultItem[]) => void;
  onToggleFavorite?: (track: UniversalSearchResultItem) => void;
  onAddToPlaylist?: (track: UniversalSearchResultItem) => void;
  favoriteIds?: Set<string>;
  playlistIds?: Set<string>;
  activeTrackId?: string;
  isAudioPlaying?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSendPrompt,
  onRetry,
  onFeedbackMessage,
  onOpenModal,
  user,
  onDeleteMessage,
  onClearActiveChat,
  selectedModel,
  activeSessionTitle,
  systemSettings,
  onPlayAudioTrack,
  onToggleFavorite,
  onAddToPlaylist,
  favoriteIds,
  playlistIds,
  activeTrackId,
  isAudioPlaying,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const readAloudAllowed = systemSettings?.readAloudEnabled !== false;

  // Cancel any active speech synthesis on unmount
  useEffect(() => {
    return () => {
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    };
  }, []);

  const stopReading = () => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    setSpeakingId(null);
    setSpeechPaused(false);
  };

  const startReading = (msgId: string, rawText: string) => {
    if (!speechSupported || !readAloudAllowed) return;
    const clean = stripMarkdownForSpeech(rawText);
    if (!clean) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      const hasBangla = /[\u0980-\u09FF]/.test(clean);
      utterance.lang = hasBangla ? "bn-BD" : "en-US";
      const voices = window.speechSynthesis.getVoices();
      if (hasBangla) {
        const bnVoiceResult = findBestBanglaVoice(voices);
        if (bnVoiceResult.voice) utterance.voice = bnVoiceResult.voice;
      } else {
        const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
        if (enVoice) utterance.voice = enVoice;
      }
      utterance.rate = Number(systemSettings?.liveVoiceSpeed || 1.0) || 1.0;

      utterance.onend = () => {
        setSpeakingId((cur) => (cur === msgId ? null : cur));
        setSpeechPaused(false);
      };
      utterance.onerror = () => {
        setSpeakingId((cur) => (cur === msgId ? null : cur));
        setSpeechPaused(false);
      };

      setSpeakingId(msgId);
      setSpeechPaused(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingId(null);
      setSpeechPaused(false);
    }
  };

  const togglePauseResume = () => {
    if (!speechSupported) return;
    try {
      if (speechPaused) {
        window.speechSynthesis.resume();
        setSpeechPaused(false);
      } else {
        window.speechSynthesis.pause();
        setSpeechPaused(true);
      }
    } catch {
      stopReading();
    }
  };

  const handleShare = async (id: string, text: string) => {
    try {
      if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
        await (navigator as any).share({
          title: brandName,
          text,
        });
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2000);
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setSharedId(id);
      setTimeout(() => setSharedId(null), 2000);
    } catch {}
  };

  const brandName = systemSettings?.aiBrandName || "Sajjat Ai";
  const creatorName = systemSettings?.creatorName || "Sajjat Mia";
  const activeThemeColor = systemSettings?.aiThemeColor || "indigo";
  const themeGradient = THEME_GRADIENTS[activeThemeColor] || THEME_GRADIENTS.indigo;
  const welcomeTitle = systemSettings?.aiWelcomeTitle || `স্বাগতম! আমি ${brandName}`;
  const welcomeSubtitle = systemSettings?.aiWelcomeSubtitle || `আমাকে তৈরি করেছেন ${creatorName} মানুষের সেবার জন্য। পড়াশোনা, গণিত, বিজ্ঞান, প্রযুক্তি, কোডিং বা যেকোনো প্রশ্নের দ্রুত ও নির্ভুল উত্তরের জন্য আমাকে প্রশ্ন করুন।`;

  const renderAvatarIcon = (size: "sm" | "lg" = "sm") => {
    const cls = size === "lg" ? "w-9 h-9 text-indigo-400 animate-pulse" : "w-4 h-4";
    switch (systemSettings?.aiAvatarIcon) {
      case "brain":
        return <BrainCircuit className={cls} />;
      case "zap":
        return <Zap className={cls} />;
      case "sparkles":
        return <Sparkles className={cls} />;
      case "star":
        return <Star className={cls} />;
      case "bot":
      default:
        return <Bot className={cls} />;
    }
  };

  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };



  const suggestionChips = [
    {
      title: "ছবি তৈরি করুন (AI Art)",
      desc: "যেকোনো দৃশ্যের ছবি আঁকুন (Sajjat AI লোগোযুক্ত)",
      prompt: "একটি সুন্দর বাংলাদেশি নদী ও সূর্যাস্তের ছবি এঁকে দাও",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />
    },
    {
      title: "Sajjat কে?",
      desc: "মালিক ও নির্মাতার পরিচয়",
      prompt: "Sajjat কে?",
      icon: <BrainCircuit className="w-4 h-4 text-indigo-400" />
    },
    {
      title: "SSC ২০২৭ পড়ার রুটিন",
      desc: "পড়াশোনা ও পরীক্ষার প্রস্তুতি",
      prompt: "SSC ২০২৭ পরীক্ষার জন্য একটি চমৎকার দৈনিক পড়ার রুটিন তৈরি করে দাও।",
      icon: <GraduationCap className="w-4 h-4 text-amber-400" />
    },
    {
      title: "কোডিং ও প্রোগ্রামিং",
      desc: "HTML, JS বা Python সমাধান",
      prompt: "JavaScript দিয়ে একটি আধুনিক রেসপনসিভ ক্যালকুলেটরের কোড লিখে দাও।",
      icon: <Code className="w-4 h-4 text-emerald-400" />
    },
    {
      title: "গান ও অডিও খুঁজুন",
      desc: "বাংলা/ইংরেজি গান, পডকাস্ট ও ইন-অ্যাপ প্লেয়ার",
      prompt: "বাংলা রোমান্টিক ও জনপ্রিয় গান খুঁজে দিন",
      icon: <Radio className="w-4 h-4 text-cyan-400" />
    },
    {
      title: "ভিডিও ও সংবাদ সার্চ",
      desc: "YouTube ভিডিও ও সর্বশেষ যাচাইকৃত খবর",
      prompt: "আজকের সর্বশেষ প্রযুক্তি ও বিশ্ব সংবাদ খুঁজে দিন",
      icon: <Compass className="w-4 h-4 text-rose-400" />
    }
  ];

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Active Chat Subheader Bar */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-md">
              {activeSessionTitle || "বর্তমান কথোপকথন"}
            </span>
            <span className="hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
              {messages.length}টি মেসেজ
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Model Indicator */}
            <button
              onClick={() => onOpenModal && onOpenModal("settings")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-indigo-500/30 text-[11px] text-slate-300 hover:border-indigo-500 transition-colors"
              title="মডেল পরিবর্তন করতে সেটিংস খুলুন"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="font-semibold text-white">{currentModelInfo.name}</span>
            </button>

            {/* Clear active chat */}
            {onClearActiveChat && (
              <button
                onClick={onClearActiveChat}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                title="এই চ্যাটটি মুছে ফেলুন"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline text-rose-300">চ্যাট মুছুন</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 space-y-5 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {/* Empty State / Welcome Screen */}
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-8 md:py-14 flex flex-col items-center text-center">
            {/* Logo Badge */}
            <div className="relative mb-5">
              <div className={`w-18 h-18 rounded-3xl bg-gradient-to-tr ${themeGradient} p-0.5 shadow-xl shadow-indigo-500/25 flex items-center justify-center`}>
                <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                  {renderAvatarIcon("lg")}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                Online
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
              {welcomeTitle}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mb-6 leading-relaxed">
              {welcomeSubtitle}
            </p>

            {/* Quick Suggestion Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left mb-4">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={`suggestion_chip_${idx}_${chip.title}`}
                  onClick={() => onSendPrompt(chip.prompt)}
                  className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/40 transition-all group flex items-start gap-3 text-left shadow-sm active:scale-[0.98]"
                >
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                    {chip.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {chip.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {chip.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Current Active Model Notice with Settings Link */}
            {onOpenModal && (
              <button
                type="button"
                onClick={() => onOpenModal("settings")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>সক্রিয় মডেল: <strong className="text-white">{currentModelInfo.name}</strong></span>
                <span className="text-indigo-400 font-medium ml-1 flex items-center gap-0.5">
                  <Settings className="w-3 h-3" /> সেটিংস
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === "user";
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id ? `msg_${msg.id}_${idx}` : `msg_fallback_${idx}_${msg.timestamp || Date.now()}`}
                  className={`group/msg flex gap-3 md:gap-4 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {isUser ? (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
                        {user?.displayName ? user.displayName[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${themeGradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/20`}>
                        {renderAvatarIcon("sm")}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] flex flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {isUser ? (user?.displayName || "আপনি") : brandName}
                      </span>
                      {msg.isPersonalQA && (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-medium">
                          যাচাইকৃত তথ্য
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString("bn-BD", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Attached Image (if any) */}
                    {msg.imageBase64 && (
                      <div className="mb-2 max-w-sm rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-md">
                        <img
                          src={msg.imageBase64}
                          alt="সংযুক্ত ছবি"
                          className="max-h-60 w-auto object-contain"
                        />
                      </div>
                    )}

                    {/* Attached File Preview (if any) */}
                    {msg.attachedFile && !msg.attachedFile.isImage && (
                      <div className="mb-2 flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-xs">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                          {msg.attachedFile.name.match(/\.(js|jsx|ts|tsx|py|html|css|json)$/i) ? (
                            <FileCode className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 pr-1">
                          <p className="font-semibold text-white truncate max-w-[200px]">
                            {msg.attachedFile.name}
                          </p>
                          <span className="text-[10px] text-slate-400">সংযুক্ত ডকুমেন্ট / কোড</span>
                        </div>
                      </div>
                    )}

                    {/* Content Box */}
                    <div
                      className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs border border-indigo-500/40"
                          : "bg-slate-900/95 border border-slate-800 text-slate-100 rounded-tl-xs shadow-md"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <BotMarkdownMessage text={msg.text} />
                      )}
                    </div>

                    {/* AI Generated Image with Sajjat AI Watermark */}
                    {msg.generatedImageUrl && (
                      <GeneratedImageCard
                        imageUrl={msg.generatedImageUrl}
                        prompt={msg.generatedImagePrompt || msg.text}
                        onRegenerate={(p) => onSendPrompt(p)}
                      />
                    )}

                    {/* Universal Internet, Video, Audio, Image & Document Search Results */}
                    {msg.universalSearch && (
                      <SearchResultsBlock
                        payload={msg.universalSearch}
                        onPlayAudioTrack={onPlayAudioTrack || (() => {})}
                        onToggleFavorite={onToggleFavorite || (() => {})}
                        onAddToPlaylist={onAddToPlaylist || (() => {})}
                        favoriteIds={favoriteIds || new Set()}
                        playlistIds={playlistIds || new Set()}
                        activeTrackId={activeTrackId}
                        isAudioPlaying={isAudioPlaying}
                        downloadPermissionEnabled={
                          systemSettings?.universalSearch?.downloadPermissionEnabled !== false
                        }
                      />
                    )}

                    {/* Actions for Message (Copy, Like, Dislike, Read Aloud, Retry, Share, Delete) */}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5 px-1 text-slate-400">
                      {/* Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800/80 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="কপি করুন"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">কপি হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">কপি</span>
                          </>
                        )}
                      </button>

                      {/* Bot-only feedback, speech, retry, and share actions */}
                      {!isUser && (
                        <>
                          {/* Like */}
                          {onFeedbackMessage && (
                            <button
                              type="button"
                              onClick={() =>
                                onFeedbackMessage(
                                  msg.id,
                                  msg.feedback === "like" ? null : "like"
                                )
                              }
                              className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                                msg.feedback === "like"
                                  ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                                  : "hover:text-emerald-400 hover:bg-slate-800/80"
                              }`}
                              title="পছন্দ হয়েছে (Like)"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Dislike */}
                          {onFeedbackMessage && (
                            <button
                              type="button"
                              onClick={() =>
                                onFeedbackMessage(
                                  msg.id,
                                  msg.feedback === "dislike" ? null : "dislike"
                                )
                              }
                              className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                                msg.feedback === "dislike"
                                  ? "text-rose-400 bg-rose-500/15 border border-rose-500/30"
                                  : "hover:text-rose-400 hover:bg-slate-800/80"
                              }`}
                              title="উন্নতি প্রয়োজন (Dislike)"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Read Aloud / Pause / Resume / Stop Reading */}
                          {readAloudAllowed && (
                            speakingId === msg.id ? (
                              <div className="inline-flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/30 rounded-lg px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={togglePauseResume}
                                  className="p-1 text-indigo-300 hover:text-white flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                                  title={speechPaused ? "চালু করুন (Resume)" : "বিরতি (Pause)"}
                                >
                                  {speechPaused ? (
                                    <>
                                      <Play className="w-3 h-3" />
                                      <span>Resume</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-3 h-3" />
                                      <span>Pause</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={stopReading}
                                  className="p-1 text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                                  title="পড়া বন্ধ করুন (Stop Reading)"
                                >
                                  <Square className="w-3 h-3 fill-current" />
                                  <span>Stop</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={!speechSupported}
                                onClick={() => startReading(msg.id, msg.text)}
                                className="p-1.5 rounded-lg hover:text-indigo-300 hover:bg-slate-800/80 transition-colors text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                                title={
                                  speechSupported
                                    ? "পড়ে শোনান (Read Aloud)"
                                    : "এই ব্রাউজারে স্পিচ সিনথেসিস সমর্থিত নয়"
                                }
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] hidden sm:inline">শুনুন</span>
                              </button>
                            )
                          )}

                          {/* Retry */}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => {
                              const prevUser = [...messages.slice(0, idx)]
                                .reverse()
                                .find((m) => m.sender === "user");
                              onRetry(prevUser?.text);
                            }}
                            className="p-1.5 rounded-lg hover:text-amber-300 hover:bg-slate-800/80 transition-colors text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                            title="আবার চেষ্টা করুন (Retry)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">Retry</span>
                          </button>

                          {/* Share */}
                          <button
                            type="button"
                            onClick={() => handleShare(msg.id, msg.text)}
                            className="p-1.5 rounded-lg hover:text-cyan-300 hover:bg-slate-800/80 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                            title="শেয়ার করুন"
                          >
                            {sharedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-[10px] text-cyan-400">শেয়ার/কপি হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] hidden sm:inline">শেয়ার</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {/* Delete single message */}
                      {onDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(msg.id)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs flex items-center gap-1 text-slate-500 cursor-pointer"
                          title="এই মেসেজটি মুছুন"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400/80" />
                          <span className="text-[10px] text-rose-400/80">মুছুন</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center gap-3 shadow-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping delay-150"></span>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping delay-300"></span>
                  </div>
                  <span className="text-slate-300 font-medium">
                    Sajjat AI চিন্তা করছে এবং উত্তর প্রস্তুত করছে...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 transition-all animate-bounce z-10 border border-indigo-400/30"
          title="নিচে যান"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
