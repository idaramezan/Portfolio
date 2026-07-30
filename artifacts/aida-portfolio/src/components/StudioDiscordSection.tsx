import { useEffect, useRef, useState } from "react";
import { MessageCircle, Palette, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { trackAnalytics } from "@/lib/analytics";
import CuteActionButton from "@/components/ui/CuteActionButton";

const copy = {
  en: { eyebrow: "THE STUDIO AFTER HOURS", title: "The conversation continues on Discord.", body: "Join a friendly space for art conversations, work-in-progress posts, stream reminders and sharing what you are creating. Collectors, artists and curious people are all welcome.", cta: "Join the studio chat", trust: "Free to join · Come and go whenever you like", notes: ["What are you working on?", "Stream starting soon!", "Share your latest piece."] },
  tr: { eyebrow: "ATÖLYE KAPANDIKTAN SONRA", title: "Sohbet Discord’da devam ediyor.", body: "Sanat sohbetleri, yapım aşamasındaki çalışmalar, yayın hatırlatmaları ve kendi ürettiklerini paylaşabileceğin samimi bir alana katıl. Koleksiyonerler, sanatçılar ve merak eden herkes hoş geldin.", cta: "Atölye sohbetine katıl", trust: "Katılım ücretsiz · İstediğin zaman gelip gidebilirsin", notes: ["Ne üzerinde çalışıyorsun?", "Canlı yayın birazdan başlıyor!", "Son çalışmanı paylaş."] },
} as const;

export default function StudioDiscordSection({ discordUrl = "" }: { discordUrl?: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const ref = useRef<HTMLElement>(null);
  const [arrived, setArrived] = useState(false);
  const href = String(discordUrl || "").trim();

  useEffect(() => {
    const section = ref.current;
    if (!section || !href || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setArrived(true);
      trackAnalytics("discord_section_view");
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [href]);

  if (!href) return null;
  return (
    <section ref={ref} className="studio-discord" aria-labelledby="studio-discord-heading" data-arrived={arrived}>
      <div className="section-shell studio-discord__layout">
        <div className="studio-discord__copy">
          <p className="eyebrow">{text.eyebrow}</p>
          <h2 id="studio-discord-heading">{text.title}</h2>
          <p>{text.body}</p>
          <CuteActionButton href={href} target="_blank" rel="noopener noreferrer" aria-label={locale === "tr" ? "Aida’nın Discord topluluğuna katıl" : "Join Aida’s Discord community"} onClick={() => trackAnalytics("discord_join_click", { metadata: { location: "homepage_discord_section" } })}>
            <MessageCircle aria-hidden="true" /> {text.cta}
          </CuteActionButton>
          <p className="studio-discord__trust">{text.trust}</p>
        </div>
        <div className="studio-discord__board" aria-label={locale === "tr" ? "Discord topluluk panosu" : "Discord community noticeboard"}>
          <Sparkles className="studio-discord__spark" aria-hidden="true" />
          {text.notes.map((note, index) => <div key={note} className={`studio-discord__note studio-discord__note--${index + 1}`}><Palette aria-hidden="true" /><span>{note}</span></div>)}
        </div>
      </div>
    </section>
  );
}
