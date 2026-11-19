import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Download,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X,
  Music,
  Clock,
  Trash2,
} from "lucide-react";
import { AudioLibraryState, UniversalSearchResultItem } from "../types";
import { getUniversalSearchDownloadUrl } from "../api";

interface AudioPlayerDockProps {
  currentTrack: UniversalSearchResultItem | null;
  queue: UniversalSearchResultItem[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSetIsPlaying: (playing: boolean) => void;
  onSelectTrack: (track: UniversalSearchResultItem, newQueue?: UniversalSearchResultItem[]) => void;
  onNext: () => void;
  onPrev: () => void;
  onClosePlayer: () => void;
  audioLibrary: AudioLibraryState;
  onToggleFavorite: (track: UniversalSearchResultItem) => void;
  onAddToPlaylist: (track: UniversalSearchResultItem) => void;
  onRemoveFromPlaylist: (trackId: string) => void;
  downloadPermissionEnabled?: boolean;
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export const AudioPlayerDock: React.FC<AudioPlayerDockProps> = ({
  currentTrack,
  queue,
  isPlaying,
  onTogglePlay,
  onSetIsPlaying,
  onSelectTrack,
  onNext,
  onPrev,
  onClosePlayer,
  audioLibrary,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  downloadPermissionEnabled = true,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "favorites" | "playlist" | "recent">("queue");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
  }, [currentTrack?.id]);

  // Bind audio element to currentTrack URL
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.playableAudioUrl) return;

    if (audio.src !== currentTrack.playableAudioUrl) {
      audio.src = currentTrack.playableAudioUrl;
      audio.load();
    }

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          onSetIsPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [currentTrack?.playableAudioUrl, currentTrack?.id, isPlaying, onSetIsPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const totalLibraryCount =
    audioLibrary.favorites.length +
    audioLibrary.playlist.length +
    audioLibrary.recentlyPlayed.length;

  // Hide dock completely if no active track and library is empty
  if (!currentTrack && totalLibraryCount === 0) {
    return null;
  }

  // Compact library button if player is closed but user has saved items
  if (!currentTrack) {
    return (
      <div className="border-t border-slate-800/80 bg-slate-900/95 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <Music className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate font-medium">
            অডিও লাইব্রেরি: পছন্দ ({audioLibrary.favorites.length}) · প্লেলিস্ট ({audioLibrary.playlist.length}) · সাম্প্রতিক ({audioLibrary.recentlyPlayed.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const first =
              audioLibrary.playlist[0] ||
              audioLibrary.favorites[0] ||
              audioLibrary.recentlyPlayed[0];
            if (first) {
              onSelectTrack(first, audioLibrary.playlist.length ? audioLibrary.playlist : [first]);
            }
          }}
          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold transition-colors cursor-pointer shrink-0"
        >
          চালান
        </button>
      </div>
    );
  }

  const isFavorite = audioLibrary.favorites.some((t) => t.id === currentTrack.id);
  const inPlaylist = audioLibrary.playlist.some((t) => t.id === currentTrack.id);
  const canDownload =
    downloadPermissionEnabled &&
    currentTrack.downloadAllowed &&
    Boolean(currentTrack.downloadUrl);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const tabItems: UniversalSearchResultItem[] =
    activeTab === "queue"
      ? queue
      : activeTab === "favorites"
      ? audioLibrary.favorites
      : activeTab === "playlist"
      ? audioLibrary.playlist
      : audioLibrary.recentlyPlayed;

  return (
    <div className="border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-md text-slate-100 shrink-0 z-20">
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration || 0);
        }}
        onEnded={() => {
          onNext();
        }}
        onError={() => {
          setPlaybackError("অডিও স্ট্রিম লোড করা যায়নি; মূল উৎসে শুনে দেখুন।");
          onSetIsPlaying(false);
        }}
      />

      {/* Expandable Library Drawer (Queue / Favorites / Playlist / Recently Played) */}
      {drawerOpen && (
        <div className="border-b border-slate-800 bg-slate-950/95 px-3 sm:px-5 py-3 max-h-60 overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "queue" as const, label: `কিউ (${queue.length})` },
                { id: "favorites" as const, label: `পছন্দ (${audioLibrary.favorites.length})` },
                { id: "playlist" as const, label: `প্লেলিস্ট (${audioLibrary.playlist.length})` },
                { id: "recent" as const, label: `সাম্প্রতিক (${audioLibrary.recentlyPlayed.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeTab === t.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="ড্রয়ার বন্ধ করুন"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {tabItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">এই তালিকায় এখনো কোনো অডিও যুক্ত করা হয়নি।</p>
          ) : (
            <div className="space-y-1">
              {tabItems.map((item, idx) => {
                const isCurrent = item.id === currentTrack.id;
                return (
                  <div
                    key={`${activeTab}_${item.id}_${idx}`}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs border transition-colors ${
                      isCurrent
                        ? "bg-indigo-600/15 border-indigo-500/40 text-white"
                        : "bg-slate-900/70 border-slate-800/70 text-slate-300 hover:bg-slate-800/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectTrack(item, tabItems)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span className="w-5 text-[10px] font-mono text-slate-500 shrink-0">
                        {isCurrent && isPlaying ? "▶" : `${idx + 1}.`}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {[item.channelOrAuthor, item.sourceName, item.duration].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {activeTab === "playlist" && (
                        <button
                          type="button"
                          onClick={() => onRemoveFromPlaylist(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="প্লেলিস্ট থেকে সরান"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.originalUrl && (
                        <a
                          href={item.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300"
                          title="মূল উৎস খুলুন"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Compact Player Bar */}
      <div className="px-3 sm:px-5 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Track Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/70 shrink-0 flex items-center justify-center">
              {currentTrack.thumbnailUrl && !imgFailed ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {[currentTrack.channelOrAuthor, currentTrack.sourceName, currentTrack.previewOnly ? "প্রিভিউ" : "পূর্ণ অডিও"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {playbackError && <p className="text-[10px] text-amber-400 truncate">{playbackError}</p>}
            </div>
          </div>

          {/* Core Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              disabled={queue.length <= 1}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="আগের অডিও"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!currentTrack.playableAudioUrl}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 disabled:opacity-40 cursor-pointer"
              title={isPlaying ? "বিরতি (Pause)" : "চালান (Play)"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={queue.length <= 1}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="পরের অডিও"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Volume & Library Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title={isMuted ? "আনমিউট" : "মিউট"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setIsMuted(false);
                  setVolume(Number(e.target.value));
                }}
                aria-label="ভলিউম"
                className="w-16 accent-indigo-500 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => onToggleFavorite(currentTrack)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFavorite ? "text-rose-400 bg-rose-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={isFavorite ? "পছন্দ থেকে সরান" : "পছন্দের তালিকায় যুক্ত করুন"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-400" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => onAddToPlaylist(currentTrack)}
              className={`hidden sm:flex p-2 rounded-xl transition-colors cursor-pointer ${
                inPlaylist ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={inPlaylist ? "প্লেলিস্টে যুক্ত আছে" : "প্লেলিস্টে যুক্ত করুন"}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {canDownload && currentTrack.downloadUrl ? (
              <a
                href={getUniversalSearchDownloadUrl(currentTrack.downloadUrl, currentTrack.title)}
                download
                className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="ওপেন-লাইসেন্স অডিও ডাউনলোড"
              >
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <a
                href={currentTrack.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                title="মূল প্ল্যাটফর্মে শুনুন"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="কিউ, পছন্দ ও প্লেলিস্ট দেখুন"
            >
              {drawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClosePlayer}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              title="অডিও প্লেয়ার বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seek Bar */}
        <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums text-slate-400">
          <span className="w-9 text-right">{formatAudioTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.5}
            value={Math.min(currentTime, duration || 1)}
            onChange={handleSeek}
            disabled={!duration}
            aria-label="অডিও টাইমলাইন"
            className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
          />
          <span className="w-9 flex items-center gap-0.5">
            {duration > 0 ? formatAudioTime(duration) : (
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />--:--</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
