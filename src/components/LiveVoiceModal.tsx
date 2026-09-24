import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Languages,
  Sparkles,
  MessageSquare,
  Bot,
  ChevronDown,
  ChevronUp,
  Radio,
  Send,
  Sliders,
  X,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import { UserProfile, SystemSettingsConfig } from "../types";
import { sendChatMessage } from "../api";

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onAddExchangeToChat?: (userMessage: string, aiReply: string) => void;
  systemSettings?: SystemSettingsConfig | null;
}

type LiveCallStatus = "connecting" | "listening" | "speaking" | "muted" | "error" | "closed";

interface VoiceOption {
  id: string;
  name: string;
  desc: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "Zephyr", name: "Zephyr", desc: "শান্ত ও স্বাভাবিক (ডিফল্ট)" },
  { id: "Kore", name: "Kore", desc: "মধুর ও শান্ত" },
  { id: "Puck", name: "Puck", desc: "প্রাণবন্ত ও হাসিখুশি" },
  { id: "Charon", name: "Charon", desc: "গম্ভীর ও আত্মবিশ্বাসী" },
  { id: "Fenrir", name: "Fenrir", desc: "দৃঢ় ও সুস্পষ্ট" },
  { id: "Aoede", name: "Aoede", desc: "মিষ্টি ও সুরেলা নারী কণ্ঠ" },
];

/**
 * Downsamples Float32Array from inputSampleRate to 16000Hz and converts to Int16Array
 */
function downsampleTo16kHz(buffer: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return result;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Converts an Int16Array buffer to Base64 string
 */
function int16ToBase64(int16Array: Int16Array): string {
  const len = int16Array.length;
  const bytes = new Uint8Array(len * 2);
  for (let i = 0; i < len; i++) {
    const val = int16Array[i];
    bytes[i * 2] = val & 0xff;
    bytes[i * 2 + 1] = (val >> 8) & 0xff;
  }
  let binary = "";
  const bytesLen = bytes.length;
  const chunkSize = 8192;
  for (let i = 0; i < bytesLen; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

/**
 * Converts Base64 raw 24kHz 16-bit PCM to Float32Array for Web Audio API playback
 */
function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const int16Length = Math.floor(len / 2);
  const float32 = new Float32Array(int16Length);
  for (let i = 0; i < int16Length; i++) {
    const byteIndex = i * 2;
    const low = binary.charCodeAt(byteIndex);
    const high = binary.charCodeAt(byteIndex + 1);
    let val = low | (high << 8);
    if (val & 0x8000) {
      val |= ~0xffff;
    }
    float32[i] = val / 32768.0;
  }
  return float32;
}

// Flawless Client-Side Google TTS Audio player for perfect Bengali on all devices
function playBengaliSpeechOnClient(
  text: string, 
  lang: "bn-BD" | "en-US", 
  onStart: () => void, 
  onEnd: () => void
): () => void {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // cancel any active browser TTS
    }

    const cleanText = text.replace(/[*_#`]|```[\s\S]*?```/g, " ").trim();
    if (!cleanText) {
      onEnd();
      return () => {};
    }

    const targetLang = lang === "en-US" ? "en" : "bn";
    
    // Split text into chunks of max 150 characters to keep within Google Translate's limit
    const sentences = cleanText.match(/[^,.;।!?\n]+[,.;।!?\n]*/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 150) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    if (chunks.length === 0) {
      onEnd();
      return () => {};
    }

    let currentIdx = 0;
    let audio: HTMLAudioElement | null = null;
    let isCancelled = false;

    onStart();

    const playNextChunk = () => {
      if (isCancelled) return;
      if (currentIdx >= chunks.length) {
        onEnd();
        return;
      }

      const chunkText = chunks[currentIdx];
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;
      
      audio = new Audio(ttsUrl);
      (audio as any).referrerPolicy = "no-referrer";
      audio.play().then(() => {
        if (isCancelled) {
          try { audio?.pause(); } catch {}
          return;
        }
        currentIdx++;
        audio!.onended = () => {
          playNextChunk();
        };
        audio!.onerror = () => {
          console.warn("Google TTS chunk playback failed, trying next chunk...");
          currentIdx++;
          playNextChunk();
        };
      }).catch((playErr) => {
        console.warn("Audio play blocked or failed. Falling back to native SpeechSynthesis:", playErr);
        if (isCancelled) return;
        playNativeSpeechFallback(cleanText, lang, onStart, onEnd);
      });
    };

    playNextChunk();

    return () => {
      isCancelled = true;
      if (audio) {
        try {
          audio.pause();
          audio.src = "";
        } catch {}
      }
    };
  } catch (err) {
    console.error("playBengaliSpeechOnClient error:", err);
    onEnd();
    return () => {};
  }
}

// Fallback native SpeechSynthesis if Audio playback is strictly blocked
function playNativeSpeechFallback(text: string, lang: "bn-BD" | "en-US", onStart: () => void, onEnd: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en-US" ? "en-US" : "bn-BD";
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.includes(lang === "en-US" ? "en" : "bn"));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd();
  }
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  user,
  onAddExchangeToChat,
  systemSettings,
}) => {
  const [callStatus, setCallStatus] = useState<LiveCallStatus>("connecting");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [language, setLanguage] = useState<"bn-BD" | "en-US">("bn-BD");
  const [selectedVoice, setSelectedVoice] = useState<string>(systemSettings?.liveVoiceName || "Zephyr");

  useEffect(() => {
    if (systemSettings?.liveVoiceName) {
      setSelectedVoice(systemSettings.liveVoiceName);
    }
  }, [systemSettings?.liveVoiceName]);
  const [showVoicePicker, setShowVoicePicker] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [aiVolume, setAiVolume] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [transcriptHistory, setTranscriptHistory] = useState<
    Array<{ id: string; role: "user" | "assistant"; text: string; time: string }>
  >([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [quickTextInput, setQuickTextInput] = useState<string>("");

  // Audio References
  const wsRef = useRef<WebSocket | null>(null);
  const speechRecRef = useRef<any>(null);
  const isBrowserNativeRef = useRef<boolean>(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const clientAudioCancelRef = useRef<(() => void) | null>(null);

  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const callStatusRef = useRef<LiveCallStatus>(callStatus);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const callTimerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const isComponentMounted = useRef<boolean>(true);
  const currentAiSpeechAccumulator = useRef<string>("");

  // Format call timer mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Sound effects
  const playTone = useCallback((type: "connect" | "disconnect" | "interrupt") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "connect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === "disconnect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === "interrupt") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {}
  }, []);

  // Stop all queued audio playback immediately (Barge-in / Interruption)
  const stopAllAudioPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setAiVolume(0);
    setCallStatus((prev) => (prev === "speaking" ? "listening" : prev));
  }, []);

  // Play incoming 24kHz PCM chunk from Gemini Live
  const playAudioChunk = useCallback((base64Data: string) => {
    try {
      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioCtx();
        const analyser = outputAudioCtxRef.current.createAnalyser();
        analyser.fftSize = 64;
        outputAnalyserRef.current = analyser;
        analyser.connect(outputAudioCtxRef.current.destination);
      }

      const ctx = outputAudioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const float32Data = base64ToFloat32(base64Data);
      if (float32Data.length === 0) return;

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect source to analyser and speaker destination
      if (outputAnalyserRef.current) {
        source.connect(outputAnalyserRef.current);
      } else {
        source.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setCallStatus("speaking");

      source.onended = () => {
        const index = activeSourcesRef.current.indexOf(source);
        if (index !== -1) activeSourcesRef.current.splice(index, 1);
        if (activeSourcesRef.current.length === 0 && ctx.currentTime >= nextStartTimeRef.current - 0.05) {
          setCallStatus("listening");
        }
      };
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  }, []);

  // Cleanup all audio resources and streams
  const cleanupAllAudio = useCallback(() => {
    // 1. Cancel volume animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 2. Stop microphone tracks
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      micStreamRef.current = null;
    }

    // 3. Disconnect script processor
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }

    // 4. Close input audio context
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== "closed") {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }

    // 5. Stop all audio playback
    stopAllAudioPlayback();

    // 6. Close output audio context
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== "closed") {
      try {
        outputAudioCtxRef.current.close();
      } catch {}
      outputAudioCtxRef.current = null;
    }

    // 7. Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    // 8. Stop speech recognition & synthesis if running natively
    if (clientAudioCancelRef.current) {
      try { clientAudioCancelRef.current(); } catch {}
      clientAudioCancelRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.onend = null;
        speechRecRef.current.onerror = null;
        speechRecRef.current.onresult = null;
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    isBrowserNativeRef.current = false;

    // 9. Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setMicVolume(0);
    setAiVolume(0);
  }, [stopAllAudioPlayback]);

  // Fallback: Browser Native Live Voice Mode (for Netlify, Vercel, or static hosts where WS server is missing)
  const startBrowserNativeVoice = useCallback(async () => {
    cleanupAllAudio();
    isBrowserNativeRef.current = true;
    setErrorMessage("");
    setCallStatus("connecting");
    setCallDuration(0);
    setLiveTranscript("");
    currentAiSpeechAccumulator.current = "";

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("আপনার ব্রাউজারে ভয়েস রিকগনিশন সাপোর্ট করে না। অনুগ্রহ করে Google Chrome, Microsoft Edge অথবা Mobile Chrome ব্রাউজার ব্যবহার করুন।");
      setCallStatus("error");
      return;
    }

    // Warm up microphone and set up audio visualizer bouncing animation!
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx();
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 64;
      micAnalyserRef.current = analyser;
      source.connect(analyser);

      const micDataArray = new Uint8Array(analyser.frequencyBinCount);

      // Start the bouncing animation loop
      const updateVolumeLoop = () => {
        if (!isComponentMounted.current) return;

        if (micAnalyserRef.current && !isMuted) {
          micAnalyserRef.current.getByteFrequencyData(micDataArray);
          let sum = 0;
          for (let i = 0; i < micDataArray.length; i++) {
            sum += micDataArray[i];
          }
          const avg = sum / micDataArray.length;
          setMicVolume(Math.min(1, avg / 128));
        } else {
          setMicVolume(0);
        }

        animFrameRef.current = requestAnimationFrame(updateVolumeLoop);
      };
      updateVolumeLoop();

    } catch (permErr: any) {
      console.error("Audio context visualization warmup failed or denied:", permErr);
      setErrorMessage("মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে মাইক্রোফোন অ্যাক্সেস চালু করুন।");
      setCallStatus("error");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      speechRecRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language === "en-US" ? "en-US" : "bn-BD";

      rec.onstart = () => {
        setCallStatus("listening");
        playTone("connect");
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      };

      rec.onresult = async (event: any) => {
        let interim = "";
        let finalSpeech = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSpeech += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setLiveTranscript(interim);
          setMicVolume(0.8);
        }

        if (finalSpeech.trim()) {
          const userText = finalSpeech.trim();
          setLiveTranscript(`"${userText}"`);
          setMicVolume(0);

          const nowTime = new Date().toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
          setTranscriptHistory((prev) => [
            ...prev,
            { id: `user_${Date.now()}`, role: "user", text: userText, time: nowTime }
          ]);

          try { rec.stop(); } catch {}

          setCallStatus("speaking");
          setLiveTranscript("Sajjat AI উত্তর তৈরি করছে...");

          try {
            const aiResponse = await sendChatMessage({ message: userText });
            const replyText = aiResponse.reply || "আমি আপনার বার্তা পেয়েছি।";

            setLiveTranscript(replyText);
            setTranscriptHistory((prev) => [
              ...prev,
              { id: `ai_${Date.now()}`, role: "assistant", text: replyText, time: nowTime }
            ]);
            if (onAddExchangeToChat) {
              onAddExchangeToChat(userText, replyText);
            }

            // High-fidelity chunked Google TTS Audio Player with native fallback
            if (clientAudioCancelRef.current) {
              clientAudioCancelRef.current();
            }

            const cleanSpeech = replyText.replace(/[*_#`]|```[\s\S]*?```/g, " ").trim();
            
            const cancelTTS = playBengaliSpeechOnClient(
              cleanSpeech,
              language,
              () => {
                setCallStatus("speaking");
                setAiVolume(0.85); // Bounce visualizer loudly when AI speaks!
              },
              () => {
                setAiVolume(0);
                setCallStatus("listening");
                try { rec.start(); } catch {}
              }
            );

            clientAudioCancelRef.current = cancelTTS || null;

          } catch (chatErr) {
            console.error("Chat message failed in browser native voice:", chatErr);
            setCallStatus("listening");
            try { rec.start(); } catch {}
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn("SpeechRecognition error:", e);
        if (e.error !== "no-speech" && e.error !== "aborted") {
          setErrorMessage("কথা শুনতে পাওয়া যায়নি। অনুগ্রহ করে আবার বলুন।");
        }
      };

      rec.onend = () => {
        if (isBrowserNativeRef.current && callStatusRef.current === "listening") {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
    } catch (err: any) {
      console.error("Browser native voice error:", err);
      setErrorMessage("লাইভ ভয়েস চালু করতে সমস্যা হয়েছে: " + err.message);
      setCallStatus("error");
    }
  }, [cleanupAllAudio, language, playTone, onAddExchangeToChat, systemSettings, callStatus, isMuted]);

  // Start the live bidirectional session
  const startLiveSession = useCallback(async () => {
    cleanupAllAudio();
    setErrorMessage("");

    if (systemSettings && systemSettings.liveVoiceEnabled === false) {
      setErrorMessage(
        systemSettings.liveVoiceNotice || "লাইভ ভয়েস চ্যাট সাময়িকভাবে অ্যাডমিন কর্তৃক বন্ধ রয়েছে।"
      );
      setCallStatus("error");
      return;
    }

    // Detect if running on Netlify or another static hosting environment
    const isNetlify = typeof window !== "undefined" && (
      window.location.hostname.includes("netlify.app") || 
      window.location.hostname.includes("netlify.com") || 
      (window.location.hostname.includes("localhost") === false && 
       window.location.hostname.includes("asia-southeast1.run.app") === false &&
       window.location.hostname.includes("google.com") === false)
    );

    if (isNetlify) {
      console.log("[LiveVoiceModal] Netlify static host detected. Starting ultra-reliable high-fidelity browser native live voice mode instantly.");
      startBrowserNativeVoice();
      return;
    }

    setCallStatus("connecting");
    setCallDuration(0);
    setLiveTranscript("");
    currentAiSpeechAccumulator.current = "";

    // 1. Request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      micStreamRef.current = stream;
    } catch (permErr: any) {
      console.error("Microphone permission denied:", permErr);
      setErrorMessage(
        "মাইক্রোফোন পারমিশন প্রয়োজন। ব্রাউজার সেটিংসে গিয়ে মাইক্রোফোন অ্যাক্সেস এলাও (Allow) করুন।"
      );
      setCallStatus("error");
      return;
    }

    // 2. Setup Web Audio API for 16kHz PCM capture and volume metering
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx();
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 64;
      micAnalyserRef.current = analyser;
      source.connect(analyser);

      // Buffer size: 2048 or 4096 samples (approx ~85ms at 48kHz)
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      const micDataArray = new Uint8Array(analyser.frequencyBinCount);
      const aiDataArray = new Uint8Array(32);

      // Visualizer animation loop
      const updateVolumeLoop = () => {
        if (!isComponentMounted.current) return;

        // User Mic volume
        if (micAnalyserRef.current && !isMuted) {
          micAnalyserRef.current.getByteFrequencyData(micDataArray);
          let sum = 0;
          for (let i = 0; i < micDataArray.length; i++) {
            sum += micDataArray[i];
          }
          const avg = sum / micDataArray.length;
          setMicVolume(Math.min(1, avg / 128));
        } else {
          setMicVolume(0);
        }

        // AI Output volume
        if (outputAnalyserRef.current && activeSourcesRef.current.length > 0) {
          outputAnalyserRef.current.getByteFrequencyData(aiDataArray);
          let sum = 0;
          for (let i = 0; i < aiDataArray.length; i++) {
            sum += aiDataArray[i];
          }
          const avg = sum / aiDataArray.length;
          setAiVolume(Math.min(1, avg / 128));
        } else {
          setAiVolume(0);
        }

        animFrameRef.current = requestAnimationFrame(updateVolumeLoop);
      };
      updateVolumeLoop();

      // Downsample to 16kHz Int16 and send to WebSocket with subtle gain boost
      scriptProcessor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isMuted) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);
        // Apply 1.6x digital gain boost so the microphone audio is louder and clearer to Gemini
        const boostedBuffer = new Float32Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          boostedBuffer[i] = inputBuffer[i] * 1.6;
        }

        const pcm16 = downsampleTo16kHz(boostedBuffer, inputCtx.sampleRate);
        const base64Audio = int16ToBase64(pcm16);

        wsRef.current.send(
          JSON.stringify({
            type: "audio",
            data: base64Audio,
          })
        );
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);
    } catch (audioErr: any) {
      console.error("Web Audio setup error:", audioErr);
      setErrorMessage("অডিও সিস্টেম চালু করতে সমস্যা হয়েছে: " + audioErr.message);
      setCallStatus("error");
      return;
    }

    // 3. Connect to server WebSocket (/api/live)
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const customKey = localStorage.getItem("sajjat_custom_gemini_key") || "";
      const wsUrl = `${protocol}//${host}/api/live?voice=${encodeURIComponent(
        selectedVoice
      )}&lang=${encodeURIComponent(language)}${
        customKey ? `&key=${encodeURIComponent(customKey)}` : ""
      }`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to /api/live");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "connected") {
            setCallStatus("listening");
            playTone("connect");
            // Start call duration timer
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            callTimerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          } else if (msg.type === "audio" && msg.data) {
            playAudioChunk(msg.data);
          } else if (msg.type === "text" && msg.text) {
            currentAiSpeechAccumulator.current += msg.text;
            setLiveTranscript(currentAiSpeechAccumulator.current);
          } else if (msg.type === "interrupted") {
            // Barge-in detected by Gemini Live!
            playTone("interrupt");
            stopAllAudioPlayback();
            currentAiSpeechAccumulator.current = "";
          } else if (msg.type === "turnComplete") {
            const finalAiText = currentAiSpeechAccumulator.current.trim();
            if (finalAiText) {
              const nowTime = new Date().toLocaleTimeString("bn-BD", {
                hour: "2-digit",
                minute: "2-digit",
              });
              setTranscriptHistory((prev) => [
                ...prev,
                {
                  id: `ai_${Date.now()}`,
                  role: "assistant",
                  text: finalAiText,
                  time: nowTime,
                },
              ]);
              if (onAddExchangeToChat) {
                onAddExchangeToChat("🎙️ [লাইভ ভয়েস বার্তা]", finalAiText);
              }
            }
            currentAiSpeechAccumulator.current = "";
          } else if (msg.type === "error") {
            console.error("Live server error:", msg.error);
            setErrorMessage(msg.error || "Sajjat AI Live সংযোগে সমস্যা দেখা দিয়েছে।");
            setCallStatus("error");
          } else if (msg.type === "closed") {
            setCallStatus("closed");
          }
        } catch (parseErr) {
          console.error("Error parsing WS message:", parseErr);
        }
      };

      ws.onerror = (err) => {
        console.warn("Server WebSocket unavailable (e.g. Netlify/Static host). Activating Browser Native Live Voice Mode...", err);
        try { ws.close(); } catch {}
        startBrowserNativeVoice();
      };

      ws.onclose = () => {
        console.log("Live WebSocket closed");
        if (callStatus !== "error" && !isBrowserNativeRef.current) {
          setCallStatus("closed");
        }
      };
    } catch (wsErr: any) {
      console.warn("WebSocket creation failed, using Browser Native Live Voice Mode:", wsErr);
      startBrowserNativeVoice();
    }
  }, [
    cleanupAllAudio,
    isMuted,
    language,
    selectedVoice,
    onAddExchangeToChat,
    playTone,
    playAudioChunk,
    stopAllAudioPlayback,
    callStatus,
    startBrowserNativeVoice,
  ]);

  // Toggle Mute / Unmute
  const toggleMute = () => {
    if (isMuted) {
      // Unmute
      setIsMuted(false);
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
      }
      setCallStatus("listening");
    } else {
      // Mute
      setIsMuted(true);
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setCallStatus("muted");
      setMicVolume(0);
    }
  };

  // User manually interrupts AI speech ("আমি বলি" / "থামুন")
  const handleManualInterrupt = () => {
    playTone("interrupt");
    stopAllAudioPlayback();
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", text: " " }));
    } else if (isBrowserNativeRef.current && speechRecRef.current) {
      try { speechRecRef.current.start(); } catch {}
      setCallStatus("listening");
    }
  };

  // Send quick text into the live session
  const handleSendQuickText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = quickTextInput.trim();
    if (!text) return;

    setQuickTextInput("");
    const nowTime = new Date().toLocaleTimeString("bn-BD", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setTranscriptHistory((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: "user", text, time: nowTime },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", text }));
    } else {
      // Natively process quick text
      setCallStatus("speaking");
      setLiveTranscript("Sajjat AI উত্তর তৈরি করছে...");
      try {
        const aiResponse = await sendChatMessage({ message: text });
        const replyText = aiResponse.reply || "আমি আপনার কথা পেয়েছি।";

        setLiveTranscript(replyText);
        setTranscriptHistory((prev) => [
          ...prev,
          { id: `ai_${Date.now()}`, role: "assistant", text: replyText, time: nowTime },
        ]);
        if (onAddExchangeToChat) {
          onAddExchangeToChat(text, replyText);
        }

        // High-fidelity chunked Google TTS Audio Player with native fallback
        if (clientAudioCancelRef.current) {
          clientAudioCancelRef.current();
        }

        const cleanSpeech = replyText.replace(/[*_#`]|```[\s\S]*?```/g, " ").trim();
        
        const cancelTTS = playBengaliSpeechOnClient(
          cleanSpeech,
          language,
          () => {
            setCallStatus("speaking");
            setAiVolume(0.85); // Bounce visualizer loudly when AI speaks!
          },
          () => {
            setAiVolume(0);
            setCallStatus("listening");
          }
        );

        clientAudioCancelRef.current = cancelTTS || null;
      } catch {
        setCallStatus("listening");
      }
    }
  };

  // End Call and close modal
  const handleEndCall = () => {
    playTone("disconnect");
    cleanupAllAudio();
    setCallStatus("closed");
    onClose();
  };

  // Start call when opened
  useEffect(() => {
    isComponentMounted.current = true;
    if (isOpen) {
      startLiveSession();
    } else {
      cleanupAllAudio();
    }

    return () => {
      isComponentMounted.current = false;
      cleanupAllAudio();
    };
  }, [isOpen, selectedVoice]);

  if (!isOpen) return null;

  return (
    <div
      id="live-voice-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="live-voice-container"
        className="w-full max-w-lg rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-slate-100 relative max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {systemSettings?.aiBrandName || "Sajjat AI"} লাইভ ভয়েস
                </h3>
                {callStatus !== "connecting" && callStatus !== "error" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {formatTime(callDuration)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      callStatus === "listening"
                        ? "bg-emerald-400 animate-ping"
                        : callStatus === "speaking"
                        ? "bg-cyan-400 animate-pulse"
                        : callStatus === "connecting"
                        ? "bg-amber-400 animate-spin"
                        : callStatus === "muted"
                        ? "bg-rose-400"
                        : "bg-slate-500"
                    }`}
                  />
                  {callStatus === "connecting" && "Sajjat AI Live সংযোগ করা হচ্ছে…"}
                  {callStatus === "listening" && "Sajjat AI Live প্রস্তুত — কথা বলুন"}
                  {callStatus === "speaking" && "Sajjat AI কথা বলছে..."}
                  {callStatus === "muted" && "মাইক্রোফোন মিউট করা"}
                  {callStatus === "error" && "সংযোগ সমস্যা"}
                  {callStatus === "closed" && "সংযোগ বিচ্ছিন্ন"}
                </span>
                <span>•</span>
                <span className="text-slate-400 font-mono text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded">
                  Sajjat AI
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice Selection Button */}
            <button
              id="voice-picker-toggle"
              onClick={() => setShowVoicePicker(!showVoicePicker)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="কণ্ঠস্বর (Voice) পরিবর্তন করুন"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{selectedVoice}</span>
            </button>

            {/* Language Switch */}
            <button
              id="language-toggle-btn"
              onClick={() => {
                const next = language === "bn-BD" ? "en-US" : "bn-BD";
                setLanguage(next);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="ভাষা পরিবর্তন করুন"
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === "bn-BD" ? "বাংলা" : "EN"}</span>
            </button>

            {/* Close Button */}
            <button
              id="close-live-voice-btn"
              onClick={handleEndCall}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="কল শেষ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voice Picker Dropdown */}
        {showVoicePicker && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300">AI কণ্ঠস্বর নির্বাচন করুন:</span>
              <button
                onClick={() => setShowVoicePicker(false)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                বন্ধ
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVoice(v.id);
                    setShowVoicePicker(false);
                  }}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    selectedVoice === v.id
                      ? "bg-indigo-600/30 border-indigo-500 text-white font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <div className="text-xs">{v.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Central Visualizer Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative min-h-[290px]">
          {/* Animated Glow Rings */}
          <div className="relative flex items-center justify-center mb-6">
            {/* Outer Ripple */}
            <div
              className={`absolute rounded-full transition-all duration-300 ${
                callStatus === "listening"
                  ? "w-48 h-48 bg-emerald-500/10 border border-emerald-500/30 scale-105 animate-pulse"
                  : callStatus === "speaking"
                  ? "w-48 h-48 bg-cyan-500/15 border border-cyan-500/30 scale-110 animate-pulse"
                  : callStatus === "connecting"
                  ? "w-44 h-44 bg-amber-500/10 border border-amber-500/30 animate-spin"
                  : "w-36 h-36 bg-slate-800/20"
              }`}
            />

            {/* Middle Audio-Reactive Ring */}
            <div
              className={`absolute rounded-full transition-all duration-150 ${
                callStatus === "listening"
                  ? "w-36 h-36 bg-emerald-500/20 border border-emerald-400/40"
                  : callStatus === "speaking"
                  ? "w-36 h-36 bg-cyan-500/20 border border-cyan-400/40"
                  : "w-32 h-32 bg-slate-800/40"
              }`}
              style={{
                transform: `scale(${
                  1 + (callStatus === "speaking" ? aiVolume * 0.45 : micVolume * 0.45)
                })`,
              }}
            />

            {/* Central Core Orb Button */}
            <button
              onClick={() => {
                // 1. Resume Audio Contexts
                try {
                  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                  if (inputAudioCtxRef.current && inputAudioCtxRef.current.state === "suspended") {
                    inputAudioCtxRef.current.resume();
                  }
                  if (outputAudioCtxRef.current && outputAudioCtxRef.current.state === "suspended") {
                    outputAudioCtxRef.current.resume();
                  }
                } catch {}

                // 2. Play silent unlock audio
                try {
                  const silentAudio = new Audio();
                  (silentAudio as any).referrerPolicy = "no-referrer";
                  silentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
                  silentAudio.play().catch(() => {});
                } catch {}

                // 3. Reconnect if closed/error
                if (callStatus === "closed" || callStatus === "error") {
                  startLiveSession();
                }
              }}
              title={callStatus === "closed" || callStatus === "error" ? "পুনরায় সংযোগ করতে ক্লিক করুন" : "অডিও আনলক করতে ট্যাপ করুন"}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-500/50 ${
                callStatus === "listening"
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/40 ring-4 ring-emerald-400/30 hover:scale-105"
                  : callStatus === "speaking"
                  ? "bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 shadow-cyan-500/40 ring-4 ring-cyan-400/30 hover:scale-105"
                  : callStatus === "connecting"
                  ? "bg-gradient-to-tr from-amber-600 to-indigo-600 shadow-amber-500/30 animate-pulse"
                  : callStatus === "muted"
                  ? "bg-rose-900/60 ring-2 ring-rose-600/40"
                  : "bg-slate-800 ring-2 ring-slate-700 hover:bg-slate-750"
              }`}
            >
              {callStatus === "listening" ? (
                <Mic className="w-10 h-10 text-white animate-bounce" />
              ) : callStatus === "speaking" ? (
                <Volume2 className="w-10 h-10 text-white animate-pulse" />
              ) : callStatus === "connecting" ? (
                <Sparkles className="w-10 h-10 text-amber-200 animate-spin" />
              ) : callStatus === "muted" ? (
                <MicOff className="w-9 h-9 text-rose-300" />
              ) : (
                <WifiOff className="w-9 h-9 text-slate-400" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <div className="w-full max-w-sm space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
              {callStatus === "listening" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-emerald-300">Sajjat AI Live প্রস্তুত — কথা বলুন</span>
                </>
              )}
              {callStatus === "speaking" && (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span className="text-cyan-300">Sajjat AI কথা বলছে...</span>
                </>
              )}
              {callStatus === "connecting" && (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300">Sajjat AI Live সংযোগ করা হচ্ছে…</span>
                </>
              )}
              {callStatus === "muted" && (
                <span className="text-rose-300">মাইক্রোফোন মিউট করা (কথা শোনা হবে না)</span>
              )}
              {callStatus === "error" && (
                <span className="text-rose-400">সংযোগ স্থাপন করা যায়নি</span>
              )}
              {callStatus === "closed" && (
                <span className="text-slate-400">কল শেষ হয়েছে</span>
              )}
            </div>

            {/* Real-time Subtitles / Live Transcript Box */}
            <div className="min-h-[4rem] flex items-center justify-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {callStatus === "speaking" ? (
                <span className="text-cyan-200 line-clamp-3">
                  {liveTranscript || "Sajjat AI লাইভ উত্তর দিচ্ছে..."}
                </span>
              ) : callStatus === "listening" ? (
                <span className="text-slate-400 italic">
                  স্বাভাবিকভাবে কথা বলুন, যেমন: "কেমন আছো?", "SSC পরীক্ষার প্রস্তুতি কীভাবে নেবো?"
                </span>
              ) : callStatus === "connecting" ? (
                <span className="text-amber-300/80 italic">
                  Sajjat AI Live সংযোগ করা হচ্ছে…
                </span>
              ) : callStatus === "muted" ? (
                <span className="text-rose-300/80">
                  কথা বলতে নিচের আনমিউট বাটনে ট্যাপ করুন।
                </span>
              ) : (
                <span className="text-slate-400">কল পুনরায় শুরু করতে নিচে ট্যাপ করুন।</span>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div>{errorMessage}</div>
                  <button
                    onClick={startLiveSession}
                    className="mt-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition-colors"
                  >
                    আবার চেষ্টা করুন
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Text Input Form (Fallback for noisy environments) */}
        <form
          onSubmit={handleSendQuickText}
          className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            id="live-text-input"
            type="text"
            value={quickTextInput}
            onChange={(e) => setQuickTextInput(e.target.value)}
            placeholder="টাইপ করে প্রশ্ন করতে চাইলে এখানে লিখুন..."
            disabled={callStatus === "connecting" || callStatus === "error"}
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!quickTextInput.trim()}
            className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
            title="পাঠান"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Conversation History Drawer */}
        <div className="border-t border-slate-800 bg-slate-950/70">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>কথোপকথন হিস্টোরি ({transcriptHistory.length})</span>
            </div>
            {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="p-4 max-h-40 overflow-y-auto space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-800 border-t border-slate-800/60">
              {transcriptHistory.length === 0 ? (
                <p className="text-center text-slate-500 py-2">এখনও কোনো কথা হয়নি</p>
              ) : (
                transcriptHistory.map((item, idx) => (
                  <div
                    key={item.id ? `live_hist_${item.id}` : `live_hist_idx_${idx}`}
                    className={`flex items-start gap-2 ${
                      item.role === "user" ? "text-slate-300" : "text-cyan-300"
                    }`}
                  >
                    <span className="shrink-0 font-bold">
                      {item.role === "user" ? "আপনি:" : "Sajjat AI:"}
                    </span>
                    <span className="flex-1">{item.text}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-around gap-2 shrink-0">
          {/* Mute / Unmute Button */}
          <button
            id="live-voice-mute-btn"
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
              isMuted ? "text-amber-400" : "text-slate-300 hover:text-white"
            }`}
          >
            <div
              className={`p-3.5 rounded-2xl border transition-colors ${
                isMuted
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <span>{isMuted ? "আনমিউট" : "মিউট"}</span>
          </button>

          {/* Interrupt AI Button ("আমি বলি" / "থামুন") */}
          {callStatus === "speaking" && (
            <button
              id="live-voice-interrupt-btn"
              onClick={handleManualInterrupt}
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer animate-pulse"
              title="AI-কে থামিয়ে নিজের কথা বলুন (Barge-in)"
            >
              <div className="p-3.5 rounded-2xl bg-cyan-600/30 border border-cyan-500/50 text-cyan-300">
                <Radio className="w-5 h-5" />
              </div>
              <span>আমি বলি</span>
            </button>
          )}

          {/* Reconnect button if disconnected or errored */}
          {(callStatus === "closed" || callStatus === "error") && (
            <button
              id="live-voice-reconnect-btn"
              onClick={startLiveSession}
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              <div className="p-3.5 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300">
                <Wifi className="w-5 h-5" />
              </div>
              <span>পুনরায় কল</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            id="live-voice-end-btn"
            onClick={handleEndCall}
            className="flex flex-col items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
            title="লাইভ কল শেষ করুন"
          >
            <div className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95">
              <PhoneOff className="w-5 h-5" />
            </div>
            <span>কল শেষ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
