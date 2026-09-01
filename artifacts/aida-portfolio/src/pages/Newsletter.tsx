import { useEffect, useState } from "react";
import { CircleCheck, X } from "lucide-react";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "FREE LETTERS FROM AIDA’S STUDIO",
    heading: "A quiet letter from my studio, sent from time to time.",
    intro: [
      "The Newsletter is my free personal journal, where I share the parts of my art that do not always fit on social media.",
      "I write about the memories behind my paintings, the moments that inspired them, the colours and feelings I was trying to hold onto, and the small pieces of life that slowly became part of the work.",
      "Subscribers also receive first looks at artworks and studio moments I do not share anywhere else, along with early notice when something new is coming from the studio.",
    ],
    signupHeading: "Join the Newsletter",
    signupText:
      "Start with the current featured story, then receive new letters whenever there is something meaningful to share.",
    reassurance:
      "Completely free · No fixed schedule · Unsubscribe whenever you like",
    consent:
      "By subscribing, you agree to receive the Newsletter and occasional studio updates from Aida. You can unsubscribe at any time.",
    success: "The Newsletter is on its way to your inbox.",
    journalEyebrow: "A PERSONAL STUDIO JOURNAL",
    journalHeading:
      "The parts of a painting that cannot be seen at first glance.",
    journalBody:
      "A painting may begin with a passing reflection, a childhood memory, a colour noticed on an ordinary walk, or a feeling that stays long after the moment has gone. The Newsletter is where I can slow down and tell you that part of the story.",
    includes: [
      "Memories and stories behind the paintings",
      "Personal reflections and quiet notes from the studio",
      "Artworks and studio moments not shared anywhere else",
      "Early notice of originals, prints, gatherings and special releases",
    ],
    sampleEyebrow: "BEGIN WITH THE CURRENT LETTER",
    sampleHeading: "A story from the studio, waiting for you.",
  },
  tr: {
    eyebrow: "AIDA’NIN ATÖLYESİNDEN ÜCRETSİZ MEKTUPLAR",
    heading: "Atölyemden, ara sıra gelen sessiz bir mektup.",
    intro: [
      "Bülten, sanatımın sosyal medyaya her zaman sığmayan taraflarını paylaştığım ücretsiz kişisel günlüğüm.",
      "Resimlerimin ardındaki anıları, onlara ilham veren anları, korumaya çalıştığım renkleri ve duyguları, ayrıca hayatımdaki küçük bir anın zamanla nasıl bir esere dönüştüğünü yazıyorum.",
      "Aboneler ayrıca başka hiçbir yerde paylaşmadığım eserleri ve atölye anlarını ilk görenlerden olur; stüdyodan yeni bir şey geldiğinde de önceden haber alır.",
    ],
    signupHeading: "Bültene katıl",
    signupText:
      "Güncel hikâyeyle başla, ardından paylaşmaya değer yeni bir şey olduğunda mektuplarını al.",
    reassurance:
      "Tamamen ücretsiz · Sabit bir gönderim takvimi yok · İstediğin zaman ayrılabilirsin",
    consent:
      "Abone olarak Aida’dan Bülten ve ara sıra atölye güncellemeleri almayı kabul edersin. İstediğin zaman abonelikten ayrılabilirsin.",
    success: "Bülten e-posta kutuna doğru yola çıktı.",
    journalEyebrow: "KİŞİSEL BİR ATÖLYE GÜNLÜĞÜ",
    journalHeading: "Bir resmin ilk bakışta görünmeyen tarafları.",
    journalBody:
      "Bir resim bazen kısa bir yansımayla, çocukluk anısıyla, sıradan bir yürüyüşte fark edilen renkle veya an bittikten sonra kalan bir hisle başlar. Bülten, yavaşlayıp hikâyenin bu tarafını anlatabildiğim yer.",
    includes: [
      "Resimlerin ardındaki anılar ve hikâyeler",
      "Kişisel düşünceler ve atölyeden sessiz notlar",
      "Başka hiçbir yerde paylaşılmayan eserler ve atölye anları",
      "Orijinaller, baskılar, buluşmalar ve özel edisyonlar için erken haber",
    ],
    sampleEyebrow: "GÜNCEL MEKTUPLA BAŞLA",
    sampleHeading: "Atölyeden bir hikâye seni bekliyor.",
  },
} as const;

export default function Newsletter() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [toast, setToast] = useState(false);
  usePageMeta(
    locale === "tr" ? "Bülten | Aida Ramezani" : "Newsletter | Aida Ramezani",
    locale === "tr"
      ? "Aida Ramezani’nin resimlerin ardındaki hikâyeleri ve atölye notlarını paylaştığı ücretsiz Bültene katıl."
      : "Join Aida Ramezani’s free Newsletter for stories behind the paintings, studio notes and first looks at new work.",
  );
  useEffect(() => {
    const success = () => setToast(true);
    window.addEventListener("studio-letter:subscribed", success);
    return () =>
      window.removeEventListener("studio-letter:subscribed", success);
  }, []);
  useEffect(() => {
    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    const created = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/newsletter`;
    return () => {
      if (created) canonical?.remove();
    };
  }, []);

  return (
    <div data-no-translate>
      {toast && (
        <div
          className="fixed right-4 top-24 z-[80] flex max-w-sm items-start gap-3 border border-ink/15 bg-paper p-4 text-sm shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <CircleCheck className="mt-0.5 shrink-0 text-coral" size={20} />
          <p>{text.success}</p>
          <button
            type="button"
            onClick={() => setToast(false)}
            className="-mr-1 -mt-1 grid min-h-11 min-w-11 place-items-center"
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <section className="border-b border-ink/10 bg-[#f6f0e4]">
        <div className="section-shell grid min-h-[610px] items-center gap-10 !py-10 md:!py-16 lg:grid-cols-[1.35fr_1fr] lg:gap-16 lg:!py-20">
          <article>
            <p className="eyebrow text-coral">{text.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl leading-[1.06] md:text-6xl lg:text-7xl">
              {text.heading}
            </h1>
            <div className="mt-7 max-w-3xl space-y-4 text-[15px] leading-7 text-ink/70 md:text-base">
              {text.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
          <aside className="border border-ink/15 bg-[#fffaf0] p-6 shadow-[0_10px_28px_rgba(49,38,26,.08)] md:p-8">
            <div className="h-0.5 w-14 bg-coral" />
            <h2 className="mt-5 text-3xl">{text.signupHeading}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              {text.signupText}
            </p>
            <div className="mt-6">
              <StudioLetterSignup
                variant="hero"
                context="studio-letter"
                trustText={{ en: copy.en.reassurance, tr: copy.tr.reassurance }}
              />
            </div>
            <p className="mt-4 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/50">
              {text.consent}
            </p>
          </aside>
        </div>
      </section>

      <section className="section-shell grid gap-10 md:grid-cols-[.85fr_1.15fr] md:items-start">
        <div>
          <p className="eyebrow text-coral">{text.journalEyebrow}</p>
          <h2 className="mt-4 text-4xl md:text-5xl">{text.journalHeading}</h2>
        </div>
        <div>
          <p className="text-lg leading-8 text-ink/70">{text.journalBody}</p>
          <ul className="mt-7 divide-y divide-ink/10 border-y border-ink/10">
            {text.includes.map((item, index) => (
              <li key={item} className="flex gap-4 py-4 text-sm font-semibold">
                <span className="font-serif text-coral">0{index + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="border-t border-ink/10 bg-[#efe4d2]/45 pt-8 md:pt-12">
        <div className="section-shell !pb-0 !pt-0">
          <p className="eyebrow text-coral">{text.sampleEyebrow}</p>
          <h2 className="mt-3 text-4xl md:text-5xl">{text.sampleHeading}</h2>
        </div>
        <StudioLetterSignup variant="story-preview" context="newsletter" />
      </div>
    </div>
  );
}
