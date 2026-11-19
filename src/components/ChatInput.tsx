import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  FileCode, 
  X,
  Sparkles,
  Mic,
  MicOff,
  PhoneCall
} from "lucide-react";
import { AttachedFile, SystemSettingsConfig } from "../types";
import type { PublicAiCapabilities } from "../api";

interface ChatInputProps {
  onSendMessage: (text: string, attachedFile?: AttachedFile) => void;
  isLoading: boolean;
  onOpenImageGenerator?: () => void;
  onStartVoiceCall?: () => void;
  systemSettings?: SystemSettingsConfig | null;
  aiCapabilities?: PublicAiCapabilities | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onOpenImageGenerator,
  onStartVoiceCall,
  systemSettings,
  aiCapabilities,
}) => {
  const canFileUpload = aiCapabilities?.supportedFeatures?.fileUpload !== false;
  const canImageVision = aiCapabilities?.supportedFeatures?.imageVision !== false;
  const canImageGen = aiCapabilities?.supportedFeatures?.imageGen !== false;
  const canVoice = aiCapabilities?.supportedFeatures?.voice !== false;
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        130
      )}px`;
    }
  }, [text]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Web Speech Recognition (Bengali & English)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("আপনার ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয়। অনুগ্রহ করে Google Chrome বা আধুনিক ব্রাউজার ব্যবহার করুন।");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "bn-BD";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setIsListening(false);
    }
  };

  // Image Upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন।");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        base64: reader.result as string,
        isImage: true,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Document or Code File Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      handleImageSelect(e);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type || "text/plain",
        content: content,
        isImage: false,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !attachedFile) || isLoading) return;

    onSendMessage(text.trim(), attachedFile || undefined);
    setText("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: AttachedFile) => {
    if (file.isImage) return <ImageIcon className="w-4 h-4 text-cyan-400" />;
    if (file.name.match(/\.(js|jsx|ts|tsx|py|html|css|cpp|c|java|json)$/i)) {
      return <FileCode className="w-4 h-4 text-emerald-400" />;
    }
    return <FileText className="w-4 h-4 text-indigo-400" />;
  };

  const canSend = (text.trim().length > 0 || attachedFile !== null) && !isLoading;

  return (
    <div className="p-2.5 sm:p-3.5 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-lg">
      <div className="max-w-3xl mx-auto space-y-1.5">
        {/* Attached File / Image Preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 p-2 bg-slate-950 border border-indigo-500/40 rounded-2xl w-fit max-w-full shadow-lg animate-in fade-in">
            {attachedFile.isImage && attachedFile.base64 ? (
              <img
                src={attachedFile.base64}
                alt="প্রিভিউ"
                className="w-10 h-10 object-cover rounded-xl border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
                {getFileIcon(attachedFile)}
              </div>
            )}
            
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                {attachedFile.name}
              </p>
              <span className="text-[10px] text-slate-400">
                {formatFileSize(attachedFile.size)} • {attachedFile.isImage ? "ছবি" : "ডকুমেন্ট / কোড"}
              </span>
            </div>

            <button
              onClick={removeAttachedFile}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors ml-1"
              title="ফাইল বাদ দিন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Input Bar */}
        <div className="relative flex items-end gap-1 sm:gap-1.5 bg-slate-950/90 border border-slate-800 focus-within:border-indigo-500/70 focus-within:ring-1 focus-within:ring-indigo-500/30 rounded-2xl p-1.5 sm:p-2 transition-all shadow-inner">
          {/* Document / Any File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.csv,.c,.cpp,.java,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            disabled={!canFileUpload}
            onClick={() => canFileUpload && fileInputRef.current?.click()}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              canFileUpload
                ? "text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 cursor-pointer"
                : "text-slate-600 opacity-45 cursor-not-allowed"
            }`}
            title={
              canFileUpload
                ? "ফাইল বা কোড আপলোড করুন (.txt, .js, .py, .html, ইত্যাদি)"
                : "সক্রিয় AI Provider ফাইল আপলোড সমর্থন করে না"
            }
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          {/* Image Upload */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            disabled={!canImageVision}
            onClick={() => canImageVision && imageInputRef.current?.click()}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              canImageVision
                ? "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 cursor-pointer"
                : "text-slate-600 opacity-45 cursor-not-allowed"
            }`}
            title={
              canImageVision
                ? "ছবি সংযুক্ত করুন"
                : "সক্রিয় AI Provider Image Vision সমর্থন করে না"
            }
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>

          {/* AI Image Generation Studio Tool */}
          <button
            type="button"
            disabled={!canImageGen}
            onClick={() => {
              if (!canImageGen) return;
              if (onOpenImageGenerator) {
                onOpenImageGenerator();
              } else {
                setText((prev) => (prev ? `ছবি তৈরি করো: ${prev}` : "ছবি তৈরি করো: "));
                textareaRef.current?.focus();
              }
            }}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              canImageGen
                ? "text-slate-400 hover:text-purple-400 hover:bg-slate-800/80 cursor-pointer"
                : "text-slate-600 opacity-45 cursor-not-allowed"
            }`}
            title={
              canImageGen
                ? `${systemSettings?.aiBrandName || "Sajjat Ai"} দিয়ে ছবি তৈরি করুন (AI Art Generator)`
                : "সক্রিয় AI Provider ছবি তৈরি সমর্থন করে না"
            }
          >
            <Sparkles className={`w-4.5 h-4.5 ${canImageGen ? "text-purple-400" : "text-slate-600"}`} />
          </button>

          {/* Live Voice Call Button in Input Dock */}
          {onStartVoiceCall && (
            <button
              type="button"
              disabled={!canVoice}
              onClick={() => canVoice && onStartVoiceCall()}
              className={`p-2 rounded-xl transition-colors shrink-0 ${
                canVoice
                  ? "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 cursor-pointer"
                  : "text-slate-600 opacity-45 cursor-not-allowed"
              }`}
              title={
                canVoice
                  ? "সরাসরি ভয়েস কল মোড"
                  : "সক্রিয় AI Provider লাইভ ভয়েস সমর্থন করে না"
              }
            >
              <PhoneCall className={`w-4.5 h-4.5 ${canVoice ? "text-cyan-400" : "text-slate-600"}`} />
            </button>
          )}

          {/* Microphone Speech to Text Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
              isListening
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80"
            }`}
            title={isListening ? "ভয়েস রেকর্ডিং বন্ধ করুন" : "মুখে বাংলায় বলে টাইপ করুন (Voice Input)"}
          >
            {isListening ? (
              <MicOff className="w-4.5 h-4.5 text-rose-400" />
            ) : (
              <Mic className="w-4.5 h-4.5 text-emerald-400" />
            )}
          </button>

          {/* Main textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFile
                ? "সংযুক্ত ফাইল সম্পর্কে লিখুন..."
                : `${systemSettings?.aiBrandName || "Sajjat AI"}-কে যেকোনো প্রশ্ন করুন...`
            }
            rows={1}
            className="flex-1 max-h-32 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none py-1.5 px-1 scrollbar-thin scrollbar-thumb-slate-800"
          />

          {/* Send Button */}
          <button
            id="send-message-btn"
            type="button"
            onClick={() => handleSubmit()}
            disabled={!canSend}
            className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              canSend
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer"
                : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
            }`}
            title="পাঠান (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Footer Hints */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-medium">{systemSettings?.aiBrandName || "Sajjat AI"}</span>
            <span>•</span>
            <span>বাংলা ও ইংরেজিতে পারদর্শী</span>
          </div>
          <span className="hidden sm:inline">
            নতুন লাইনের জন্য Shift + Enter চাপুন
          </span>
        </div>
      </div>
    </div>
  );
};
