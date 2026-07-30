import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play } from "lucide-react";
import { Link } from "wouter";
import { useLocale } from "@/lib/locale";
import { homeAboutImage } from "@/lib/assets";

const VIDEO_URL = "/media/d0ac24737dfea34e49d57bf415d027f4.MP4";

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
    play: "Play packaging film",
    pause: "Pause packaging film",
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
    play: "Paketleme filmini oynat",
    pause: "Paketleme filmini duraklat",
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reducedMotion) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };

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

        <div className="collector-experience__visual">
          <div className="collector-experience__video-frame">
            <video
              ref={videoRef}
              muted
              playsInline
              preload="metadata"
              poster={homeAboutImage}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            >
              <source src={VIDEO_URL} type="video/mp4" />
            </video>
            <button
              type="button"
              onClick={togglePlayback}
              className="collector-experience__play"
              aria-label={playing ? text.pause : text.play}
            >
              {playing ? (
                <Pause aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
            </button>
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
