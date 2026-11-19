import React, { useMemo, useState } from "react";
import {
  Play,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Globe,
  ExternalLink,
  Download,
  Heart,
  ListPlus,
  X,
  Info,
  Maximize2,
  BookOpen,
} from "lucide-react";
import {
  UniversalSearchCategory,
  UniversalSearchPayload,
  UniversalSearchResultItem,
} from "../types";
import { getUniversalSearchDownloadUrl } from "../api";
import { YouTubeInternalPlayer, extractYouTubeVideoId } from "./YouTubeInternalPlayer";

interface SearchResultsBlockProps {
  payload: UniversalSearchPayload;
  onPlayAudioTrack: (track: UniversalSearchResultItem, queue: UniversalSearchResultItem[]) => void;
  onToggleFavorite: (track: UniversalSearchResultItem) => void;
  onAddToPlaylist: (track: UniversalSearchResultItem) => void;
  favoriteIds: Set<string>;
  playlistIds: Set<string>;
  activeTrackId?: string;
  isAudioPlaying?: boolean;
  downloadPermissionEnabled?: boolean;
}

const ThumbnailWithFallback: React.FC<{
  src?: string;
  alt: string;
  category: UniversalSearchCategory;
  className?: string;
}> = ({ src, alt, category, className = "w-full h-full object-cover" }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const icon =
      category === "video" ? (
        <Video className="w-6 h-6 text-rose-400" />
      ) : category === "audio" ? (
        <Music className="w-6 h-6 text-indigo-400" />
      ) : category === "image" ? (
        <ImageIcon className="w-6 h-6 text-cyan-400" />
      ) : category === "document" ? (
        <FileText className="w-6 h-6 text-amber-400" />
      ) : (
        <Globe className="w-6 h-6 text-emerald-400" />
      );

    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
        {icon}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const SearchResultsBlock: React.FC<SearchResultsBlockProps> = ({
  payload,
  onPlayAudioTrack,
  onToggleFavorite,
  onAddToPlaylist,
  favoriteIds,
  playlistIds,
  activeTrackId,
  isAudioPlaying,
  downloadPermissionEnabled = true,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [userTriggeredPlay, setUserTriggeredPlay] = useState<boolean>(false);
  const [activeVideo, setActiveVideo] = useState<UniversalSearchResultItem | null>(() => {
    const firstPlayable = payload.results.find(
      (r) => r.category === "video" && (r.youtubeVideoId || r.embedUrl || r.playableVideoUrl)
    );
    return firstPlayable || null;
  });
  const [lightboxImage, setLightboxImage] = useState<UniversalSearchResultItem | null>(null);
  const [previewDocument, setPreviewDocument] = useState<UniversalSearchResultItem | null>(null);

  const distinctCategories = useMemo(() => {
    const set = new Set<UniversalSearchCategory>();
    for (const r of payload.results) {
      set.add(r.category);
    }
    return Array.from(set);
  }, [payload.results]);

  const visibleResults = useMemo(() => {
    if (filterCategory === "all") return payload.results;
    return payload.results.filter((r) => r.category === filterCategory);
  }, [payload.results, filterCategory]);

  const audioQueue = useMemo(
    () => payload.results.filter((r) => r.category === "audio" && r.playableAudioUrl),
    [payload.results]
  );

  const videoResults = visibleResults.filter((r) => r.category === "video");
  const audioResults = visibleResults.filter((r) => r.category === "audio");
  const imageResults = visibleResults.filter((r) => r.category === "image");
  const docResults = visibleResults.filter((r) => r.category === "document");
  const webResults = visibleResults.filter(
    (r) => r.category === "web" || r.category === "news" || r.category === "website"
  );

  const categoryLabels: Record<UniversalSearchCategory, string> = {
    web: "ওয়েব",
    news: "সংবাদ",
    video: "ভিডিও",
    audio: "অডিও",
    image: "ছবি",
    document: "ডকুমেন্ট / PDF",
    website: "ওয়েবসাইট",
  };

  if (payload.results.length === 0 && !payload.notice && payload.sourcesUsed.length === 0) {
    return null;
  }

  const canDownloadItem = (item: UniversalSearchResultItem) =>
    downloadPermissionEnabled && item.downloadAllowed && Boolean(item.downloadUrl);

  return (
    <div className="mt-3 w-full space-y-3">
      {/* Unboxed Sources & Latency Line */}
      {payload.sourcesUsed.length > 0 && (
        <div className="text-[11px] text-slate-400 px-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-cyan-400">যাচাইকৃত উৎস:</span>
          <span>{payload.sourcesUsed.join(" · ")}</span>
          {typeof payload.latencyMs === "number" && (
            <span className="text-slate-500">· {(payload.latencyMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}

      {/* Optional License / Restriction Notice */}
      {payload.notice && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{payload.notice}</span>
        </div>
      )}

      {/* Category Filter Buttons (Only when multiple categories exist) */}
      {distinctCategories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              filterCategory === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
            }`}
          >
            সব ({payload.results.length})
          </button>
          {distinctCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                filterCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      )}

      {/* 1. INLINE EMBEDDED VIDEO PLAYER (Official YouTube IFrame Player API + Dailymotion/Open Video) */}
      {activeVideo && (videoResults.length > 0 || activeVideo.category === "video") && (
        <div className="space-y-2.5">
          {extractYouTubeVideoId(activeVideo) ? (
            <YouTubeInternalPlayer
              video={activeVideo}
              videoQueue={videoResults}
              onSelectVideo={(vid) => {
                setUserTriggeredPlay(true);
                setActiveVideo(vid);
              }}
              autoPlay={Boolean(payload.autoPlayFirst) || userTriggeredPlay}
            />
          ) : (
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
              <div className="relative aspect-video w-full bg-black">
                {activeVideo.embedUrl ? (
                  <iframe
                    src={activeVideo.embedUrl}
                    title={activeVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : activeVideo.playableVideoUrl ? (
                  <video
                    src={activeVideo.playableVideoUrl}
                    poster={activeVideo.thumbnailUrl}
                    controls
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center gap-2">
                    <Video className="w-8 h-8 text-slate-500" />
                    <p className="text-xs text-slate-300">এই ভিডিওটি এম্বেড প্লেয়ারে চালানো যায়নি।</p>
                    <a
                      href={activeVideo.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> মূল প্ল্যাটফর্মে দেখুন
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white leading-snug">{activeVideo.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {[activeVideo.channelOrAuthor, activeVideo.sourceName, activeVideo.duration, activeVideo.publishedAt]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canDownloadItem(activeVideo) && activeVideo.downloadUrl ? (
                    <a
                      href={getUniversalSearchDownloadUrl(activeVideo.downloadUrl, activeVideo.title)}
                      download
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> ডাউনলোড
                    </a>
                  ) : null}
                  <a
                    href={activeVideo.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> মূল লিংক
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Related Videos Strip */}
          {(() => {
            const relatedList =
              activeVideo.relatedVideos && activeVideo.relatedVideos.length > 0
                ? activeVideo.relatedVideos
                : videoResults.filter((v) => v.id !== activeVideo.id).slice(0, 4);
            if (relatedList.length === 0) return null;
            return (
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800/80 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-300">সম্পর্কিত ভিডিও (Related Videos):</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {relatedList.map((rel) => (
                    <button
                      key={`rel_${rel.id}`}
                      type="button"
                      onClick={() => {
                        setUserTriggeredPlay(true);
                        setActiveVideo(rel);
                      }}
                      className="w-44 shrink-0 text-left rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 transition-colors cursor-pointer"
                    >
                      <div className="aspect-video w-full rounded-lg overflow-hidden mb-1.5 bg-slate-950">
                        <ThumbnailWithFallback src={rel.thumbnailUrl} alt={rel.title} category="video" />
                      </div>
                      <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{rel.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {[rel.channelOrAuthor, rel.duration].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. VIDEO RESULTS LIST */}
      {videoResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {videoResults.map((vid) => {
            const isSelected = activeVideo?.id === vid.id;
            const playable = Boolean(vid.embedUrl || vid.playableVideoUrl);
            return (
              <div
                key={vid.id}
                className={`rounded-2xl border p-2.5 flex gap-3 transition-colors ${
                  isSelected
                    ? "bg-indigo-950/30 border-indigo-500/50"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setUserTriggeredPlay(true);
                    setActiveVideo(vid);
                  }}
                  className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 group cursor-pointer"
                >
                  <ThumbnailWithFallback src={vid.thumbnailUrl} alt={vid.title} category="video" />
                  <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow">
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </div>
                </button>

                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white line-clamp-2 leading-snug">{vid.title}</h5>
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {[vid.channelOrAuthor, vid.sourceName, vid.duration].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {playable && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserTriggeredPlay(true);
                          setActiveVideo(vid);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" /> {isSelected ? "চলছে" : "চালান"}
                      </button>
                    )}

                    {canDownloadItem(vid) && vid.downloadUrl ? (
                      <a
                        href={getUniversalSearchDownloadUrl(vid.downloadUrl, vid.title)}
                        download
                        className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> ডাউনলোড
                      </a>
                    ) : null}

                    <a
                      href={vid.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> উৎস
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. AUDIO & MUSIC RESULTS */}
      {audioResults.length > 0 && (
        <div className="space-y-2">
          {audioResults.map((track) => {
            const isActive = activeTrackId === track.id;
            const isFav = favoriteIds.has(track.id);
            const inList = playlistIds.has(track.id);
            const canPlayInApp = Boolean(track.playableAudioUrl);

            return (
              <div
                key={track.id}
                className={`rounded-2xl border p-3 flex items-center gap-3 transition-colors ${
                  isActive
                    ? "bg-indigo-950/35 border-indigo-500/50"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                  <ThumbnailWithFallback src={track.thumbnailUrl} alt={track.title} category="audio" />
                </div>

                <div className="min-w-0 flex-1">
                  <h5 className="text-xs sm:text-sm font-bold text-white truncate">{track.title}</h5>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {[
                      track.channelOrAuthor,
                      track.sourceName,
                      track.duration,
                      track.previewOnly ? "প্রিভিউ" : "ওপেন-লাইসেন্স",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {track.description && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{track.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {canPlayInApp && (
                      <button
                        type="button"
                        onClick={() => onPlayAudioTrack(track, audioQueue.length ? audioQueue : [track])}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        {isActive && isAudioPlaying ? "চলছে" : "শুনুন"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(track)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 border cursor-pointer ${
                        isFav
                          ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
                      }`}
                      title="পছন্দের তালিকা"
                    >
                      <Heart className={`w-3 h-3 ${isFav ? "fill-rose-400 text-rose-400" : ""}`} />
                      <span>{isFav ? "পছন্দকৃত" : "পছন্দ"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddToPlaylist(track)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 border cursor-pointer ${
                        inList
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      <ListPlus className="w-3 h-3" />
                      <span>{inList ? "প্লেলিস্টে আছে" : "+ প্লেলিস্ট"}</span>
                    </button>

                    {canDownloadItem(track) && track.downloadUrl ? (
                      <a
                        href={getUniversalSearchDownloadUrl(track.downloadUrl, track.title)}
                        download
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> ডাউনলোড
                      </a>
                    ) : (
                      <a
                        href={track.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> মূল লিংক
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. IMAGE SEARCH GRID */}
      {imageResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {imageResults.map((img) => (
            <div
              key={img.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col"
            >
              <button
                type="button"
                onClick={() => setLightboxImage(img)}
                className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden group cursor-pointer"
              >
                <ThumbnailWithFallback src={img.thumbnailUrl} alt={img.title} category="image" />
                <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </button>
              <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-white line-clamp-2 leading-snug">{img.title}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {[img.sourceName, img.licenseInfo].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-1 pt-1">
                  <a
                    href={img.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> মূল উৎস
                  </a>
                  {canDownloadItem(img) && img.downloadUrl && (
                    <a
                      href={getUniversalSearchDownloadUrl(img.downloadUrl, img.title)}
                      download
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> ডাউনলোড
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. DOCUMENT & PDF RESULTS */}
      {docResults.length > 0 && (
        <div className="space-y-2">
          {docResults.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold text-white leading-snug">{doc.title}</h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {[doc.channelOrAuthor, doc.sourceName, doc.publishedAt, doc.fileType]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
              </div>

              {doc.description && (
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{doc.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewDocument(doc)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" /> পড়ুন / প্রিভিউ
                </button>

                <a
                  href={doc.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> মূল ওয়েবসাইট
                </a>

                {canDownloadItem(doc) && doc.downloadUrl && (
                  <a
                    href={getUniversalSearchDownloadUrl(doc.downloadUrl, doc.title)}
                    download
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF ডাউনলোড
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. WEB / NEWS / WEBSITE RESULTS */}
      {webResults.length > 0 && (
        <div className="space-y-2">
          {webResults.map((item) => (
            <a
              key={item.id}
              href={item.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-3 transition-colors group"
            >
              <div className="flex items-start gap-3">
                {item.thumbnailUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                    <ThumbnailWithFallback
                      src={item.thumbnailUrl}
                      alt={item.title}
                      category={item.category}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-cyan-400 truncate">
                      {[item.sourceName, item.publishedAt].filter(Boolean).join(" · ")}
                    </p>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                  </div>
                  <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 mt-0.5">
                    {item.title}
                  </h5>
                  {item.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL FOR IMAGES */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{lightboxImage.title}</h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {[lightboxImage.channelOrAuthor, lightboxImage.sourceName, lightboxImage.licenseInfo]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center max-h-[65vh] overflow-hidden p-3">
              <img
                src={lightboxImage.downloadUrl || lightboxImage.thumbnailUrl}
                alt={lightboxImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                {lightboxImage.licenseInfo || "মূল উৎসের লাইসেন্স প্রযোজ্য"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> মূল উৎস খুলুন
                </a>
                {canDownloadItem(lightboxImage) && lightboxImage.downloadUrl && (
                  <a
                    href={getUniversalSearchDownloadUrl(lightboxImage.downloadUrl, lightboxImage.title)}
                    download
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> ডাউনলোড
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DOCUMENT / PDF VIEWER MODAL */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-4xl h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{previewDocument.title}</h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {[previewDocument.channelOrAuthor, previewDocument.sourceName, previewDocument.fileType]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canDownloadItem(previewDocument) && previewDocument.downloadUrl && (
                  <a
                    href={getUniversalSearchDownloadUrl(previewDocument.downloadUrl, previewDocument.title)}
                    download
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> ডাউনলোড
                  </a>
                )}
                <a
                  href={previewDocument.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> নতুন ট্যাবে খুলুন
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 relative">
              <iframe
                src={previewDocument.embedUrl || previewDocument.downloadUrl || previewDocument.originalUrl}
                title={previewDocument.title}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
