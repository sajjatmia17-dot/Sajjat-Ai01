import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Video,
  Headphones,
  ExternalLink,
  SkipBack,
  SkipForward,
  AlertCircle,
} from "lucide-react";
import { UniversalSearchResultItem } from "../types";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser required"));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const existingReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (existingReady) {
        try {
          existingReady();
        } catch {
          // ignore
        }
      }
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube IFrame API failed to initialize"));
      }
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        ytApiPromise = null;
        reject(new Error("YouTube API script blocked"));
      };
      document.head.appendChild(tag);
    }

    // Safety check in case script finished loading right before callback registration
    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(poll);
        resolve(window.YT);
      }
    }, 150);

    setTimeout(() => {
      clearInterval(poll);
      if (!window.YT || !window.YT.Player) {
        ytApiPromise = null;
        reject(new Error("YouTube API load timeout"));
      }
    }, 12000);
  });

  return ytApiPromise;
}

function formatSec(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function extractYouTubeVideoId(item: UniversalSearchResultItem): string | null {
  if (item.youtubeVideoId) return item.youtubeVideoId;
  const fromUrl = (item.originalUrl || "").match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (fromUrl) return fromUrl[1];
  const fromEmbed = (item.embedUrl || "").match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  return fromEmbed ? fromEmbed[1] : null;
}

interface YouTubeInternalPlayerProps {
  video: UniversalSearchResultItem;
  videoQueue: UniversalSearchResultItem[];
  onSelectVideo: (video: UniversalSearchResultItem) => void;
  autoPlay?: boolean;
}

export const YouTubeInternalPlayer: React.FC<YouTubeInternalPlayerProps> = ({
  video,
  videoQueue,
  onSelectVideo,
  autoPlay = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hostElRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const loadedVideoIdRef = useRef<string | null>(null);

  const [listenMode, setListenMode] = useState<"video" | "audio">("video");
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [apiFallbackIframe, setApiFallbackIframe] = useState(false);

  const videoId = extractYouTubeVideoId(video);

  const playableYtQueue = videoQueue.filter((v) => Boolean(extractYouTubeVideoId(v)));
  const currentIdx = playableYtQueue.findIndex((v) => v.id === video.id);

  const handleNext = () => {
    if (playableYtQueue.length <= 1) return;
    const next = playableYtQueue[(currentIdx + 1) % playableYtQueue.length];
    if (next) onSelectVideo(next);
  };

  const handlePrev = () => {
    if (playableYtQueue.length <= 1) return;
    const prev = playableYtQueue[(currentIdx - 1 + playableYtQueue.length) % playableYtQueue.length];
    if (prev) onSelectVideo(prev);
  };

  // Initialize Official YouTube IFrame Player API
  useEffect(() => {
    if (!videoId || !hostElRef.current) return;

    let cancelled = false;
    setEmbedError(null);
    setApiFallbackIframe(false);

    // If player already exists, switch video in-place smoothly
    if (playerRef.current && typeof playerRef.current.loadVideoById === "function" && isReady) {
      if (loadedVideoIdRef.current !== videoId) {
        loadedVideoIdRef.current = videoId;
        setCurrentTime(0);
        setDuration(0);
        try {
          playerRef.current.loadVideoById(videoId);
        } catch {
          // recreate below if loadVideoById fails
        }
      }
      return;
    }

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !hostElRef.current) return;

        // Clear any previous inner element cleanly
        const mountDiv = document.createElement("div");
        mountDiv.className = "w-full h-full";
        hostElRef.current.innerHTML = "";
        hostElRef.current.appendChild(mountDiv);

        loadedVideoIdRef.current = videoId;

        playerRef.current = new YT.Player(mountDiv, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: any) => {
              if (cancelled) return;
              setIsReady(true);
              try {
                e.target.setVolume(volume);
                const d = e.target.getDuration?.() || 0;
                if (d > 0) setDuration(d);
                if (autoPlay) {
                  e.target.playVideo?.();
                }
              } catch {
                // ignore
              }
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;
              if (e.data === YTState.PLAYING) {
                setIsPlaying(true);
                setEmbedError(null);
                const d = e.target.getDuration?.() || 0;
                if (d > 0) setDuration(d);
              } else if (e.data === YTState.PAUSED) {
                setIsPlaying(false);
              } else if (e.data === YTState.ENDED) {
                setIsPlaying(false);
                if (playableYtQueue.length > 1) {
                  const next = playableYtQueue[(currentIdx + 1) % playableYtQueue.length];
                  if (next) onSelectVideo(next);
                }
              }
            },
            onError: (e: any) => {
              if (cancelled) return;
              const code = Number(e?.data);
              if (code === 101 || code === 150) {
                setEmbedError(
                  "এই ভিডিওটির প্রকাশক এম্বেড প্লেয়ারে চালানো সীমিত করেছেন। নিচের তালিকা থেকে অন্য ভিডিও বেছে নিন অথবা মূল YouTube-এ দেখুন।"
                );
              } else {
                setEmbedError("ভিডিওটি প্লেয়ারে লোড করতে সমস্যা হয়েছে। অন্য ভিডিও বেছে নিতে পারেন।");
              }
              setIsPlaying(false);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setApiFallbackIframe(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      loadedVideoIdRef.current = null;
    };
  }, []);

  // Poll playback progress while player is ready
  useEffect(() => {
    if (!isReady) return;
    const timer = setInterval(() => {
      try {
        const p = playerRef.current;
        if (!p) return;
        const cur = p.getCurrentTime?.();
        const dur = p.getDuration?.();
        if (typeof cur === "number" && Number.isFinite(cur)) setCurrentTime(cur);
        if (typeof dur === "number" && Number.isFinite(dur) && dur > 0) setDuration(dur);
      } catch {
        // ignore
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isReady]);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleTogglePlay = () => {
    const p = playerRef.current;
    if (!p || !isReady) return;
    try {
      if (isPlaying) {
        p.pauseVideo?.();
      } else {
        p.playVideo?.();
      }
    } catch {
      // ignore
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = Number(e.target.value);
    setCurrentTime(targetSec);
    try {
      playerRef.current?.seekTo?.(targetSec, true);
    } catch {
      // ignore
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = Number(e.target.value);
    setVolume(nextVol);
    setIsMuted(nextVol === 0);
    try {
      if (nextVol > 0) playerRef.current?.unMute?.();
      playerRef.current?.setVolume?.(nextVol);
    } catch {
      // ignore
    }
  };

  const handleToggleMute = () => {
    const p = playerRef.current;
    if (!p || !isReady) return;
    try {
      if (isMuted) {
        p.unMute?.();
        p.setVolume?.(volume > 0 ? volume : 75);
        if (volume === 0) setVolume(75);
        setIsMuted(false);
      } else {
        p.mute?.();
        setIsMuted(true);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback: iframe native fullscreen button remains active inside player
    }
  };

  if (!videoId) return null;

  return (
    <div
      ref={wrapperRef}
      className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl"
    >
      {/* Mode Switcher Bar: Video Mode vs Audio Listening Mode (YouTube ToS Compliant) */}
      <div className="px-3.5 py-2 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span className="truncate">Sajjat AI YouTube Player</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setListenMode("video")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
              listenMode === "video"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-300 border border-slate-800 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>ভিডিও মোড</span>
          </button>

          <button
            type="button"
            onClick={() => setListenMode("audio")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
              listenMode === "audio"
                ? "bg-cyan-600 text-white"
                : "bg-slate-950 text-slate-300 border border-slate-800 hover:text-white"
            }`}
            title="YouTube নিয়ম মেনে দৃশ্যমান মিনি-ভিডিওসহ অডিও শুনুন"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>অডিও মোড</span>
          </button>
        </div>
      </div>

      {/* Player Viewport Area — Video stays ALWAYS visible per YouTube Terms of Service */}
      <div
        className={
          listenMode === "audio"
            ? "p-3 sm:p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 flex flex-col sm:flex-row items-center gap-3.5"
            : "w-full bg-black"
        }
      >
        {/* Official YT IFrame Mount Container (strictly >= 220px wide & visible in BOTH modes) */}
        <div
          className={
            listenMode === "audio"
              ? "w-full sm:w-56 min-w-[220px] aspect-video rounded-xl overflow-hidden bg-black border border-slate-700/70 shrink-0 shadow-md"
              : "w-full aspect-video bg-black"
          }
        >
          {apiFallbackIframe ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0${autoPlay ? "&autoplay=1" : ""}`}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div ref={hostElRef} className="w-full h-full" />
          )}
        </div>

        {/* Audio Listening Mode Side Details */}
        {listenMode === "audio" && (
          <div className="min-w-0 flex-1 w-full space-y-2 text-center sm:text-left">
            <p className="text-[11px] font-semibold text-cyan-400">
              {isPlaying ? "চলছে — অডিও লিসেনিং মোড" : "অডিও লিসেনিং মোড প্রস্তুত"}
            </p>
            <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
              {video.title}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {[video.channelOrAuthor, video.duration || (duration > 0 ? formatSec(duration) : undefined), "YouTube"]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-[10px] text-slate-500">
              YouTube নীতিমালা অনুযায়ী অফিশিয়াল প্লেয়ার দৃশ্যমান রেখেই অডিও চালানো হচ্ছে।
            </p>
          </div>
        )}
      </div>

      {/* Embed Error Notice (if uploader disabled embedding) */}
      {embedError && (
        <div className="px-3.5 py-2.5 bg-rose-950/40 border-t border-rose-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-200">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{embedError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {playableYtQueue.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                পরের ভিডিও চালান
              </button>
            )}
            <a
              href={video.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> YouTube-এ খুলুন
            </a>
          </div>
        </div>
      )}

      {/* Custom Responsive Controls Bar (Play/Pause, Seek, Volume, Prev/Next, Fullscreen) */}
      {!apiFallbackIframe && (
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-t border-slate-800 space-y-2">
          {/* Seek Bar */}
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-400">
            <span className="w-10 text-right">{formatSec(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 1}
              step={1}
              value={Math.min(currentTime, duration > 0 ? duration : 1)}
              onChange={handleSeek}
              disabled={!isReady || duration <= 0}
              aria-label="ভিডিও টাইমলাইন"
              className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
            />
            <span className="w-10">
              {duration > 0 ? formatSec(duration) : video.duration || "--:--"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {playableYtQueue.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="আগের ভিডিও"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={!isReady}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title={isPlaying ? "বিরতি" : "চালান"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>

              {playableYtQueue.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="পরের ভিডিও"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  disabled={!isReady}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title={isMuted ? "আনমিউট" : "মিউট"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  disabled={!isReady}
                  aria-label="ভলিউম"
                  className="w-16 sm:w-20 accent-indigo-500 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title={isFullscreen ? "ফুলস্ক্রিন বন্ধ করুন" : "ফুলস্ক্রিন"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Metadata & Source Footer (Download NOT shown for YouTube per policy) */}
      {listenMode === "video" && (
        <div className="px-3.5 py-2.5 border-t border-slate-800 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white leading-snug">{video.title}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {[video.channelOrAuthor, video.sourceName, video.duration, video.publishedAt]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <a
            href={video.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" /> YouTube
          </a>
        </div>
      )}
    </div>
  );
};
