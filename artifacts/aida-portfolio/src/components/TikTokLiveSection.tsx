import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiKick, SiTiktok, SiTwitch } from "react-icons/si";
import { tiktokLiveSection } from "@/config/tiktok-live";
import { useLocale } from "@/lib/locale";
import { trackAnalytics } from "@/lib/analytics";

type Platform = "tiktok" | "twitch" | "kick";
type SocialLinks = { tiktokUrl: string; twitchUrl: string; kickUrl: string };

const copy = {
  en: {
    eyebrow: "LIVE FROM THE STUDIO",
    heading: "Watch me paint live.",
    body: "Join Aida while new pieces come to life, chat during the process and spend some creative time together.",
    note: "Bring a drink and stay for a while.",
    status: "Follow to catch the next live session.",
    watch: "WATCH LIVE",
    platforms: {
      tiktok: ["Watch on TikTok", "Live painting and short studio moments."],
      twitch: ["Watch on Twitch", "Longer painting streams and live chat."],
      kick: ["Watch on Kick", "Relaxed studio streams and conversation."],
    },
    labels: { tiktok: "Watch Aida on TikTok", twitch: "Watch Aida on Twitch", kick: "Watch Aida on Kick" },
  },
  tr: {
    eyebrow: "ATÖLYEDEN CANLI",
    heading: "Resim yaparken beni canlı izle.",
    body: "Yeni çalışmalar ortaya çıkarken Aida’ya eşlik et, süreç boyunca sohbet et ve birlikte yaratıcı zaman geçir.",
    note: "Bir içecek al ve biraz bizimle kal.",
    status: "Bir sonraki canlı yayını kaçırmamak için takip et.",
    watch: "CANLI İZLE",
    platforms: {
      tiktok: ["TikTok’ta izle", "Canlı resim ve kısa atölye anları."],
      twitch: ["Twitch’te izle", "Daha uzun resim yayınları ve canlı sohbet."],
      kick: ["Kick’te izle", "Rahat atölye yayınları ve sohbet."],
    },
    labels: { tiktok: "Aida’yı TikTok’ta izle", twitch: "Aida’yı Twitch’te izle", kick: "Aida’yı Kick’te izle" },
  },
} as const;

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "tiktok") return <SiTiktok aria-hidden="true" />;
  if (platform === "twitch") return <SiTwitch aria-hidden="true" />;
  return <SiKick aria-hidden="true" />;
}

function StreamingPlatformPass({ platform, href, locale }: { platform: Platform; href: string; locale: "en" | "tr" }) {
  const text = copy[locale];
  const [title, description] = text.platforms[platform];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`stream-pass stream-pass--${platform}`}
      aria-label={text.labels[platform]}
      onClick={() => trackAnalytics("stream_platform_click", { metadata: { platform, location: "homepage_stream_section" } })}
    >
      <span className="stream-pass__icon"><PlatformIcon platform={platform} /></span>
      <span className="stream-pass__copy"><small>{text.watch}</small><strong>{title}</strong><span>{description}</span></span>
      <ArrowUpRight className="stream-pass__arrow" aria-hidden="true" />
    </a>
  );
}

export default function StudioStreamsSection({ links }: { links: SocialLinks }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const sectionRef = useRef<HTMLElement>(null);
  const platforms = (["tiktok", "twitch", "kick"] as const).filter((platform) => Boolean(String(links[`${platform}Url`] || "").trim()));

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !platforms.length || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      trackAnalytics("stream_section_view");
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [platforms.length]);

  if (!platforms.length) return null;
  const artworks = [...tiktokLiveSection.artworks].sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 3);
  return (
    <section ref={sectionRef} className="studio-streams" aria-labelledby="studio-streams-heading">
      <div className="section-shell studio-streams__layout">
        <div className="studio-streams__content">
          <p className="eyebrow">{text.eyebrow}</p>
          <h2 id="studio-streams-heading">{text.heading}</h2>
          <p className="studio-streams__body">{text.body}</p>
          <p className="studio-streams__note">{text.note}</p>
          <div className="studio-streams__passes">
            {platforms.map((platform) => <StreamingPlatformPass key={platform} platform={platform} href={links[`${platform}Url`]} locale={locale} />)}
          </div>
          <p className="studio-streams__status">{text.status}</p>
        </div>
        <div className="studio-streams__collage" aria-label={locale === "tr" ? "Canlı yayınlarda yapılan eserler" : "Artwork made during live streams"}>
          {artworks.map((artwork, index) => <figure key={artwork.id} className={`studio-streams__print studio-streams__print--${index + 1}`}><img src={artwork.imageUrl} srcSet={`${artwork.imageUrl} 800w, ${artwork.imageUrlLarge} 1400w`} sizes="(max-width: 767px) 46vw, 24vw" width={artwork.width} height={artwork.height} alt={artwork.alt} loading="lazy" decoding="async" /></figure>)}
          <span className="studio-streams__label">LIVE PAINTING</span>
        </div>
      </div>
    </section>
  );
}
