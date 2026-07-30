import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { useLocale } from "@/lib/locale";

const DEFAULT_YOUTUBE_VIDEO_ID = "gAJYgEfwpQg";

type VideoConfig = {
  videoSource: "uploaded" | "youtube";
  uploadedVideoUrl: string | null;
  youtubeVideoId: string | null;
  posterUrl: string | null;
  youtubeHasEmbeddedBorders: boolean;
};

const defaultVideoConfig: VideoConfig = {
  videoSource: "youtube",
  uploadedVideoUrl: null,
  youtubeVideoId: DEFAULT_YOUTUBE_VIDEO_ID,
  posterUrl: null,
  youtubeHasEmbeddedBorders: true,
};

const copy = {
  en: {
    eyebrow: "From the studio to your home",
    heading: "More than a painting arrives.",
    first:
      "Every original is signed, framed and prepared personally in Aida’s Istanbul studio.",
    second:
      "Along with the artwork, collectors receive a certificate of authenticity, a handmade thank-you card and a small pack of studio stickers. Each part is prepared with care, so opening the package feels like receiving a piece of the studio itself.",
    included: "With every original",
    items: [
      "Signed original artwork",
      "A carefully selected frame",
      "Certificate of authenticity",
      "Handmade thank-you card",
      "Studio sticker pack",
    ],
    reassurance:
      "The exact frame and presentation may vary slightly depending on the artwork and delivery destination.",
    primary: "Explore available originals",
    secondary: "See how collecting works",
    videoTitle: "Aida packing an original artwork order",
  },
  tr: {
    eyebrow: "Atölyeden evine",
    heading: "Sana yalnızca bir resim ulaşmaz.",
    first:
      "Her orijinal eser, Aida’nın İstanbul’daki atölyesinde imzalanır, çerçevelenir ve kişisel olarak hazırlanır.",
    second:
      "Eserle birlikte koleksiyonerlere özgünlük sertifikası, el yapımı bir teşekkür kartı ve küçük bir stüdyo sticker paketi gönderilir. Paketin her parçası özenle hazırlanır, böylece kutuyu açmak atölyeden bir parça almak gibi hissettirir.",
    included: "Her orijinal eserle birlikte",
    items: [
      "İmzalı orijinal eser",
      "Özenle seçilmiş çerçeve",
      "Özgünlük sertifikası",
      "El yapımı teşekkür kartı",
      "Stüdyo sticker paketi",
    ],
    reassurance:
      "Çerçeve ve sunum, esere ve teslimat yerine göre küçük farklılıklar gösterebilir.",
    primary: "Mevcut orijinalleri keşfet",
    secondary: "Koleksiyon süreci nasıl işliyor?",
    videoTitle: "Aida orijinal eser siparişini paketliyor",
  },
} as const;

export default function OriginalCollectorExperience({
  compact = false,
  market = "turkiye",
}: {
  compact?: boolean;
  market?: "turkiye" | "international";
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const visualRef = useRef<HTMLDivElement>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const [playerActivated, setPlayerActivated] = useState(false);
  const [mediaInView, setMediaInView] = useState(false);
  const [videoConfig, setVideoConfig] = useState(defaultVideoConfig);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/collector-experience", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.config) setVideoConfig(payload.config);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMediaInView(entry.isIntersecting);
        if (entry.isIntersecting && !reducedMotion) {
          setPlayerActivated(true);
        }
      },
      { rootMargin: "160px 0px", threshold: 0.1 },
    );
    observer.observe(visual);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = nativeVideoRef.current;
    if (!video) return;
    if (mediaInView) void video.play().catch(() => undefined);
    else video.pause();
  }, [mediaInView, playerActivated, videoConfig.videoSource]);

  const youtubeVideoId =
    videoConfig.youtubeVideoId || DEFAULT_YOUTUBE_VIDEO_ID;
  const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${youtubeVideoId}&rel=0&modestbranding=1&controls=0&disablekb=1`;
  const posterUrl =
    videoConfig.posterUrl ||
    `https://i.ytimg.com/vi/${youtubeVideoId}/hq2.jpg`;

  return (
    <section
      className={`collector-experience ${compact ? "collector-experience--compact" : ""}`}
      aria-labelledby={`collector-experience-heading${compact ? "-compact" : ""}`}
      data-no-translate
    >
      <div className="section-shell collector-experience__layout">
        <div className="collector-experience__content">
          <p className="eyebrow text-coral">{text.eyebrow}</p>
          <h2 id={`collector-experience-heading${compact ? "-compact" : ""}`}>
            {text.heading}
          </h2>
          <p className="collector-experience__lead">{text.first}</p>
          {!compact && (
            <p className="collector-experience__body">{text.second}</p>
          )}
        </div>

        <div ref={visualRef} className="collector-experience__visual">
          <div className="collector-experience__video-frame">
            {playerActivated &&
            videoConfig.videoSource === "uploaded" &&
            videoConfig.uploadedVideoUrl ? (
              <video
                ref={nativeVideoRef}
                src={videoConfig.uploadedVideoUrl}
                poster={posterUrl}
                autoPlay={mediaInView}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={text.videoTitle}
              />
            ) : playerActivated ? (
              <iframe
                src={youtubeEmbedUrl}
                title={text.videoTitle}
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                allowFullScreen
              />
            ) : (
              <img
                src={posterUrl}
                alt=""
                width="480"
                height="854"
                loading="lazy"
              />
            )}
          </div>
        </div>

        <div className="collector-experience__details">
          <h3>{text.included}</h3>
          <ul>
            {text.items.map((item) => (
              <li key={item}>
                <Check size={16} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="collector-experience__note">{text.reassurance}</p>
          <div className="collector-experience__actions">
            <Link href={`/shop/${market}/originals`} className="button-primary">
              {text.primary}
            </Link>
            {!compact && (
              <Link href="/how-to-collect" className="button-link">
                {text.secondary} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
