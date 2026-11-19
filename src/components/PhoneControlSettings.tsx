import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  ScanEye,
  Radio,
  ExternalLink,
  Search,
  ShieldCheck,
  Power,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Upload,
  Smartphone,
  Info,
  XCircle,
  Play,
  Square,
  Globe,
  Send,
  PhoneOff,
  Check,
  X,
} from "lucide-react";
import {
  PhoneControlStatusResponse,
  ScreenAnalysisResponse,
  LaunchableAppEntry,
  LAUNCHABLE_APPS,
  PHONE_SETTING_GUIDES,
  fetchPhoneControlStatus,
  analyzePhoneScreenApi,
  processPhoneVoiceApi,
  resolveLocalAppMatch,
  resolveLocalSettingGuide,
  isAndroidDevice,
  triggerSafeExternalLink,
  findBestBanglaVoice,
  getNativeAndroidBridge,
} from "../utils/phoneControlHelpers";
import { useSajjatVoiceEngine } from "../hooks/useSajjatVoiceEngine";

interface PhoneControlSettingsProps {
  theme: "dark" | "light";
  isModalOpen: boolean;
}

type PermissionStateLabel = "granted" | "prompt" | "denied" | "unsupported" | "unknown";

interface FeatureToggleState {
  masterEnabled: boolean;
  voiceControl: boolean;
  aiVoiceResponse: boolean;
  liveScreenShare: boolean;
  aiScreenAnalysis: boolean;
  liveVoiceConversation: boolean;
  smartAppLauncher: boolean;
  smartPhoneSearch: boolean;
  confirmBeforeAppLaunch: boolean;
}

const DEFAULT_TOGGLES: FeatureToggleState = {
  masterEnabled: true,
  voiceControl: true,
  aiVoiceResponse: true,
  liveScreenShare: true,
  aiScreenAnalysis: true,
  liveVoiceConversation: true,
  smartAppLauncher: true,
  smartPhoneSearch: true,
  confirmBeforeAppLaunch: true,
};

export const PhoneControlSettings: React.FC<PhoneControlSettingsProps> = ({
  theme,
  isModalOpen,
}) => {
  const isLight = theme === "light";

  // Feature toggles
  const [toggles, setToggles] = useState<FeatureToggleState>(() => {
    try {
      const saved = localStorage.getItem("sajjat_phone_control_toggles");
      if (saved) return { ...DEFAULT_TOGGLES, ...JSON.parse(saved) };
    } catch {
      // ignore storage errors
    }
    return DEFAULT_TOGGLES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("sajjat_phone_control_toggles", JSON.stringify(toggles));
    } catch {
      // ignore storage errors
    }
  }, [toggles]);

  const toggleFeature = (key: keyof FeatureToggleState) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Backend status, Android Bridge & permissions
  const [backendStatus, setBackendStatus] = useState<PhoneControlStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [micPermission, setMicPermission] = useState<PermissionStateLabel>("unknown");
  const [screenPermission, setScreenPermission] = useState<
    "idle" | "active" | "denied" | "unsupported"
  >("idle");
  const [hasNativeBridge, setHasNativeBridge] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string>("");

  // 1. Voice Phone Control
  const [voiceLang, setVoiceLang] = useState<"bn-BD" | "en-US">("bn-BD");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [manualCommand, setManualCommand] = useState<string>("");
  const [voiceProcessing, setVoiceProcessing] = useState<boolean>(false);
  const [voiceReply, setVoiceReply] = useState<string>("");
  const [voiceSteps, setVoiceSteps] = useState<string[]>([]);
  const [voiceLimitationNote, setVoiceLimitationNote] = useState<string>("");
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState<boolean>(true);
  const [pendingAppConfirmation, setPendingAppConfirmation] = useState<{
    app: LaunchableAppEntry;
    sourceCommand: string;
  } | null>(null);

  // 2. AI Voice Response (SpeechSynthesis)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [banglaVoiceName, setBanglaVoiceName] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // 3. Live Screen Sharing + Screenshot Fallback
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [screenSupported, setScreenSupported] = useState<boolean>(true);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string>("");
  const [screenError, setScreenError] = useState<string>("");

  // 4. AI Screen Analysis
  const [screenQuestion, setScreenQuestion] = useState<string>("");
  const [isAnalyzingScreen, setIsAnalyzingScreen] = useState<boolean>(false);
  const [screenAnalysis, setScreenAnalysis] = useState<ScreenAnalysisResponse["analysis"] | null>(
    null
  );
  const [analysisModel, setAnalysisModel] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");

  // 6. Smart App Launcher
  const [lastLaunchAttempt, setLastLaunchAttempt] = useState<{
    app: LaunchableAppEntry;
    statusText: string;
    usedNativeBridge: boolean;
  } | null>(null);

  // 7. Smart Phone Search
  const [phoneSearchQuery, setPhoneSearchQuery] = useState<string>("");
  const [phoneSearchLoading, setPhoneSearchLoading] = useState<boolean>(false);
  const [phoneSearchResult, setPhoneSearchResult] = useState<{
    title: string;
    reply: string;
    steps: string[];
    limitationNote: string;
  } | null>(null);

  // Refs for cleanup & capture
  const recognitionRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Capture current screen frame as JPEG base64
  const captureCurrentScreenFrame = useCallback((): string | null => {
    if (isSharingScreen && videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      const maxWidth = 1280;
      const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.8);
    }
    if (uploadedPreviewUrl) {
      return uploadedPreviewUrl;
    }
    return null;
  }, [isSharingScreen, uploadedPreviewUrl]);

  // 5. Unified Real-Time Voice Engine (shared with Home Live Call)
  const {
    callState: liveCallState,
    isConnected: isLiveConnected,
    connectionMode: liveConnectionMode,
    statusMessage: liveStatusMessage,
    errorDetail: liveErrorDetail,
    userTranscript: liveInputTranscript,
    aiTranscript: liveOutputTranscript,
    formattedDuration: liveFormattedDuration,
    micLevel: liveMicLevel,
    isMuted: liveIsMuted,
    toggleMute: toggleLiveMute,
    audioEnabled: liveAudioEnabled,
    toggleSpeaker: toggleLiveSpeaker,
    startSession: startLiveSession,
    endSession: stopLiveSession,
  } = useSajjatVoiceEngine({
    mode: "phone",
    aiBrandName: "Sajjat Ai",
    language: voiceLang === "en-US" ? "en" : "bn",
    captureVideoFrame: captureCurrentScreenFrame,
  });

  // Load backend connection status & detect native bridge
  const refreshBackendStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = await fetchPhoneControlStatus();
      setBackendStatus(status);
      setHasNativeBridge(Boolean(getNativeAndroidBridge()));
    } catch (err: any) {
      setGlobalError(err?.message || "ব্যাকএন্ড স্ট্যাটাস যাচাই করা যায়নি।");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Check browser capabilities & permissions
  const checkBrowserCapabilities = useCallback(async () => {
    if (typeof window === "undefined") return;

    setHasNativeBridge(Boolean(getNativeAndroidBridge()));
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechRecognitionSupported(Boolean(SpeechRec));
    setSpeechSupported("speechSynthesis" in window);

    const canDisplayMedia = Boolean(
      navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia
    );
    setScreenSupported(canDisplayMedia);
    if (!canDisplayMedia) {
      setScreenPermission("unsupported");
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const micPerm = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setMicPermission(micPerm.state as PermissionStateLabel);
        micPerm.onchange = () => {
          setMicPermission(micPerm.state as PermissionStateLabel);
        };
      } catch {
        setMicPermission(navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported");
      }
    } else {
      setMicPermission(navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported");
    }
  }, []);

  // Load SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const syncVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setAvailableVoices(list);
      const { voice, hasBangla } = findBestBanglaVoice(list);
      setBanglaVoiceName(hasBangla && voice ? `${voice.name} (${voice.lang})` : null);
    };
    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      refreshBackendStatus();
      checkBrowserCapabilities();
    }
  }, [isModalOpen, refreshBackendStatus, checkBrowserCapabilities]);

  // Stop SpeechSynthesis helper
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Speak Bengali/English via SpeechSynthesis
  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (!toggles.masterEnabled || !toggles.aiVoiceResponse) {
        onDone?.();
        return;
      }
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
        onDone?.();
        return;
      }

      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#`_~>]/g, "").replace(/\s+/g, " ").trim();
      const utterance = new SpeechSynthesisUtterance(clean);

      const hasBanglaChars = /[\u0980-\u09FF]/.test(clean);
      const voices =
        availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const { voice: bnVoice } = findBestBanglaVoice(voices);

      if (hasBanglaChars && bnVoice) {
        utterance.voice = bnVoice;
        utterance.lang = bnVoice.lang;
      } else {
        utterance.lang = hasBanglaChars ? "bn-BD" : "en-US";
      }
      utterance.rate = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onDone?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onDone?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [toggles.masterEnabled, toggles.aiVoiceResponse, availableVoices]
  );

  // Stop screen sharing
  const stopScreenSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharingScreen(false);
    setScreenPermission(screenSupported ? "idle" : "unsupported");
  }, [screenSupported]);

  // Stop Voice Control recognition
  const stopVoiceListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Master Stop All
  const stopAllPhoneControl = useCallback(() => {
    stopVoiceListening();
    stopSpeaking();
    stopScreenSharing();
    stopLiveSession();
  }, [stopVoiceListening, stopSpeaking, stopScreenSharing, stopLiveSession]);

  // Clean up streams when modal closes or component unmounts
  useEffect(() => {
    if (!isModalOpen) {
      stopAllPhoneControl();
    }
    return () => {
      stopAllPhoneControl();
    };
  }, [isModalOpen, stopAllPhoneControl]);

  useEffect(() => {
    if (!toggles.masterEnabled) {
      stopAllPhoneControl();
    }
  }, [toggles.masterEnabled, stopAllPhoneControl]);

  // Request / verify Microphone permission explicitly
  const requestMicrophonePermission = async () => {
    setGlobalError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      return true;
    } catch (err: any) {
      setMicPermission("denied");
      setGlobalError(
        err?.name === "NotAllowedError"
          ? "মাইক্রোফোন অনুমতি প্রত্যাখ্যান করা হয়েছে। ব্রাউজার অ্যাড্রেস বারের লক আইকন থেকে Microphone → Allow করুন।"
          : `মাইক্রোফোন চালু করা যায়নি: ${err?.message || "অজানা ত্রুটি"}`
      );
      return false;
    }
  };

  // Start Live Screen Sharing
  const startScreenSharing = async () => {
    if (!toggles.masterEnabled || !toggles.liveScreenShare) return;
    setScreenError("");

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenSupported(false);
      setScreenPermission("unsupported");
      setScreenError(
        "Android Chrome বা মোবাইল ব্রাউজারে সরাসরি Live Screen Sharing (getDisplayMedia) সমর্থিত নয়। নিচের 'স্ক্রিনশট আপলোড' বাটন দিয়ে যেকোনো স্ক্রিনশট বিশ্লেষণ করুন।"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } },
        audio: false,
      });
      screenStreamRef.current = stream;
      setIsSharingScreen(true);
      setScreenPermission("active");
      setUploadedPreviewUrl("");

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenSharing();
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setScreenPermission("denied");
        setScreenError(
          "স্ক্রিন শেয়ারিংয়ের অনুমতি দেওয়া হয়নি বা বাতিল করা হয়েছে। আপনার অনুমতি ছাড়া কখনোই স্ক্রিন দেখা হয় না।"
        );
      } else {
        setScreenError(err?.message || "স্ক্রিন শেয়ার শুরু করা যায়নি।");
      }
    }
  };

  useEffect(() => {
    if (isSharingScreen && videoRef.current && screenStreamRef.current) {
      videoRef.current.srcObject = screenStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isSharingScreen]);

  // Handle Screenshot file upload fallback
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (isSharingScreen) stopScreenSharing();
        setUploadedPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 4. Analyze Screen via Backend AI Vision API
  const handleAnalyzeScreen = useCallback(
    async (customPrompt?: string) => {
      if (!toggles.masterEnabled || !toggles.aiScreenAnalysis) return;
      setAnalysisError("");
      const frame = captureCurrentScreenFrame();
      if (!frame) {
        setAnalysisError("প্রথমে Live Screen Sharing শুরু করুন অথবা একটি স্ক্রিনশট আপলোড করুন।");
        return;
      }

      setIsAnalyzingScreen(true);
      try {
        const res = await analyzePhoneScreenApi({
          imageBase64: frame,
          mimeType: "image/jpeg",
          question: customPrompt ?? screenQuestion,
          language: voiceLang === "en-US" ? "en" : "bn",
        });

        if (!res.success || !res.analysis) {
          setAnalysisError(res.error || "স্ক্রিন বিশ্লেষণ ব্যর্থ হয়েছে।");
          if (res.errorCode === "MISSING_API_KEY") {
            refreshBackendStatus();
          }
          return;
        }

        setScreenAnalysis(res.analysis);
        setAnalysisModel("Sajjat Ai Vision");

        const firstStep = res.analysis.nextSteps[0]
          ? ` পরবর্তী ধাপ: ${res.analysis.nextSteps[0]}`
          : "";
        speakText(`${res.analysis.summary}${firstStep}`);
      } catch (err: any) {
        setAnalysisError(err?.message || "স্ক্রিন বিশ্লেষণে অপ্রত্যাশিত ত্রুটি হয়েছে।");
      } finally {
        setIsAnalyzingScreen(false);
      }
    },
    [
      toggles.masterEnabled,
      toggles.aiScreenAnalysis,
      captureCurrentScreenFrame,
      screenQuestion,
      voiceLang,
      refreshBackendStatus,
      speakText,
    ]
  );

  // 6. Execute verified App Launch (via Native Android Bridge if present, or App Link / Intent)
  const executeLaunchApp = useCallback(
    async (app: LaunchableAppEntry) => {
      if (!toggles.masterEnabled || !toggles.smartAppLauncher) return;
      const bridge = getNativeAndroidBridge();

      if (bridge) {
        try {
          if (app.key === "settings" && bridge.openSystemSettings) {
            await bridge.openSystemSettings("android.settings.SETTINGS");
          } else if (bridge.openApp) {
            await bridge.openApp(app.key);
          }
          setLastLaunchAttempt({
            app,
            usedNativeBridge: true,
            statusText: `Native Android Bridge দিয়ে ${app.name} খোলার নির্দেশ পাঠানো হয়েছে।`,
          });
          speakText(`${app.bnName} খোলা হচ্ছে।`);
          return;
        } catch {
          // Fall through cleanly to browser App Link / Intent
        }
      }

      const android = isAndroidDevice();
      const targetUrl = android && app.androidIntentUrl ? app.androidIntentUrl : app.appLink;
      triggerSafeExternalLink(targetUrl);

      setLastLaunchAttempt({
        app,
        usedNativeBridge: false,
        statusText: android
          ? `${app.name} অ্যাপ লিংক/Android Intent চালু করার চেষ্টা করা হয়েছে। অ্যাপ না খুললে নিচের ওয়েব ভার্সন বা ম্যানুয়াল গাইড ব্যবহার করুন।`
          : `${app.name}-এর App Link খোলা হয়েছে। ব্রাউজার থেকে সরাসরি Android অ্যাপ না খুললে ওয়েব ভার্সন ব্যবহার করুন।`,
      });

      speakText(`${app.bnName} খোলার চেষ্টা করা হচ্ছে।`);
    },
    [toggles.masterEnabled, toggles.smartAppLauncher, speakText]
  );

  // Request Pre-Execution Confirmation before voice-triggered app launch
  const requestConfirmedAppLaunch = useCallback(
    (app: LaunchableAppEntry, sourceCommand: string, requireConfirm = true) => {
      if (!requireConfirm || !toggles.confirmBeforeAppLaunch) {
        executeLaunchApp(app);
        return;
      }
      setPendingAppConfirmation({ app, sourceCommand });
      const confirmMsg = `আপনি কি এখন ${app.bnName} (${app.name}) খুলতে চান? নিচের 'হ্যাঁ, খুলুন' বাটনে ট্যাপ করুন অথবা ভয়েসে 'হ্যাঁ' বলুন।`;
      setVoiceReply(confirmMsg);
      setVoiceSteps([app.manualInstruction]);
      speakText(confirmMsg);
    },
    [toggles.confirmBeforeAppLaunch, executeLaunchApp, speakText]
  );

  // 7. Smart Phone Search execution
  const handlePhoneSearch = useCallback(
    async (queryOverride?: string) => {
      if (!toggles.masterEnabled || !toggles.smartPhoneSearch) return;
      const q = (queryOverride ?? phoneSearchQuery).trim();
      if (!q) return;

      const localGuide = resolveLocalSettingGuide(q);
      if (localGuide) {
        const resObj = {
          title: localGuide.title,
          reply: `${localGuide.title} খুঁজে পেতে নিচের ধাপগুলো অনুসরণ করুন:`,
          steps: localGuide.steps,
          limitationNote:
            "স্বচ্ছ সীমাবদ্ধতা: সাধারণ ওয়েব ব্রাউজার নিরাপত্তা নীতিমালার কারণে আপনার ফোনের ইনস্টল করা অ্যাপের তালিকা বা Android System Settings সরাসরি পড়তে বা পরিবর্তন করতে পারে না।",
        };
        setPhoneSearchResult(resObj);
        speakText(`${localGuide.title}। ${localGuide.steps[0] || ""}`);
        return;
      }

      setPhoneSearchLoading(true);
      try {
        const apiRes = await processPhoneVoiceApi({
          text: `ফোন বা সেটিং খোঁজার নির্দেশ: ${q}`,
          language: voiceLang === "en-US" ? "en" : "bn",
          hasScreenShare: isSharingScreen,
        });
        if (apiRes.success && apiRes.result) {
          setPhoneSearchResult({
            title: q,
            reply: apiRes.result.spokenReply,
            steps: apiRes.result.steps,
            limitationNote:
              apiRes.result.limitationNote ||
              "সীমাবদ্ধতা: ওয়েব অ্যাপ ফোনের ইনস্টল করা অ্যাপ বা সিস্টেম সেটিংস সরাসরি পড়তে পারে না।",
          });
          speakText(apiRes.result.spokenReply);
        } else {
          setPhoneSearchResult({
            title: q,
            reply: `"${q}" খুঁজে পেতে ফোনের Settings অ্যাপের উপরের সার্চ বারে "${q}" লিখে খুঁজুন।`,
            steps: [
              "ফোনের Home স্ক্রিন থেকে Settings অ্যাপ খুলুন।",
              `Search Settings বক্সে "${q}" লিখুন।`,
            ],
            limitationNote:
              apiRes.error ||
              "সীমাবদ্ধতা: ওয়েব ব্রাউজার সরাসরি সিস্টেম সেটিংস পড়তে পারে না।",
          });
        }
      } finally {
        setPhoneSearchLoading(false);
      }
    },
    [
      toggles.masterEnabled,
      toggles.smartPhoneSearch,
      phoneSearchQuery,
      voiceLang,
      isSharingScreen,
      speakText,
    ]
  );

  // Process a Voice or Typed Mobile Control Command
  const handleProcessCommand = useCallback(
    async (rawText: string) => {
      const cmd = rawText.trim();
      if (!cmd || !toggles.masterEnabled) return;

      // Handle voice confirmation if a pending confirmation is active
      if (pendingAppConfirmation) {
        const normalized = cmd.toLowerCase();
        if (/^(হ্যাঁ|হ্যা|হা|yes|confirm|ok|ওকে|খোলো|খুলো|চালু করো)/i.test(normalized)) {
          const targetApp = pendingAppConfirmation.app;
          setPendingAppConfirmation(null);
          await executeLaunchApp(targetApp);
          return;
        }
        if (/^(না|বাতিল|cancel|no|stop)/i.test(normalized)) {
          setPendingAppConfirmation(null);
          const cancelMsg = "অ্যাপ খোলার নির্দেশ বাতিল করা হয়েছে।";
          setVoiceReply(cancelMsg);
          speakText(cancelMsg);
          return;
        }
      }

      setVoiceProcessing(true);
      setVoiceReply("");
      setVoiceSteps([]);
      setVoiceLimitationNote("");

      try {
        const lower = cmd.toLowerCase();

        // Check local Phone/Facebook setting guides first (e.g. Wi-Fi Settings Guide, Facebook Settings Guide)
        const localSetting = resolveLocalSettingGuide(lower);
        if (localSetting && /(setting|সেটিং|guide|গাইড|কোথায়|kothay|how)/i.test(lower)) {
          setVoiceReply(`${localSetting.title}: ${localSetting.steps[0]}`);
          setVoiceSteps(localSetting.steps);
          setVoiceLimitationNote(
            "স্বচ্ছতা: ওয়েব ব্রাউজার সরাসরি অন্য অ্যাপের ভেতর ট্যাপ বা সিস্টেম সেটিং পরিবর্তন করতে পারে না; তবে প্রতিটি ধাপ আপনাকে বলে দিতে পারে।"
          );
          speakText(`${localSetting.title}। ${localSetting.steps[0]}`);
          return;
        }

        // Fast local pattern matching for Open App (with Pre-Execution Confirmation!)
        const isOpenIntent = /(open|launch|start|খোলো|খুলো|চালু করো|ওপেন)/i.test(lower);
        const localApp = isOpenIntent ? resolveLocalAppMatch(lower) : null;

        if (localApp && toggles.smartAppLauncher) {
          requestConfirmedAppLaunch(localApp, cmd, true);
          return;
        }

        if (
          /(analyze screen|check screen|স্ক্রিন দেখো|স্ক্রিনে কী|কোথায় ক্লিক)/i.test(lower) &&
          toggles.aiScreenAnalysis
        ) {
          if (isSharingScreen || uploadedPreviewUrl) {
            setVoiceReply("আপনার স্ক্রিন বিশ্লেষণ করা হচ্ছে...");
            await handleAnalyzeScreen(cmd);
            return;
          }
        }

        // Send to backend AI Mobile Control API
        const apiRes = await processPhoneVoiceApi({
          text: cmd,
          language: voiceLang === "en-US" ? "en" : "bn",
          hasScreenShare: isSharingScreen || Boolean(uploadedPreviewUrl),
        });

        if (!apiRes.success || !apiRes.result) {
          if (localSetting) {
            setVoiceReply(`${localSetting.title} পাওয়ার নির্দেশনা নিচে দেওয়া হলো।`);
            setVoiceSteps(localSetting.steps);
            setVoiceLimitationNote("সার্ভার অনুপলব্ধ থাকায় স্থানীয় গাইড দেখানো হচ্ছে।");
            speakText(localSetting.steps[0] || localSetting.title);
            return;
          }
          setVoiceReply(apiRes.error || "নির্দেশটি প্রসেস করা যায়নি।");
          if (apiRes.errorCode === "MISSING_API_KEY") {
            refreshBackendStatus();
          }
          return;
        }

        const { intent, appKey, searchTopic, spokenReply, steps, limitationNote } = apiRes.result;
        setVoiceReply(spokenReply);
        setVoiceSteps(steps || []);
        setVoiceLimitationNote(limitationNote || "");

        if (intent === "open_app" && appKey && toggles.smartAppLauncher) {
          const matchedApp = resolveLocalAppMatch(appKey);
          if (matchedApp) {
            requestConfirmedAppLaunch(matchedApp, cmd, true);
          } else {
            speakText(spokenReply);
          }
        } else if (
          intent === "analyze_screen" &&
          toggles.aiScreenAnalysis &&
          (isSharingScreen || uploadedPreviewUrl)
        ) {
          await handleAnalyzeScreen(cmd);
        } else {
          if (intent === "phone_search" && searchTopic) {
            setPhoneSearchQuery(searchTopic);
          }
          speakText(spokenReply);
        }
      } finally {
        setVoiceProcessing(false);
      }
    },
    [
      toggles.masterEnabled,
      toggles.smartAppLauncher,
      toggles.aiScreenAnalysis,
      pendingAppConfirmation,
      executeLaunchApp,
      requestConfirmedAppLaunch,
      isSharingScreen,
      uploadedPreviewUrl,
      handleAnalyzeScreen,
      voiceLang,
      refreshBackendStatus,
      speakText,
    ]
  );

  // 1. Start Voice Mobile Control (Web Speech API)
  const startVoiceListening = async () => {
    if (!toggles.masterEnabled || !toggles.voiceControl) return;
    setGlobalError("");

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechRecognitionSupported(false);
      setGlobalError(
        "এই ব্রাউজারটি Web Speech API সমর্থন করে না। Chrome/Edge ব্রাউজার ব্যবহার করুন অথবা নিচের কমান্ড বক্স ব্যবহার করুন।"
      );
      return;
    }

    stopVoiceListening();
    const recognition = new SpeechRec();
    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    let captured = "";
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript("");
      setMicPermission("granted");
    };

    recognition.onresult = (event: any) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      captured = full;
      setVoiceTranscript(full);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicPermission("denied");
        setGlobalError(
          "মাইক্রোফোন অনুমতি পাওয়া যায়নি। ব্রাউজার সেটিংস থেকে মাইক্রোফোন Allow করুন।"
        );
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setGlobalError(`ভয়েস রিকগনিশন ত্রুটি: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (captured.trim().length > 0) {
        handleProcessCommand(captured.trim());
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setGlobalError(err?.message || "ভয়েস রিকগনিশন শুরু করা যায়নি।");
    }
  };

  // Shared surface tokens matching Premium Purple Theme
  const cardCls = isLight
    ? "rounded-2xl bg-white border border-purple-200/80 p-4 space-y-3"
    : "rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/30 transition-colors p-4 space-y-3";
  const mutedTextCls = isLight ? "text-slate-600" : "text-slate-400";
  const headingTextCls = isLight ? "text-slate-900" : "text-white";

  const renderToggle = (
    checked: boolean,
    onChange: () => void,
    label: string,
    disabled = false
  ) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-purple-500 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? "bg-purple-600 border-purple-500"
          : isLight
          ? "bg-slate-300 border-slate-400"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );

  const hasVisualSource = isSharingScreen || Boolean(uploadedPreviewUrl);
  const isLiveSessionActive = liveCallState !== "idle";

  return (
    <div className="space-y-5">
      {/* Top Banner + Master Control */}
      <div
        className={`rounded-2xl p-4 border ${
          isLight
            ? "bg-purple-50 border-purple-200"
            : "bg-gradient-to-br from-purple-950/50 via-slate-900 to-indigo-950/40 border-purple-500/30"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-sm font-bold ${headingTextCls}`}>
                Sajjat Ai Mobile Control
              </h4>
              <p className={`text-xs mt-0.5 leading-relaxed ${mutedTextCls}`}>
                ভয়েস কমান্ড, রিয়েল-টাইম বাংলা কণ্ঠ, লাইভ স্ক্রিন বিশ্লেষণ, স্মার্ট অ্যাপ লঞ্চার ও নিরাপদ কনফার্মেশন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleFeature("masterEnabled")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                toggles.masterEnabled
                  ? "bg-purple-600 hover:bg-purple-500 border-purple-500 text-white"
                  : isLight
                  ? "bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-slate-900 text-slate-300 border-slate-700"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{toggles.masterEnabled ? "সক্রিয় (Active)" : "বন্ধ (Paused)"}</span>
            </button>

            {(isListening || isSpeaking || isSharingScreen || isLiveSessionActive) && (
              <button
                type="button"
                onClick={stopAllPhoneControl}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>সব বন্ধ করুন</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Status Metadata Row */}
        <div
          className={`mt-3 pt-3 border-t ${
            isLight ? "border-purple-200/70" : "border-purple-500/20"
          } flex flex-wrap items-center gap-x-3 gap-y-1 text-xs`}
        >
          <span
            className={
              backendStatus?.configured
                ? "text-emerald-400 font-medium"
                : "text-amber-400 font-medium"
            }
          >
            {statusLoading
              ? "সিস্টেম যাচাই হচ্ছে..."
              : backendStatus?.configured
              ? "Sajjat Ai ব্যাকএন্ড সংযুক্ত"
              : "এআই API Key সেট করা নেই"}
          </span>
          <span className={mutedTextCls} aria-hidden="true">
            ·
          </span>
          <span className={mutedTextCls}>
            মাইক্রোফোন:{" "}
            {micPermission === "granted"
              ? "অনুমোদিত"
              : micPermission === "denied"
              ? "বাতিল"
              : micPermission === "unsupported"
              ? "অসমর্থিত"
              : "অনুমতি প্রয়োজন"}
          </span>
          <span className={mutedTextCls} aria-hidden="true">
            ·
          </span>
          <span className={mutedTextCls}>
            স্ক্রিন শেয়ার:{" "}
            {isSharingScreen
              ? "চলছে"
              : screenPermission === "unsupported"
              ? "মোবাইল ব্রাউজারে সীমিত"
              : "বন্ধ"}
          </span>
          <span className={mutedTextCls} aria-hidden="true">
            ·
          </span>
          <span className={hasNativeBridge ? "text-emerald-400 font-medium" : mutedTextCls}>
            মোড:{" "}
            {hasNativeBridge
              ? "Native Android Bridge যুক্ত"
              : "Web Browser Mode"}
          </span>
        </div>
      </div>

      {/* Honest Native Android Companion Bridge Architecture Status */}
      <div
        className={`rounded-2xl p-3.5 border text-xs flex items-start gap-2.5 ${
          hasNativeBridge
            ? "bg-emerald-950/30 border-emerald-500/35 text-emerald-200"
            : isLight
            ? "bg-slate-50 border-slate-200 text-slate-700"
            : "bg-slate-900/70 border-slate-800 text-slate-300"
        }`}
      >
        <Info
          className={`w-4 h-4 shrink-0 mt-0.5 ${
            hasNativeBridge ? "text-emerald-400" : "text-purple-400"
          }`}
        />
        <div className="space-y-1">
          <p className="font-semibold">
            {hasNativeBridge
              ? "Native Android Companion Bridge সক্রিয় রয়েছে"
              : "স্বচ্ছ প্রযুক্তিগত তথ্য (Web Browser vs Android Companion Bridge)"}
          </p>
          <p className={`text-[11px] leading-relaxed ${mutedTextCls}`}>
            {hasNativeBridge
              ? "আপনার Android Companion Bridge (`window.SajjatAndroidBridge`) শনাক্ত হয়েছে — অ্যাপ খোলা ও সিস্টেম সেটিং কমান্ড নেটিভ ব্রিজে পাঠানো হবে।"
              : "সাধারণ ব্রাউজার (Chrome / Netlify Web) নিরাপত্তার কারণে অন্য অ্যাপের (WhatsApp, IMO, Facebook, TikTok) ভেতরে সরাসরি অটো-ক্লিক বা সিস্টেম সেটিংস পরিবর্তন করতে পারে না। এখানে Android Intent/App Link দিয়ে অ্যাপ খোলা, লাইভ স্ক্রিন/স্ক্রিনশট দেখে ধাপে ধাপে গাইড এবং ভবিষ্যতে Android Accessibility Companion App যুক্ত করার জন্য Native Bridge (`window.SajjatAndroidBridge`) ইন্টারফেস প্রস্তুত রাখা হয়েছে।"}
          </p>
        </div>
      </div>

      {/* Global Error Alert */}
      {globalError && (
        <div className="rounded-2xl p-3.5 bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError("")}
            className="text-rose-300 hover:text-white shrink-0"
            aria-label="ত্রুটি বার্তা বন্ধ করুন"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Voice Mobile Control */}
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h5 className={`text-xs font-bold ${headingTextCls}`}>1. Voice Mobile Control</h5>
                <p className={`text-[11px] ${mutedTextCls}`}>
                  {isListening
                    ? "শুনছি... কথা বলুন"
                    : speechRecognitionSupported
                    ? "বাংলা ও ইংরেজি ভয়েস নির্দেশ"
                    : "Web Speech অসমর্থিত"}
                </p>
              </div>
            </div>
            {renderToggle(
              toggles.voiceControl,
              () => toggleFeature("voiceControl"),
              "Voice Mobile Control চালু বা বন্ধ করুন",
              !toggles.masterEnabled
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoiceLang("bn-BD")}
              className={`min-h-[40px] flex-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                voiceLang === "bn-BD"
                  ? "bg-purple-600/25 border-purple-500 text-purple-200"
                  : isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              বাংলা (bn-BD)
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang("en-US")}
              className={`min-h-[40px] flex-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                voiceLang === "en-US"
                  ? "bg-purple-600/25 border-purple-500 text-purple-200"
                  : isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              English (en-US)
            </button>
          </div>

          <button
            type="button"
            disabled={!toggles.masterEnabled || !toggles.voiceControl || voiceProcessing}
            onClick={isListening ? stopVoiceListening : startVoiceListening}
            className={`w-full min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isListening
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            {isListening ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>ভয়েস শোনা বন্ধ করুন</span>
              </>
            ) : voiceProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>প্রসেস হচ্ছে...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>কথা বলে নির্দেশ দিন</span>
              </>
            )}
          </button>

          {/* Optional typed command bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCommand.trim()) {
                setVoiceTranscript(manualCommand.trim());
                handleProcessCommand(manualCommand.trim());
                setManualCommand("");
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={manualCommand}
              onChange={(e) => setManualCommand(e.target.value)}
              disabled={!toggles.masterEnabled || !toggles.voiceControl}
              placeholder="উদা: IMO খোলো, TikTok, Wi-Fi কোথায়..."
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900"
                  : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
              }`}
            />
            <button
              type="submit"
              disabled={
                !toggles.masterEnabled ||
                !toggles.voiceControl ||
                !manualCommand.trim() ||
                voiceProcessing
              }
              aria-label="নির্দেশ পাঠান"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-300 flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Pre-Execution App Launch Confirmation Card */}
          {pendingAppConfirmation && (
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/50 text-xs space-y-2.5">
              <p className="font-semibold text-purple-200">
                নিশ্চিতকরণ: আপনি কি এখন {pendingAppConfirmation.app.bnName} (
                {pendingAppConfirmation.app.name}) খুলতে চান?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const app = pendingAppConfirmation.app;
                    setPendingAppConfirmation(null);
                    executeLaunchApp(app);
                  }}
                  className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>হ্যাঁ, খুলুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAppConfirmation(null);
                    setVoiceReply("নির্দেশটি বাতিল করা হয়েছে।");
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>বাতিল</span>
                </button>
              </div>
            </div>
          )}

          {(voiceTranscript || voiceReply) && (
            <div
              className={`p-3 rounded-xl text-xs space-y-1.5 ${
                isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900/90 text-slate-200"
              }`}
            >
              {voiceTranscript && (
                <p className="text-purple-400 font-medium">আপনি বলেছেন: "{voiceTranscript}"</p>
              )}
              {voiceReply && <p className="leading-relaxed">{voiceReply}</p>}
              {voiceSteps.length > 0 && (
                <ul className={`list-disc list-inside space-y-1 ${mutedTextCls}`}>
                  {voiceSteps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              )}
              {voiceLimitationNote && (
                <p className="text-[11px] text-amber-400 pt-1">{voiceLimitationNote}</p>
              )}
            </div>
          )}
        </div>

        {/* 2. AI Voice Response */}
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className={`text-xs font-bold ${headingTextCls}`}>2. AI Voice Response</h5>
                <p className={`text-[11px] ${mutedTextCls}`}>
                  {isSpeaking
                    ? "কথা বলছে..."
                    : !speechSupported
                    ? "SpeechSynthesis অসমর্থিত"
                    : toggles.aiVoiceResponse
                    ? "সক্রিয় (SpeechSynthesis)"
                    : "মিউট করা"}
                </p>
              </div>
            </div>
            {renderToggle(
              toggles.aiVoiceResponse,
              () => toggleFeature("aiVoiceResponse"),
              "AI Voice Response চালু বা বন্ধ করুন",
              !toggles.masterEnabled
            )}
          </div>

          <div
            className={`p-3 rounded-xl text-xs space-y-1 ${
              isLight ? "bg-slate-100" : "bg-slate-900/90"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={mutedTextCls}>বাংলা ভয়েস স্ট্যাটাস:</span>
              <span
                className={
                  banglaVoiceName
                    ? "text-emerald-400 font-medium text-right"
                    : "text-amber-400 font-medium text-right"
                }
              >
                {banglaVoiceName ? "বাংলা কণ্ঠ পাওয়া গেছে" : "ডিফল্ট ব্রাউজার ভয়েস"}
              </span>
            </div>
            {banglaVoiceName ? (
              <p className={`text-[11px] truncate ${mutedTextCls}`}>{banglaVoiceName}</p>
            ) : (
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                এই ডিভাইসের ব্রাউজারে বাংলা SpeechSynthesis ভয়েস ইনস্টল না থাকলে সিস্টেমের ডিফল্ট কণ্ঠ ব্যবহৃত হবে।
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!toggles.masterEnabled || !toggles.aiVoiceResponse || !speechSupported}
              onClick={() =>
                speakText(
                  "হ্যালো! আমি সাজ্জাত এআই মোবাইল কন্ট্রোল। আপনার কণ্ঠ ও স্ক্রিন নির্দেশনায় সাহায্য করতে আমি প্রস্তুত।"
                )
              }
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>কণ্ঠ পরীক্ষা করুন</span>
            </button>

            <button
              type="button"
              disabled={!isSpeaking}
              onClick={stopSpeaking}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <VolumeX className="w-4 h-4" />
              <span>থামান</span>
            </button>
          </div>

          <div
            className={`pt-2 border-t ${
              isLight ? "border-slate-200" : "border-slate-800/80"
            } flex items-center justify-between gap-2 text-[11px]`}
          >
            <span className={mutedTextCls}>অ্যাপ খোলার আগে নিশ্চিতকরণ জিজ্ঞাসা করুন</span>
            {renderToggle(
              toggles.confirmBeforeAppLaunch,
              () => toggleFeature("confirmBeforeAppLaunch"),
              "অ্যাপ খোলার আগে নিশ্চিতকরণ",
              !toggles.masterEnabled
            )}
          </div>
        </div>

        {/* 3. Live Screen Sharing */}
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h5 className={`text-xs font-bold ${headingTextCls}`}>3. Live Screen Sharing</h5>
                <p className={`text-[11px] ${mutedTextCls}`}>
                  {isSharingScreen
                    ? "স্ক্রিন শেয়ার চলছে"
                    : uploadedPreviewUrl
                    ? "স্ক্রিনশট নির্বাচিত"
                    : screenSupported
                    ? "অনুমতির অপেক্ষায়"
                    : "Android Chrome-এ সীমিত"}
                </p>
              </div>
            </div>
            {renderToggle(
              toggles.liveScreenShare,
              () => toggleFeature("liveScreenShare"),
              "Live Screen Sharing চালু বা বন্ধ করুন",
              !toggles.masterEnabled
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!toggles.masterEnabled || !toggles.liveScreenShare}
              onClick={isSharingScreen ? stopScreenSharing : startScreenSharing}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 ${
                isSharingScreen
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isSharingScreen ? (
                <>
                  <MonitorOff className="w-4 h-4" />
                  <span>Stop Sharing</span>
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4" />
                  <span>স্ক্রিন শেয়ার শুরু করুন</span>
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={!toggles.masterEnabled}
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>স্ক্রিনশট</span>
            </button>
          </div>

          {screenError && (
            <p className="text-[11px] text-amber-400 leading-relaxed">{screenError}</p>
          )}

          {/* Live video or screenshot preview */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-contain ${isSharingScreen ? "block" : "hidden"}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            {!isSharingScreen && uploadedPreviewUrl && (
              <img
                src={uploadedPreviewUrl}
                alt="নির্বাচিত স্ক্রিনশট প্রিভিউ"
                className="w-full h-full object-contain"
              />
            )}
            {!hasVisualSource && (
              <div className="p-4 text-center space-y-1">
                <Monitor className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-[11px] text-slate-500">
                  আপনার অনুমতি ছাড়া কখনো স্ক্রিন দেখা হবে না
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. AI Screen Analysis */}
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-fuchsia-500/15 text-fuchsia-400">
                <ScanEye className="w-4 h-4" />
              </div>
              <div>
                <h5 className={`text-xs font-bold ${headingTextCls}`}>4. AI Screen Analysis</h5>
                <p className={`text-[11px] ${mutedTextCls}`}>
                  {isAnalyzingScreen
                    ? "Sajjat Ai বিশ্লেষণ করছে..."
                    : analysisModel
                    ? `বিশ্লেষিত (${analysisModel})`
                    : "Sajjat Ai স্ক্রিন ও ইমেজ বিশ্লেষণ"}
                </p>
              </div>
            </div>
            {renderToggle(
              toggles.aiScreenAnalysis,
              () => toggleFeature("aiScreenAnalysis"),
              "AI Screen Analysis চালু বা বন্ধ করুন",
              !toggles.masterEnabled
            )}
          </div>

          <input
            type="text"
            value={screenQuestion}
            onChange={(e) => setScreenQuestion(e.target.value)}
            disabled={!toggles.masterEnabled || !toggles.aiScreenAnalysis}
            placeholder="প্রশ্ন লিখুন (ঐচ্ছিক): এখন কোথায় ক্লিক করব?"
            className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900"
                : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            }`}
          />

          <button
            type="button"
            disabled={
              !toggles.masterEnabled ||
              !toggles.aiScreenAnalysis ||
              !hasVisualSource ||
              isAnalyzingScreen
            }
            onClick={() => handleAnalyzeScreen()}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAnalyzingScreen ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>স্ক্রিন বিশ্লেষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <ScanEye className="w-4 h-4" />
                <span>স্ক্রিন বিশ্লেষণ করুন</span>
              </>
            )}
          </button>

          {analysisError && (
            <p className="text-[11px] text-rose-400 leading-relaxed">{analysisError}</p>
          )}

          {screenAnalysis && (
            <div
              className={`p-3 rounded-xl text-xs space-y-2 ${
                isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900/90 text-slate-200"
              }`}
            >
              <div>
                <span className="font-bold text-purple-400 block mb-0.5">স্ক্রিনে যা দেখা যাচ্ছে:</span>
                <p className="leading-relaxed">{screenAnalysis.whatIsOnScreen}</p>
              </div>
              {screenAnalysis.nextSteps.length > 0 && (
                <div>
                  <span className="font-bold text-emerald-400 block mb-0.5">
                    পরবর্তী ধাপ (কোথায় ক্লিক করবেন):
                  </span>
                  <ol className="list-decimal list-inside space-y-1">
                    {screenAnalysis.nextSteps.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {screenAnalysis.safetyNote && (
                <p className="text-[11px] text-amber-400">{screenAnalysis.safetyNote}</p>
              )}
            </div>
          )}
        </div>

        {/* 5. Sajjat Ai Real-Time Live Voice Conversation (Unified Engine) */}
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h5 className={`text-xs font-bold ${headingTextCls}`}>
                  5. Sajjat Ai Live Voice Chat
                </h5>
                <p className={`text-[11px] ${mutedTextCls}`}>
                  {isLiveConnected
                    ? liveConnectionMode === "netlify_loop"
                      ? `সংযুক্ত (Netlify Voice · ${liveFormattedDuration})`
                      : `সংযুক্ত (লাইভ অডিও · ${liveFormattedDuration})`
                    : liveCallState === "connecting"
                    ? "সংযোগ হচ্ছে..."
                    : "রিয়েল-টাইম ভয়েস কথোপকথন"}
                </p>
              </div>
            </div>
            {renderToggle(
              toggles.liveVoiceConversation,
              () => toggleFeature("liveVoiceConversation"),
              "Live Voice Chat চালু বা বন্ধ করুন",
              !toggles.masterEnabled
            )}
          </div>

          <p className={`text-[11px] leading-relaxed ${mutedTextCls}`}>
            {backendStatus?.liveWsSupported
              ? "রিয়েল-টাইম অডিও ও স্ক্রিন শেয়ার স্ট্রিমিং প্রস্তুত।"
              : "Netlify Serverless পরিবেশে স্মার্ট ভয়েস লুপ মোডে রিয়েল-টাইম কথোপকথন চলবে।"}
          </p>

          {!isLiveSessionActive || liveCallState === "error" || liveCallState === "permission_denied" ? (
            <button
              type="button"
              disabled={!toggles.masterEnabled || !toggles.liveVoiceConversation}
              onClick={startLiveSession}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Radio className="w-4 h-4" />
              <span>লাইভ কথোপকথন শুরু করুন</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLiveMute}
                disabled={!isLiveConnected}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                  liveIsMuted
                    ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                    : "bg-slate-800 border-slate-700 text-slate-200"
                }`}
              >
                {liveIsMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{liveIsMuted ? "আনমিউট" : "মিউট"}</span>
              </button>

              <button
                type="button"
                onClick={toggleLiveSpeaker}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  !liveAudioEnabled
                    ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                    : "bg-slate-800 border-slate-700 text-slate-200"
                }`}
              >
                {liveAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={stopLiveSession}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>কল বন্ধ করুন</span>
              </button>
            </div>
          )}

          {isLiveConnected && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    liveIsMuted ? "bg-rose-500/40" : "bg-gradient-to-r from-purple-500 to-cyan-400"
                  }`}
                  style={{ width: `${liveIsMuted ? 0 : Math.max(4, liveMicLevel)}%` }}
                />
              </div>
              <p className={`text-[10px] ${mutedTextCls}`}>{liveStatusMessage}</p>
            </div>
          )}

          {liveErrorDetail && (
            <p className="text-[11px] text-rose-400 leading-relaxed">{liveErrorDetail}</p>
          )}

          {(liveInputTranscript || liveOutputTranscript) && (
            <div
              className={`p-3 rounded-xl text-xs space-y-1 ${
                isLight ? "bg-slate-100" : "bg-slate-900/90"
              }`}
            >
              {liveInputTranscript && (
                <p className="text-purple-400">আপনি: {liveInputTranscript}</p>
              )}
              {liveOutputTranscript && (
                <p className="text-emerald-400">Sajjat Ai: {liveOutputTranscript}</p>
              )}
            </div>
          )}
        </div>

        {/* 6. Smart App Launcher (Includes IMO, TikTok, Facebook, WhatsApp, Phone Settings, YouTube, etc.) */}
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div>
                <h5 className={`text-xs font-bold ${headingTextCls}`}>6. Smart App Launcher</h5>
                <p className={`text-[11px] ${mutedTextCls}`}>
                  WhatsApp, IMO, TikTok, Facebook, Phone Settings & ওয়েব ফলব্যাক
                </p>
              </div>
            </div>
            {renderToggle(
              toggles.smartAppLauncher,
              () => toggleFeature("smartAppLauncher"),
              "Smart App Launcher চালু বা বন্ধ করুন",
              !toggles.masterEnabled
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LAUNCHABLE_APPS.filter((a) =>
              ["whatsapp", "facebook", "imo", "tiktok", "youtube", "messenger", "telegram", "gmail", "settings"].includes(
                a.key
              )
            ).map((app) => (
              <button
                key={app.key}
                type="button"
                disabled={!toggles.masterEnabled || !toggles.smartAppLauncher}
                onClick={() => executeLaunchApp(app)}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40 ${
                  isLight
                    ? "bg-slate-50 hover:bg-purple-50 border-slate-200 text-slate-800"
                    : "bg-slate-900 hover:bg-purple-600/20 border-slate-800 hover:border-purple-500/40 text-slate-200"
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{app.name}</span>
              </button>
            ))}
          </div>

          {lastLaunchAttempt && (
            <div
              className={`p-3 rounded-xl text-xs space-y-2 ${
                isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900/90 text-slate-200"
              }`}
            >
              <p className="leading-relaxed">{lastLaunchAttempt.statusText}</p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={lastLaunchAttempt.app.webFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{lastLaunchAttempt.app.webFallbackLabel}</span>
                </a>
              </div>
              <p className={`text-[11px] ${mutedTextCls}`}>
                {lastLaunchAttempt.app.manualInstruction}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 7. Smart Phone Search (Includes Wi-Fi Settings Guide & Facebook Settings Guide) */}
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h5 className={`text-xs font-bold ${headingTextCls}`}>
                7. Smart Settings & App Guide Search
              </h5>
              <p className={`text-[11px] ${mutedTextCls}`}>
                Wi-Fi Settings Guide, Facebook Settings Guide ও যেকোনো ফোনের সেটিং খুঁজে পাওয়ার ধাপে ধাপে নির্দেশনা
              </p>
            </div>
          </div>
          {renderToggle(
            toggles.smartPhoneSearch,
            () => toggleFeature("smartPhoneSearch"),
            "Smart Phone Search চালু বা বন্ধ করুন",
            !toggles.masterEnabled
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePhoneSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={phoneSearchQuery}
            onChange={(e) => setPhoneSearchQuery(e.target.value)}
            disabled={!toggles.masterEnabled || !toggles.smartPhoneSearch}
            placeholder="উদা: Wi-Fi সেটিং, Facebook Settings, Hotspot, Permission"
            className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900"
                : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            }`}
          />
          <button
            type="submit"
            disabled={
              !toggles.masterEnabled ||
              !toggles.smartPhoneSearch ||
              !phoneSearchQuery.trim() ||
              phoneSearchLoading
            }
            className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {phoneSearchLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>নির্দেশনা দেখুন</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {PHONE_SETTING_GUIDES.slice(0, 7).map((guide) => (
            <button
              key={guide.topic}
              type="button"
              disabled={!toggles.masterEnabled || !toggles.smartPhoneSearch}
              onClick={() => {
                setPhoneSearchQuery(guide.title);
                handlePhoneSearch(guide.topic);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer disabled:opacity-40 ${
                isLight
                  ? "bg-slate-100 hover:bg-purple-50 border-slate-200 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              {guide.title}
            </button>
          ))}
        </div>

        {phoneSearchResult && (
          <div
            className={`p-3 rounded-xl text-xs space-y-2 ${
              isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900/90 text-slate-200"
            }`}
          >
            <p className="font-bold text-indigo-400">{phoneSearchResult.title}</p>
            <p>{phoneSearchResult.reply}</p>
            {phoneSearchResult.steps.length > 0 && (
              <ol className="list-decimal list-inside space-y-1">
                {phoneSearchResult.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
            <p className="text-[11px] text-amber-400">{phoneSearchResult.limitationNote}</p>
          </div>
        )}
      </div>

      {/* 8. Permissions & Privacy */}
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className={`text-xs font-bold ${headingTextCls}`}>8. Permissions & Privacy</h5>
              <p className={`text-[11px] ${mutedTextCls}`}>
                অনুমতি, ব্যাকএন্ড অবস্থা ও স্বচ্ছ গোপনীয়তা নীতিমালা
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              refreshBackendStatus();
              checkBrowserCapabilities();
            }}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? "bg-slate-100 border-slate-300 text-slate-700"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? "animate-spin" : ""}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Mic Permission */}
          <div
            className={`p-3 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Microphone</span>
              {micPermission === "granted" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : micPermission === "denied" ? (
                <MicOff className="w-4 h-4 text-rose-400" />
              ) : (
                <Mic className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <p className={`text-[11px] ${mutedTextCls}`}>
              অবস্থা:{" "}
              <span className="font-medium text-slate-200">
                {micPermission === "granted"
                  ? "অনুমোদিত"
                  : micPermission === "denied"
                  ? "প্রত্যাখ্যাত"
                  : micPermission === "unsupported"
                  ? "অসমর্থিত"
                  : "অনুমতি চায়নি"}
              </span>
            </p>
            <button
              type="button"
              onClick={requestMicrophonePermission}
              className="w-full py-1.5 px-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-300 text-[11px] font-medium cursor-pointer"
            >
              মাইক্রোফোন যাচাই
            </button>
          </div>

          {/* Screen Sharing Permission */}
          <div
            className={`p-3 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Screen Sharing</span>
              {isSharingScreen ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : screenPermission === "denied" ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Monitor className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <p className={`text-[11px] ${mutedTextCls}`}>
              অবস্থা:{" "}
              <span className="font-medium text-slate-200">
                {isSharingScreen
                  ? "সক্রিয় শেয়ার"
                  : screenPermission === "denied"
                  ? "বাতিল"
                  : screenPermission === "unsupported"
                  ? "ব্রাউজারে অসমর্থিত"
                  : "প্রস্তুত (অনুমতি সাপেক্ষ)"}
              </span>
            </p>
            <button
              type="button"
              onClick={isSharingScreen ? stopScreenSharing : startScreenSharing}
              disabled={!screenSupported}
              className="w-full py-1.5 px-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-300 text-[11px] font-medium disabled:opacity-40 cursor-pointer"
            >
              {isSharingScreen ? "Stop Sharing" : "শেয়ার শুরু/যাচাই"}
            </button>
          </div>

          {/* API Connection Status */}
          <div
            className={`p-3 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Backend & Engine</span>
              {backendStatus?.configured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <p className={`text-[11px] ${mutedTextCls}`}>
              অবস্থা:{" "}
              <span
                className={
                  backendStatus?.configured
                    ? "text-emerald-400 font-medium"
                    : "text-amber-400 font-medium"
                }
              >
                {statusLoading
                  ? "যাচাই হচ্ছে..."
                  : backendStatus?.configured
                  ? `সংযুক্ত (${backendStatus.runtime === "netlify-function" ? "Netlify" : "Node"})`
                  : "API Key অনুপস্থিত"}
              </span>
            </p>
            <p className={`text-[11px] truncate ${mutedTextCls}`}>
              ইঞ্জিন: Sajjat Ai Voice & Vision
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div
          className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
            isLight
              ? "bg-purple-50 border-purple-200 text-slate-700"
              : "bg-slate-900/70 border-slate-800 text-slate-300"
          }`}
        >
          <strong className="text-purple-400 block mb-1">
            গোপনীয়তা ও নিরাপত্তা ঘোষণা (Privacy Notice):
          </strong>
          আপনার স্পষ্ট অনুমতি ছাড়া মাইক্রোফোন বা স্ক্রিন কখনোই ব্যবহার করা হয় না। স্ক্রিন ফ্রেম বা ভয়েস কমান্ড কেবল আপনি বিশ্লেষণ বা কথা বলার সময়ই নিরাপদ সার্ভারের মাধ্যমে প্রসেস করা হয় এবং স্থায়ীভাবে সংরক্ষণ করা হয় না। সকল API Key সর্বদা সার্ভারে সুরক্ষিত থাকে।
        </div>
      </div>
    </div>
  );
};
