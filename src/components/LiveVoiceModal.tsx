import React, { useEffect } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  RefreshCw,
  X,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { GeminiModelId } from "../types";
import { useSajjatVoiceEngine } from "../hooks/useSajjatVoiceEngine";

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: GeminiModelId;
  aiBrandName?: string;
  onSendToChat?: (userText: string, botReply: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  aiBrandName = "Sajjat Ai",
}) => {
  const {
    callState,
    isConnected,
    connectionMode,
    statusMessage,
    errorDetail,
    userTranscript,
    aiTranscript,
    formattedDuration,
    micLevel,
    sessionTag,
    isMuted,
    toggleMute,
    audioEnabled,
    toggleSpeaker,
    startSession,
    endSession,
  } = useSajjatVoiceEngine({
    mode: "call",
    aiBrandName,
    language: "bn",
  });

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      endSession();
    }
  }, [isOpen, startSession, endSession]);

  const handleEndCall = () => {
    endSession();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl shadow-purple-950/50 p-6 flex flex-col items-center justify-between min-h-[520px] text-white relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            ) : callState === "connecting" ? (
              <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="text-xs font-semibold text-purple-300">
              {connectionMode === "netlify_loop"
                ? `${aiBrandName} Live Voice (Netlify)`
                : `${aiBrandName} Live Voice Call`}
            </span>
          </div>

          <div className="text-xs font-mono tabular-nums px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {isConnected ? formattedDuration : "--:--"}
          </div>

          <button
            type="button"
            onClick={handleEndCall}
            aria-label="উইন্ডো বন্ধ করুন"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Animated Avatar & Visualizer */}
        <div className="my-auto py-4 flex flex-col items-center justify-center space-y-5 z-10 w-full">
          <div className="relative">
            {(callState === "speaking" || (callState === "listening" && micLevel > 8)) && (
              <>
                <div className="absolute inset-0 -m-4 rounded-full border border-purple-500/35 animate-ping opacity-35" />
                <div className="absolute inset-0 -m-7 rounded-full border border-indigo-500/25 animate-pulse opacity-40" />
              </>
            )}

            <div
              className={`w-28 h-28 rounded-3xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-cyan-500 p-0.5 shadow-2xl transition-transform ${
                callState === "speaking"
                  ? "scale-105 shadow-purple-500/40"
                  : "shadow-indigo-500/20"
              }`}
            >
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Bot
                  className={`w-14 h-14 transition-colors ${
                    callState === "speaking"
                      ? "text-purple-400 animate-bounce"
                      : callState === "error" || callState === "permission_denied"
                      ? "text-rose-400"
                      : "text-indigo-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Status & Real Mic Level Meter */}
          <div className="text-center space-y-2 w-full">
            <h3 className="text-lg font-bold text-white tracking-tight">{aiBrandName}</h3>

            <p className="text-xs font-medium flex items-center justify-center gap-1.5">
              {callState === "connecting" && (
                <span className="text-purple-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{statusMessage || "সংযোগ হচ্ছে..."}</span>
                </span>
              )}
              {callState === "listening" && (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isMuted ? "মাইক্রোফোন মিউট করা আছে" : statusMessage}</span>
                </span>
              )}
              {callState === "thinking" && (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{statusMessage}</span>
                </span>
              )}
              {callState === "speaking" && (
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{statusMessage}</span>
                </span>
              )}
              {(callState === "error" || callState === "permission_denied") && (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{statusMessage}</span>
                </span>
              )}
            </p>

            {/* Real Live Mic Audio Level Bar */}
            {isConnected && (
              <div className="w-48 mx-auto space-y-1">
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      isMuted ? "bg-rose-500/40" : "bg-gradient-to-r from-purple-500 to-cyan-400"
                    }`}
                    style={{ width: `${isMuted ? 0 : Math.max(4, micLevel)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  {isMuted
                    ? "মাইক্রোফোন মিউট"
                    : micLevel > 5
                    ? "মাইক্রোফোন অডিও গৃহীত হচ্ছে"
                    : "কথা বলুন (বাংলা বা ইংরেজিতে)"}
                </p>
              </div>
            )}
          </div>

          {/* Error / Permission Denied Panel OR Real-time Transcripts */}
          {callState === "error" || callState === "permission_denied" ? (
            <div className="w-full p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs space-y-3 text-left">
              <p className="text-rose-200 leading-relaxed">{errorDetail}</p>
              <button
                type="button"
                onClick={startSession}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>পুনরায় সংযোগ চেষ্টা করুন</span>
              </button>
            </div>
          ) : (
            <div className="w-full max-h-36 overflow-y-auto px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs leading-relaxed space-y-1.5">
              {userTranscript && (
                <p className="text-purple-300 font-medium">আপনি: {userTranscript}</p>
              )}
              {aiTranscript ? (
                <p className="text-slate-200">
                  {aiBrandName}: {aiTranscript}
                </p>
              ) : (
                <p className="text-slate-500 text-center">
                  {callState === "connecting"
                    ? `মাইক্রোফোন এবং ${aiBrandName} ভয়েস সেশন প্রস্তুত করা হচ্ছে...`
                    : "সরাসরি বাংলা বা ইংরেজিতে কথা বলুন, AI কণ্ঠে উত্তর দেবে।"}
                </p>
              )}
              {sessionTag && (
                <p className="text-[10px] text-slate-600 font-mono truncate">সেশন: {sessionTag}</p>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="w-full flex items-center justify-center gap-4 z-10 pt-4 border-t border-slate-800/80">
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={toggleMute}
            disabled={!isConnected}
            className={`min-h-[48px] min-w-[48px] p-3.5 rounded-2xl border transition-all active:scale-95 cursor-pointer disabled:opacity-40 ${
              isMuted
                ? "bg-rose-950/60 border-rose-500/40 text-rose-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title={isMuted ? "মাইক্রোফোন আনমিউট করুন" : "মাইক্রোফোন মিউট করুন"}
            aria-label={isMuted ? "মাইক্রোফোন আনমিউট করুন" : "মাইক্রোফোন মিউট করুন"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Red End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="min-h-[56px] min-w-[56px] p-4 rounded-3xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="কল শেষ করুন"
            aria-label="কল শেষ করুন"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Sound Toggle */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`min-h-[48px] min-w-[48px] p-3.5 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
              !audioEnabled
                ? "bg-amber-950/60 border-amber-500/40 text-amber-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title={audioEnabled ? "স্পিকার মিউট করুন" : "স্পিকার চালু করুন"}
            aria-label={audioEnabled ? "স্পিকার মিউট করুন" : "স্পিকার চালু করুন"}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
