// Sajjat AI Intelligent Voice Synthesis & Audio Engine
import { getBackendBaseUrl } from "../api";

export type VoiceState = "stopped" | "playing" | "paused";

let activeState: VoiceState = "stopped";
let activeAudioElement: HTMLAudioElement | null = null;
let keepAliveInterval: any = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Pre-load voices for Web Speech API
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const updateVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  };
  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

export function cleanTextForAudio(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;

  text = text.replace(/```[\s\S]*?```/g, " কোড অংশ। ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/\|/g, " ");
  text = text.replace(/^[-:| ]+$/gm, "");
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
  text = text.replace(/\n+/g, " । ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export function stopAiVoice(): void {
  activeState = "stopped";

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = "";
    } catch {}
    activeAudioElement = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

export function pauseAiVoice(): void {
  if (activeState !== "playing") return;
  activeState = "paused";

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
    } catch {}
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    } catch {}
  }
}

export function resumeAiVoice(): void {
  if (activeState !== "paused") return;
  activeState = "playing";

  if (activeAudioElement) {
    try {
      activeAudioElement.play().catch(() => {});
    } catch {}
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }
}

export function isAiVoicePlaying(): boolean {
  return activeState === "playing";
}

export function isAiVoicePaused(): boolean {
  return activeState === "paused";
}

export interface VoiceCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errMessage: string) => void;
}

export function playAiVoice(
  rawText: string,
  callbacks?: VoiceCallbacks
): () => void {
  stopAiVoice();

  const cleanText = cleanTextForAudio(rawText);
  if (!cleanText) {
    callbacks?.onEnd?.();
    return () => {};
  }

  activeState = "playing";

  const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
  const hasWebSpeech = typeof window !== "undefined" && "speechSynthesis" in window;

  let hasNativeBengaliVoice = false;
  if (hasWebSpeech) {
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    hasNativeBengaliVoice = voices.some(
      (v) =>
        v.lang === "bn-BD" ||
        v.lang === "bn-IN" ||
        v.lang.startsWith("bn") ||
        v.name.toLowerCase().includes("bangla") ||
        v.name.toLowerCase().includes("bengali")
    );
  }

  // Choose best path: Always use Google Audio TTS for Bangla to get high-quality natural pronunciation, Web Speech for pure English
  if (hasWebSpeech && !hasBangla) {
    playWebSpeech(cleanText, callbacks);
  } else {
    playGoogleAudioTts(cleanText, callbacks);
  }

  return stopAiVoice;
}

// 1. Web Speech API Player
function playWebSpeech(cleanText: string, callbacks?: VoiceCallbacks) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    playGoogleAudioTts(cleanText, callbacks);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
    const targetLang = hasBangla ? "bn-BD" : "en-US";

    const sentences = cleanText.split(/(?<=[।?!.\n])/g).filter((s) => s.trim().length > 0);
    if (sentences.length === 0) {
      stopAiVoice();
      callbacks?.onEnd?.();
      return;
    }

    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const selectedVoice = hasBangla
      ? voices.find(
          (v) =>
            v.lang === "bn-BD" ||
            v.lang === "bn-IN" ||
            v.lang.startsWith("bn") ||
            v.name.toLowerCase().includes("bangla") ||
            v.name.toLowerCase().includes("bengali")
        ) || null
      : voices.find(
          (v) =>
            v.lang === "en-US" ||
            v.lang === "en-GB" ||
            v.lang.startsWith("en")
        ) || null;

    let currentIndex = 0;
    let started = false;

    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        window.speechSynthesis.speaking &&
        !window.speechSynthesis.paused
      ) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 3500);

    const speakNext = () => {
      if (activeState === "stopped" || currentIndex >= sentences.length) {
        stopAiVoice();
        callbacks?.onEnd?.();
        return;
      }

      const textChunk = sentences[currentIndex].trim();
      currentIndex++;

      if (!textChunk) {
        speakNext();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textChunk);
      utterance.lang = targetLang;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (!started) {
          started = true;
          callbacks?.onStart?.();
        }
      };

      utterance.onend = () => {
        speakNext();
      };

      utterance.onerror = (e) => {
        console.warn("Utterance error, switching to Audio TTS:", e);
        playGoogleAudioTts(sentences.slice(currentIndex - 1).join(" "), callbacks);
      };

      window.speechSynthesis.speak(utterance);
    };

    window.speechSynthesis.resume();
    speakNext();

  } catch (err) {
    console.warn("Web Speech API failed, falling back to Audio TTS:", err);
    playGoogleAudioTts(cleanText, callbacks);
  }
}

// 2. High Quality Google Audio Stream Player (Works 100% on Netlify, Mobile Chrome & Safari)
function playGoogleAudioTts(cleanText: string, callbacks?: VoiceCallbacks) {
  if (activeState === "stopped") return;

  const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
  const lang = hasBangla ? "bn" : "en";

  const chunks: string[] = [];
  const rawSentences = cleanText.split(/(?<=[।?!.\n])/g);
  let current = "";

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + " " + trimmed).length > 170) {
      if (current) chunks.push(current);
      current = trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }
  }
  if (current) chunks.push(current);

  if (chunks.length === 0) {
    stopAiVoice();
    callbacks?.onEnd?.();
    return;
  }

  let index = 0;
  let started = false;

  const playChunk = () => {
    if (activeState === "stopped" || index >= chunks.length) {
      stopAiVoice();
      callbacks?.onEnd?.();
      return;
    }

    const chunkText = chunks[index];
    index++;

    const ttsUrl = `${getBackendBaseUrl()}/api/tts?text=${encodeURIComponent(chunkText)}&lang=${lang}`;

    const audio = new Audio();
    activeAudioElement = audio;
    (audio as any).referrerPolicy = "no-referrer";
    audio.src = ttsUrl;

    audio.onplay = () => {
      if (!started) {
        started = true;
        callbacks?.onStart?.();
      }
    };

    audio.onended = () => {
      playChunk();
    };

    audio.onerror = (e) => {
      console.warn("Audio TTS error on chunk, falling back to Web Speech:", e);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        playWebSpeech(chunks.slice(index - 1).join(" "), callbacks);
      } else {
        stopAiVoice();
        callbacks?.onError?.("এই browser-এ Voice সুবিধাটি বর্তমানে available নয়।");
      }
    };

    audio.play().catch((playErr) => {
      console.warn("Audio play rejected:", playErr);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        playWebSpeech(chunks.slice(index - 1).join(" "), callbacks);
      } else {
        stopAiVoice();
        callbacks?.onError?.("এই browser-এ Voice সুবিধাটি বর্তমানে available নয়।");
      }
    });
  };

  playChunk();
}
