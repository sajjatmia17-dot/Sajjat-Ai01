// Sajjat AI Intelligent Voice Synthesis & Audio Engine

let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioBlobUrl: string | null = null;
let keepAliveInterval: any = null;
let isPlayingVoice = false;

// Clean text for speech synthesis
export function cleanTextForAudio(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;

  // Replace code blocks with descriptive text
  text = text.replace(/```[\s\S]*?```/g, " কোড অংশ। ");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove markdown links and images
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Remove markdown headers (#, ##, etc.)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold, italic, strikethrough markdown
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // Remove bullet points and numbered lists
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Remove table pipes and separator lines
  text = text.replace(/\|/g, " ");
  text = text.replace(/^[-:| ]+$/gm, "");

  // Remove emojis and special non-letter symbols
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");

  // Normalize newlines and spaces
  text = text.replace(/\n+/g, " । ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// Stop any currently playing audio or speech
export function stopAiVoice(): void {
  isPlayingVoice = false;

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (e) {}
    activeAudioElement = null;
  }

  if (activeAudioBlobUrl) {
    try {
      URL.revokeObjectURL(activeAudioBlobUrl);
    } catch (e) {}
    activeAudioBlobUrl = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

export function isAiVoicePlaying(): boolean {
  return isPlayingVoice;
}

// Play AI voice with Server TTS as primary, Web Speech API as fallback
export function playAiVoice(
  rawText: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): () => void {
  stopAiVoice();

  const cleanText = cleanTextForAudio(rawText);
  if (!cleanText) {
    callbacks?.onEnd?.();
    return () => {};
  }

  isPlayingVoice = true;

  // 1. Primary Method: Fetch high quality audio from /api/tts
  const attemptServerTts = async () => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        throw new Error(`TTS server responded with ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (!isPlayingVoice) return; // cancelled while fetching

      const blobUrl = URL.createObjectURL(audioBlob);
      activeAudioBlobUrl = blobUrl;

      const audio = new Audio(blobUrl);
      activeAudioElement = audio;

      audio.onplay = () => {
        callbacks?.onStart?.();
      };

      audio.onended = () => {
        stopAiVoice();
        callbacks?.onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn("Server Audio playback error, switching to Web Speech fallback:", e);
        if (isPlayingVoice) {
          playBrowserSpeech(cleanText, callbacks);
        }
      };

      await audio.play();
    } catch (err) {
      console.warn("Server TTS unavailable, using Web Speech synthesis fallback:", err);
      if (isPlayingVoice) {
        playBrowserSpeech(cleanText, callbacks);
      }
    }
  };

  attemptServerTts();

  return stopAiVoice;
}

// Browser Web Speech API fallback
function playBrowserSpeech(
  cleanText: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    stopAiVoice();
    callbacks?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
    const targetLang = hasBangla ? "bn-BD" : "en-US";

    // Split into sentences so browser never cuts off
    const sentences = cleanText.split(/(?<=[।?!.\n])/g).filter((s) => s.trim().length > 0);
    if (sentences.length === 0) {
      stopAiVoice();
      callbacks?.onEnd?.();
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (hasBangla) {
      selectedVoice =
        voices.find(
          (v) =>
            v.lang === "bn-BD" ||
            v.lang === "bn-IN" ||
            v.lang.startsWith("bn") ||
            v.name.toLowerCase().includes("bangla") ||
            v.name.toLowerCase().includes("bengali")
        ) || null;
    } else {
      selectedVoice =
        voices.find(
          (v) =>
            v.lang === "en-US" ||
            v.lang === "en-GB" ||
            v.lang.startsWith("en")
        ) || null;
    }

    let currentIndex = 0;
    callbacks?.onStart?.();

    // Chrome keep-alive
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 4000);

    const speakNextSentence = () => {
      if (!isPlayingVoice || currentIndex >= sentences.length) {
        stopAiVoice();
        callbacks?.onEnd?.();
        return;
      }

      const sentenceText = sentences[currentIndex].trim();
      currentIndex++;

      if (!sentenceText) {
        speakNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      utterance.lang = targetLang;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        speakNextSentence();
      };

      utterance.onerror = () => {
        speakNextSentence();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  } catch (speechErr) {
    console.error("Web Speech API error:", speechErr);
    stopAiVoice();
    callbacks?.onError?.(speechErr);
    callbacks?.onEnd?.();
  }
}
