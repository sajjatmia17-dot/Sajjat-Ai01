import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchPhoneControlStatus,
  processPhoneVoiceApi,
  getPhoneLiveWsUrl,
  float32ToPcm16Base64,
  calculateRmsLevel,
  decodePcm24Base64ToAudioBuffer,
  findBestBanglaVoice,
} from "../utils/phoneControlHelpers";

export type VoiceCallState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "permission_denied"
  | "error";

export interface UseSajjatVoiceEngineOptions {
  mode: "call" | "phone";
  aiBrandName?: string;
  language?: "bn" | "en";
  captureVideoFrame?: () => string | null;
}

export function formatVoiceDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function useSajjatVoiceEngine(options: UseSajjatVoiceEngineOptions) {
  const { mode, aiBrandName = "Sajjat Ai", language = "bn", captureVideoFrame } = options;

  const [callState, setCallState] = useState<VoiceCallState>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [connectionMode, setConnectionMode] = useState<"live_ws" | "netlify_loop" | "">("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [aiTranscript, setAiTranscript] = useState<string>("");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [sessionTag, setSessionTag] = useState<string>("");

  // Mutable refs for real-time audio callbacks (avoids stale React closures)
  const isMutedRef = useRef<boolean>(false);
  const audioEnabledRef = useRef<boolean>(true);
  const activeRef = useRef<boolean>(false);
  const setupCompletedRef = useRef<boolean>(false);
  const turnCompleteRef = useRef<boolean>(true);
  const isNewAiTurnRef = useRef<boolean>(true);
  const captureFrameRef = useRef(captureVideoFrame);
  captureFrameRef.current = captureVideoFrame;

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlaybackTimeRef = useRef<number>(0);

  const fallbackLoopActiveRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const capturedTranscriptRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAllPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore
      }
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlaybackTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextPlaybackTimeRef.current = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    if (isMuted) {
      setMicLevel(0);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "audioStreamEnd" }));
        } catch {
          // ignore
        }
      }
    }
  }, [isMuted]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    if (!audioEnabled) {
      stopAllPlayback();
    }
  }, [audioEnabled, stopAllPlayback]);

  // Timer ONLY runs after live session setup is verified and active
  const isConnected =
    callState === "listening" || callState === "speaking" || callState === "thinking";

  useEffect(() => {
    if (isConnected) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected]);

  const cleanupResources = useCallback(() => {
    activeRef.current = false;
    setupCompletedRef.current = false;
    fallbackLoopActiveRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    stopAllPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null;
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }

    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect();
      } catch {
        // ignore
      }
      silentGainRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      micStreamRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setMicLevel(0);
  }, [stopAllPlayback]);

  const endSession = useCallback(() => {
    cleanupResources();
    setCallState("idle");
    setStatusMessage("");
    setConnectionMode("");
    setCallDuration(0);
  }, [cleanupResources]);

  const acquireMicrophoneStream = useCallback(async (): Promise<MediaStream | null> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCallState("permission_denied");
      setStatusMessage("মাইক্রোফোন সমর্থিত নয়");
      setErrorDetail(
        "এই ব্রাউজার বা পরিবেশে Microphone অ্যাক্সেস সমর্থিত নয়। অনুগ্রহ করে HTTPS-এ Google Chrome ব্যবহার করুন।"
      );
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (firstErr: any) {
      if (
        firstErr?.name === "NotAllowedError" ||
        firstErr?.name === "PermissionDeniedError"
      ) {
        setCallState("permission_denied");
        setStatusMessage("মাইক্রোফোন অনুমতি প্রয়োজন");
        setErrorDetail(
          "Chrome-এ মাইক্রোফোন অনুমতি দেওয়া হয়নি। ঠিকানা বারের বাম দিকের লক/সেটিংস আইকনে ট্যাপ করে Permissions → Microphone → Allow নির্বাচন করে আবার চেষ্টা করুন।"
        );
        return null;
      }

      if (firstErr?.name === "NotFoundError") {
        setCallState("error");
        setStatusMessage("মাইক্রোফোন পাওয়া যায়নি");
        setErrorDetail("আপনার ডিভাইসে কোনো সক্রিয় মাইক্রোফোন শনাক্ত হয়নি।");
        return null;
      }

      // Android Chrome fallback without explicit sampleRate
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (retryErr: any) {
        const isDenied =
          retryErr?.name === "NotAllowedError" ||
          retryErr?.name === "PermissionDeniedError";
        setCallState(isDenied ? "permission_denied" : "error");
        setStatusMessage(
          isDenied ? "মাইক্রোফোন অনুমতি প্রয়োজন" : "মাইক্রোফোন চালু করা যায়নি"
        );
        setErrorDetail(
          isDenied
            ? "Chrome Settings → Site settings → Microphone থেকে এই সাইটের জন্য Allow করুন।"
            : retryErr?.message || "মাইক্রোফোন Stream তৈরি করা যায়নি।"
        );
        return null;
      }
    }
  }, []);

  const startNetlifyVoiceLoop = useCallback(
    async (micStream: MediaStream) => {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRec) {
        cleanupResources();
        setCallState("error");
        setStatusMessage("ভয়েস কথোপকথন সমর্থিত নয়");
        setErrorDetail(
          "এই ব্রাউজারে রিয়েল-টাইম ভয়েস স্ট্রিমিং বা Web Speech API সমর্থিত নয়। অনুগ্রহ করে Android বা Desktop Chrome ব্যবহার করুন।"
        );
        return;
      }

      // Attach live RMS meter to real mic stream so user sees real mic input
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const meterCtx = new AudioCtx();
        if (meterCtx.state === "suspended") await meterCtx.resume().catch(() => {});
        inputAudioCtxRef.current = meterCtx;
        const source = meterCtx.createMediaStreamSource(micStream);
        sourceNodeRef.current = source;
        const processor = meterCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        const silentGain = meterCtx.createGain();
        silentGain.gain.value = 0;
        silentGainRef.current = silentGain;

        processor.onaudioprocess = (e) => {
          if (!activeRef.current || isMutedRef.current) {
            setMicLevel(0);
            return;
          }
          setMicLevel(calculateRmsLevel(e.inputBuffer.getChannelData(0)));
        };
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(meterCtx.destination);
      } catch {
        // ignore meter init error
      }

      fallbackLoopActiveRef.current = true;
      setConnectionMode("netlify_loop");
      setCallState("listening");
      setStatusMessage("শুনছি... কথা বলুন");

      const speakFallback = (replyText: string, onDone: () => void) => {
        if (!audioEnabledRef.current || !("speechSynthesis" in window)) {
          onDone();
          return;
        }
        window.speechSynthesis.cancel();
        const clean = replyText.replace(/[*#`_~>]/g, "").replace(/\s+/g, " ").trim();
        const utter = new SpeechSynthesisUtterance(clean);
        const voices = window.speechSynthesis.getVoices();
        const { voice } = findBestBanglaVoice(voices);
        const hasBn = /[\u0980-\u09FF]/.test(clean);
        if (hasBn && voice) {
          utter.voice = voice;
          utter.lang = voice.lang;
        } else {
          utter.lang = hasBn ? "bn-BD" : "en-US";
        }
        utter.onstart = () => {
          if (activeRef.current) {
            setCallState("speaking");
            setStatusMessage(`${aiBrandName} কথা বলছে...`);
          }
        };
        utter.onend = onDone;
        utter.onerror = onDone;
        window.speechSynthesis.speak(utter);
      };

      const listenNextTurn = () => {
        if (!fallbackLoopActiveRef.current || !activeRef.current) return;
        if (isMutedRef.current) {
          setTimeout(listenNextTurn, 400);
          return;
        }

        const rec = new SpeechRec();
        rec.lang = language === "en" ? "en-US" : "bn-BD";
        rec.continuous = false;
        rec.interimResults = true;
        capturedTranscriptRef.current = "";

        rec.onstart = () => {
          if (activeRef.current) {
            setCallState("listening");
            setStatusMessage("শুনছি... কথা বলুন");
          }
        };

        rec.onresult = (ev: any) => {
          let joined = "";
          for (let i = 0; i < ev.results.length; i++) {
            joined += ev.results[i][0].transcript;
          }
          capturedTranscriptRef.current = joined;
          setUserTranscript(joined);
        };

        rec.onerror = (ev: any) => {
          if (!fallbackLoopActiveRef.current || !activeRef.current) return;
          if (ev.error === "not-allowed") {
            cleanupResources();
            setCallState("permission_denied");
            setErrorDetail("মাইক্রোফোন অনুমতি বাতিল করা হয়েছে।");
            return;
          }
          setTimeout(listenNextTurn, 500);
        };

        rec.onend = async () => {
          if (!fallbackLoopActiveRef.current || !activeRef.current) return;
          const spoken = capturedTranscriptRef.current.trim();
          if (spoken.length < 2) {
            setTimeout(listenNextTurn, 300);
            return;
          }

          setCallState("thinking");
          setStatusMessage("উত্তর তৈরি হচ্ছে...");
          const hasScreen = Boolean(captureFrameRef.current?.());
          const res = await processPhoneVoiceApi({
            text: spoken,
            language,
            hasScreenShare: hasScreen,
          });
          if (!fallbackLoopActiveRef.current || !activeRef.current) return;

          if (!res.success && res.errorCode === "MISSING_API_KEY") {
            cleanupResources();
            setCallState("error");
            setStatusMessage("API Key অনুপস্থিত");
            setErrorDetail(res.error || "সার্ভারে এআই API Key সেট করুন।");
            return;
          }

          const reply = res.result?.spokenReply || res.error || "আমি শুনতে পেয়েছি, আবার বলুন।";
          setAiTranscript(reply);
          speakFallback(reply, () => {
            if (fallbackLoopActiveRef.current && activeRef.current) {
              setCallState("listening");
              setStatusMessage("শুনছি... কথা বলুন");
              setTimeout(listenNextTurn, 250);
            }
          });
        };

        recognitionRef.current = rec;
        try {
          rec.start();
        } catch {
          setTimeout(listenNextTurn, 500);
        }
      };

      const greeting = `হ্যালো! আমি ${aiBrandName}। এখন আমি সরাসরি শুনতে পাচ্ছি, আপনি কথা বলুন।`;
      setAiTranscript(greeting);
      speakFallback(greeting, () => {
        if (fallbackLoopActiveRef.current && activeRef.current) {
          listenNextTurn();
        }
      });
    },
    [aiBrandName, cleanupResources, language]
  );

  const startSession = useCallback(async () => {
    cleanupResources();
    activeRef.current = true;
    setupCompletedRef.current = false;
    setIsMuted(false);
    setAudioEnabled(true);
    setCallState("connecting");
    setStatusMessage("মাইক্রোফোন অনুমতি যাচাই হচ্ছে...");
    setErrorDetail("");
    setUserTranscript("");
    setAiTranscript("");
    setCallDuration(0);
    setConnectionMode("");
    setSessionTag("");

    // 1. Acquire actual Microphone Stream
    const micStream = await acquireMicrophoneStream();
    if (!micStream || !activeRef.current) {
      if (micStream) micStream.getTracks().forEach((t) => t.stop());
      return;
    }
    micStreamRef.current = micStream;
    micStream.getAudioTracks().forEach((t) => {
      t.enabled = !isMutedRef.current;
    });

    // 2. Check backend readiness
    setStatusMessage(`${aiBrandName} ভয়েস সার্ভারের সাথে সংযোগ হচ্ছে...`);
    const status = await fetchPhoneControlStatus();
    if (!activeRef.current) return;

    if (!status.configured) {
      cleanupResources();
      setCallState("error");
      setStatusMessage("API Key কনফিগার করা নেই");
      setErrorDetail(
        "সার্ভারে এআই API Key পাওয়া যায়নি। Secrets বা Environment Variables-এ কনফিগার করুন।"
      );
      return;
    }

    // Fallback gracefully on serverless environments where persistent WS is unavailable
    if (!status.liveWsSupported) {
      await startNetlifyVoiceLoop(micStream);
      return;
    }

    // 3. Initialize WebAudio contexts (16kHz in / 24kHz out)
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    let inputCtx: AudioContext;
    let outputCtx: AudioContext;

    try {
      try {
        inputCtx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        inputCtx = new AudioCtx();
      }
      try {
        outputCtx = new AudioCtx({ sampleRate: 24000 });
      } catch {
        outputCtx = new AudioCtx();
      }
      if (inputCtx.state === "suspended") await inputCtx.resume().catch(() => {});
      if (outputCtx.state === "suspended") await outputCtx.resume().catch(() => {});
    } catch (audioErr: any) {
      cleanupResources();
      setCallState("error");
      setStatusMessage("অডিও সিস্টেম চালু করা যায়নি");
      setErrorDetail(audioErr?.message || "AudioContext সমর্থিত নয়।");
      return;
    }

    inputAudioCtxRef.current = inputCtx;
    outputAudioCtxRef.current = outputCtx;
    nextPlaybackTimeRef.current = outputCtx.currentTime;

    // 4. Connect to real-time WebSocket audio bridge
    const wsUrl = `${getPhoneLiveWsUrl()}?mode=${mode}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      if (!activeRef.current) return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "ready") {
          setupCompletedRef.current = true;
          setConnectionMode("live_ws");
          if (msg.sessionId) setSessionTag(String(msg.sessionId));
          setCallState("listening");
          setStatusMessage("সংযুক্ত — শুনছি, কথা বলুন");

          if (inputCtx.state === "suspended") await inputCtx.resume().catch(() => {});
          if (outputCtx.state === "suspended") await outputCtx.resume().catch(() => {});

          const source = inputCtx.createMediaStreamSource(micStream);
          sourceNodeRef.current = source;
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;
            const channelData = e.inputBuffer.getChannelData(0);

            if (isMutedRef.current) {
              setMicLevel(0);
              return;
            }

            setMicLevel(calculateRmsLevel(channelData));
            const pcmBase64 = float32ToPcm16Base64(channelData, inputCtx.sampleRate);
            ws.send(JSON.stringify({ type: "audio", data: pcmBase64 }));
          };

          const silentGain = inputCtx.createGain();
          silentGain.gain.value = 0;
          silentGainRef.current = silentGain;

          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(inputCtx.destination);

          if (captureFrameRef.current) {
            frameTimerRef.current = setInterval(() => {
              if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;
              const frame = captureFrameRef.current?.();
              if (frame) {
                const rawB64 = frame.includes(",") ? frame.split(",")[1] : frame;
                ws.send(JSON.stringify({ type: "video", data: rawB64 }));
              }
            }, 1500);
          }

          isNewAiTurnRef.current = true;
          ws.send(
            JSON.stringify({
              type: "text",
              text:
                mode === "call"
                  ? `হ্যালো ${aiBrandName}! আমি ভয়েস কলে যুক্ত হয়েছি। বাংলায় সংক্ষেপে শুভেচ্ছা জানিয়ে বলুন আপনি শুনতে পাচ্ছেন।`
                  : `হ্যালো ${aiBrandName}! আমি মোবাইল কন্ট্রোল লাইভ সেশনে যুক্ত হয়েছি। বাংলায় সংক্ষেপে বলুন আপনি প্রস্তুত।`,
            })
          );
        } else if (msg.type === "inputTranscript" && msg.text) {
          setUserTranscript((prev) => `${prev} ${msg.text}`.trim().slice(-240));
        } else if (msg.type === "outputTranscript" && msg.text) {
          const chunk = String(msg.text);
          if (isNewAiTurnRef.current) {
            isNewAiTurnRef.current = false;
            setAiTranscript(chunk.trim().slice(-320));
          } else {
            setAiTranscript((prev) => `${prev} ${chunk}`.trim().slice(-320));
          }
        } else if (msg.type === "audio" && msg.audio && outputAudioCtxRef.current) {
          turnCompleteRef.current = false;
          if (!audioEnabledRef.current) return;

          const ctx = outputAudioCtxRef.current;
          if (ctx.state === "suspended") await ctx.resume().catch(() => {});

          const buffer = decodePcm24Base64ToAudioBuffer(ctx, msg.audio);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);

          const now = ctx.currentTime;
          if (nextPlaybackTimeRef.current < now) {
            nextPlaybackTimeRef.current = now;
          }
          source.start(nextPlaybackTimeRef.current);
          nextPlaybackTimeRef.current += buffer.duration;
          activeSourcesRef.current.push(source);

          setCallState("speaking");
          setStatusMessage(`${aiBrandName} কথা বলছে...`);

          source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
            if (
              activeRef.current &&
              activeSourcesRef.current.length === 0 &&
              turnCompleteRef.current
            ) {
              setCallState("listening");
              setStatusMessage("শুনছি... কথা বলুন");
            }
          };
        } else if (msg.type === "interrupted") {
          stopAllPlayback();
          turnCompleteRef.current = true;
          isNewAiTurnRef.current = true;
          if (activeRef.current) {
            setCallState("listening");
            setStatusMessage("শুনছি... কথা বলুন");
          }
        } else if (msg.type === "turnComplete") {
          turnCompleteRef.current = true;
          isNewAiTurnRef.current = true;
          setUserTranscript("");
          if (activeRef.current && activeSourcesRef.current.length === 0) {
            setCallState("listening");
            setStatusMessage("শুনছি... কথা বলুন");
          }
        } else if (msg.type === "error") {
          const errMsg = msg.message || `${aiBrandName} লাইভ ভয়েস সংযোগ ব্যর্থ হয়েছে।`;
          cleanupResources();
          setCallState("error");
          setStatusMessage("সংযোগ ব্যর্থ হয়েছে");
          setErrorDetail(errMsg);
        } else if (msg.type === "closed") {
          if (activeRef.current) {
            cleanupResources();
            setCallState("error");
            setStatusMessage("কল সংযোগ বিচ্ছিন্ন হয়েছে");
            setErrorDetail("ভয়েস সেশন বন্ধ হয়ে গেছে। পুনরায় সংযোগ করতে আবার চেষ্টা করুন।");
          }
        }
      } catch {
        // ignore malformed WS frames
      }
    };

    ws.onerror = () => {
      if (!activeRef.current) return;
      if (!setupCompletedRef.current) {
        // If WS setup fails unexpectedly, fall back cleanly only if SpeechRecognition exists, else show error
        const hasSpeechRec = Boolean(
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        );
        if (hasSpeechRec && micStreamRef.current) {
          const savedStream = micStreamRef.current;
          micStreamRef.current = null; // keep mic alive across transition
          cleanupResources();
          activeRef.current = true;
          micStreamRef.current = savedStream;
          startNetlifyVoiceLoop(savedStream);
          return;
        }
        cleanupResources();
        setCallState("error");
        setStatusMessage("WebSocket সংযোগ ব্যর্থ হয়েছে");
        setErrorDetail("সার্ভারের সাথে লাইভ অডিও সংযোগ স্থাপন করা যায়নি। পুনরায় চেষ্টা করুন।");
      }
    };

    ws.onclose = (ev) => {
      if (!activeRef.current) return;
      const wasSetup = setupCompletedRef.current;
      cleanupResources();
      setCallState("error");
      if (!wasSetup) {
        setStatusMessage("সংযোগ সম্পূর্ণ হয়নি");
        setErrorDetail(
          ev.reason || "ভয়েস সেশন সম্পূর্ণ হওয়ার আগেই সংযোগ বন্ধ হয়ে গেছে।"
        );
      } else {
        setStatusMessage("কল সংযোগ বিচ্ছিন্ন হয়েছে");
        setErrorDetail(
          ev.reason || "নেটওয়ার্ক বা সার্ভারের সাথে ভয়েস সংযোগ বিচ্ছিন্ন হয়েছে।"
        );
      }
    };
  }, [
    acquireMicrophoneStream,
    aiBrandName,
    cleanupResources,
    mode,
    startNetlifyVoiceLoop,
    stopAllPlayback,
  ]);

  const sendTextToLive = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      wsRef.current.send(JSON.stringify({ type: "text", text: text.trim() }));
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    callState,
    isConnected,
    connectionMode,
    statusMessage,
    errorDetail,
    userTranscript,
    aiTranscript,
    callDuration,
    formattedDuration: formatVoiceDuration(callDuration),
    micLevel,
    sessionTag,
    isMuted,
    setIsMuted,
    toggleMute: () => setIsMuted((p) => !p),
    audioEnabled,
    setAudioEnabled,
    toggleSpeaker: () => setAudioEnabled((p) => !p),
    startSession,
    endSession,
    sendTextToLive,
  };
}
