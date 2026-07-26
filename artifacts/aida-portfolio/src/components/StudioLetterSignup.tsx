import { useEffect, useId, useRef, useState } from "react";
import { CircleCheck, X } from "lucide-react";
import { useLocale, type SiteLocale } from "@/lib/locale";
import {
  isValidNewsletterEmail,
  NEWSLETTER_SOURCE,
  normalizeNewsletterEmail,
  type StudioLetterContext,
} from "@/lib/newsletter";
import { analyticsContext, trackAnalytics } from "@/lib/analytics";

export type StudioLetterVariant = "story-preview" | "compact" | "footer";

export const studioLetterCopy = {
  en: {
    emailLabel: "Email address",
    emailPlaceholder: "Your email address",
    footerSubmit: "Join free",
    compactSubmit: "Join the Studio Letter — Free",
    storySubmit: "Read the rest in the Studio Letter",
    loading: "Joining…",
    successTitle: "You’re on the Studio Letter list.",
    successBody:
      "The next note from Aida’s studio will find its way to your inbox.",
    storySuccessTitle: "Your next studio story is on its way.",
    storySuccessBody:
      "You’re now part of the Studio Letter. The featured letter is arriving in your inbox now.",
    duplicate:
      "You’re already on the list. The next studio note will reach you.",
    invalid: "Enter a valid email address.",
    error: "We couldn’t add you just now. Please try again.",
    trust:
      "Free to join. Occasional letters only. Unsubscribe whenever you like.",
    storyTrust:
      "Free to join. Occasional letters only. Unsubscribe whenever you like.",
    footerHeading: "Studio Letter",
    footerSubheading: "Stories, new artwork and limited studio releases.",
    continue: "Continue reading the full story in the free Studio Letter.",
    transition:
      "Stories behind the paintings, studio notes, new originals and early notice of limited releases, sent occasionally and always free.",
    closeImage: "Close image viewer",
  },
  tr: {
    emailLabel: "E-posta adresi",
    emailPlaceholder: "E-posta adresin",
    footerSubmit: "Ücretsiz katıl",
    compactSubmit: "Stüdyo Mektubu’na ücretsiz katıl",
    storySubmit: "Hikâyenin devamını Stüdyo Mektubu’nda oku",
    loading: "Katılım tamamlanıyor…",
    successTitle: "Stüdyo Mektubu listesine katıldın.",
    successBody:
      "Aida’nın atölyesinden gelecek bir sonraki not e-posta kutuna ulaşacak.",
    storySuccessTitle: "Bir sonraki atölye hikâyesi sana doğru yola çıktı.",
    storySuccessBody:
      "Artık Stüdyo Mektubu’ndasın. Öne çıkan mektup şimdi e-posta kutuna geliyor.",
    duplicate:
      "Zaten listedesin. Atölyeden gelecek bir sonraki not sana da ulaşacak.",
    invalid: "Geçerli bir e-posta adresi gir.",
    error: "Şu anda kaydını tamamlayamadık. Lütfen tekrar dene.",
    trust:
      "Katılım tamamen ücretsizdir. Yalnızca ara sıra e-posta gönderilir. Dilediğin zaman abonelikten ayrılabilirsin.",
    storyTrust:
      "Katılım ücretsizdir. Yalnızca ara sıra gönderilir. Dilediğin zaman abonelikten ayrılabilirsin.",
    footerHeading: "Stüdyo Mektubu",
    footerSubheading: "Hikâyeler, yeni eserler ve sınırlı atölye edisyonları.",
    continue: "Hikâyenin tamamını ücretsiz Stüdyo Mektubu’nda oku.",
    transition:
      "Resimlerin ardındaki hikâyeler, atölye notları, yeni orijinaller ve sınırlı edisyonlara dair erken haberler, ara sıra ve her zaman ücretsiz.",
    closeImage: "Görsel görüntüleyiciyi kapat",
  },
} as const;

type PreviewImage = {
  src: string;
  alt: string;
  caption: string;
  trigger: HTMLButtonElement;
};
type FeaturedLetter = {
  id: string;
  eyebrow: string;
  title: string;
  metadata: string;
  excerpt: string;
  hasMore: boolean;
  images: Array<{ id: string; url: string; alt: string; caption: string }>;
};

function ImageLightbox({
  image,
  onClose,
  closeLabel,
}: {
  image: PreviewImage;
  onClose: () => void;
  closeLabel: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
      document.body.style.overflow = previousOverflow;
      image.trigger.focus();
    };
  }, [image.trigger, onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.caption}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 md:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-full max-w-6xl flex-col items-center">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center border border-paper/30 bg-ink text-paper focus-visible:ring-2 focus-visible:ring-coral"
          aria-label={closeLabel}
        >
          <X aria-hidden="true" />
        </button>
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[82vh] max-w-full object-contain"
        />
        <p className="mt-3 bg-paper px-4 py-2 font-hand text-lg text-ink">
          {image.caption}
        </p>
      </div>
    </div>
  );
}

export default function StudioLetterSignup({
  variant,
  context,
  submitLabel,
  trustText,
  dark = false,
}: {
  variant: StudioLetterVariant;
  context: StudioLetterContext;
  submitLabel?: Partial<Record<SiteLocale, string>>;
  trustText?: Partial<Record<SiteLocale, string>>;
  dark?: boolean;
}) {
  const { locale } = useLocale();
  const copy = studioLetterCopy[locale];
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "duplicate" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<PreviewImage | null>(null);
  const [featured, setFeatured] = useState<FeaturedLetter | null>(null);
  const submitting = useRef(false);
  const story = variant === "story-preview";

  useEffect(() => {
    trackAnalytics("newsletter_section_viewed", {
      metadata: { form: context },
    });
  }, [context]);
  useEffect(() => {
    if (!story) return;
    fetch(
      `/api/newsletter/featured-letter?context=${encodeURIComponent(context)}`,
      { cache: "no-store" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then(setFeatured)
      .catch(() => setFeatured(null));
  }, [context, story]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    trackAnalytics("newsletter_form_started", { metadata: { form: context } });
    const normalized = normalizeNewsletterEmail(email);
    if (!isValidNewsletterEmail(normalized)) {
      setStatus("error");
      setError(copy.invalid);
      return;
    }
    submitting.current = true;
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          locale,
          source: NEWSLETTER_SOURCE[context],
          subscribedAt: new Date().toISOString(),
          ...analyticsContext(),
          ...(story && featured
            ? { featuredLetterRevisionId: featured.id }
            : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || copy.error);
      setEmail(normalized);
      setStatus(
        result.featuredLetterSent
          ? "success"
          : result.alreadySubscribed
            ? "duplicate"
            : "success",
      );
      trackAnalytics("newsletter_signup_success", {
        metadata: { form: context, newSubscriber: !result.alreadySubscribed },
      });
    } catch {
      setStatus("error");
      setError(copy.error);
      trackAnalytics("newsletter_signup_failed", {
        metadata: { form: context },
      });
    } finally {
      submitting.current = false;
    }
  };

  const form =
    status === "success" || status === "duplicate" ? (
      <div
        className={
          variant === "footer"
            ? "footer-newsletter-success"
            : "border-l-2 border-coral pl-5"
        }
        role="status"
        aria-live="polite"
      >
        {story && status === "success" && (
          <CircleCheck
            size={22}
            className="mb-3 text-coral"
            aria-hidden="true"
          />
        )}
        <p
          className={
            variant === "footer"
              ? "font-serif text-2xl text-paper"
              : "font-serif text-2xl"
          }
        >
          {status === "duplicate"
            ? copy.duplicate
            : story
              ? copy.storySuccessTitle
              : copy.successTitle}
        </p>
        {status === "success" && (
          <p
            className={`mt-2 text-sm ${dark || variant === "footer" ? "text-paper/65" : "text-ink/60"}`}
          >
            {story ? copy.storySuccessBody : copy.successBody}
          </p>
        )}
      </div>
    ) : (
      <form
        onSubmit={submit}
        noValidate
        className={variant === "footer" ? "footer-newsletter-form" : "w-full"}
      >
        <label
          htmlFor={inputId}
          className={
            variant === "footer"
              ? "sr-only"
              : `mb-2 block text-sm font-semibold ${dark ? "text-paper" : "text-ink"}`
          }
        >
          {copy.emailLabel}
        </label>
        <div
          className={
            variant === "footer"
              ? "footer-newsletter-controls"
              : story
                ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          }
        >
          <input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status === "error") {
                setStatus("idle");
                setError("");
              }
            }}
            placeholder={copy.emailPlaceholder}
            aria-invalid={status === "error" ? "true" : undefined}
            aria-describedby={status === "error" ? errorId : undefined}
            disabled={status === "loading"}
            className={
              variant === "footer"
                ? "footer-newsletter-input"
                : `min-h-12 min-w-0 border px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral ${dark ? "border-paper/30 bg-paper text-ink" : "border-ink/20 bg-paper"}`
            }
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={
              variant === "footer"
                ? "footer-newsletter-button"
                : "button-primary min-h-12 justify-center disabled:cursor-wait disabled:opacity-70"
            }
          >
            {status === "loading"
              ? copy.loading
              : submitLabel?.[locale] ||
                (variant === "footer"
                  ? copy.footerSubmit
                  : story
                    ? copy.storySubmit
                    : copy.compactSubmit)}
          </button>
        </div>
        <div aria-live="polite">
          {status === "error" && (
            <p
              id={errorId}
              role="alert"
              className={`mt-2 text-sm font-semibold ${dark || variant === "footer" ? "text-[#ff9b88]" : "text-[#c94f3d]"}`}
            >
              {error}
            </p>
          )}
        </div>
        <p
          className={`mt-3 text-xs leading-relaxed ${dark || variant === "footer" ? "text-paper/55" : "text-ink/50"}`}
        >
          {trustText?.[locale] || (story ? copy.storyTrust : copy.trust)}
        </p>
      </form>
    );

  if (!story) return <div data-no-translate>{form}</div>;
  if (!featured) return null;

  const openImage = (
    event: React.MouseEvent<HTMLButtonElement>,
    src: string,
    alt: string,
    caption: string,
  ) => setLightbox({ src, alt, caption, trigger: event.currentTarget });

  return (
    <section
      id="studio-letter"
      className="section-shell scroll-mt-24 !py-12 md:!py-16 lg:!py-20"
      aria-labelledby={`${inputId}-heading`}
      data-studio-letter={context}
      data-no-translate
    >
      <div className="grid items-center gap-10 md:grid-cols-[.44fr_.56fr] md:gap-10 lg:gap-14">
        <div
          className="relative mx-auto h-[430px] w-full max-w-[520px] sm:h-[500px] md:h-[540px] lg:h-[570px]"
          aria-label="Images from the featured Studio Letter"
        >
          {featured.images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={(event) =>
                openImage(
                  event,
                  image.url,
                  image.alt,
                  image.caption || featured.title,
                )
              }
              className={
                index === 0
                  ? "group absolute inset-x-[4%] bottom-0 top-[5%] border-[9px] border-b-[38px] border-[#fffdf8] bg-[#fffdf8] text-left shadow-[0_12px_28px_rgba(45,37,28,.17)] transition duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-coral sm:border-[11px] sm:border-b-[42px]"
                  : "group absolute left-0 top-0 z-10 w-[40%] -rotate-[4deg] border-[8px] border-b-[32px] border-[#fffdf8] bg-[#fffdf8] text-left shadow-[0_8px_20px_rgba(45,37,28,.18)] transition duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-coral"
              }
              aria-label={`Open ${image.alt}`}
            >
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className={
                  index === 0
                    ? "block h-full w-full object-cover"
                    : "block aspect-square w-full object-cover"
                }
              />
              <span className="absolute inset-x-3 bottom-3 font-hand text-base text-ink/65 transition-colors duration-300 group-hover:text-ink group-focus-visible:text-ink">
                {image.caption || featured.title}
              </span>
            </button>
          ))}
        </div>

        <article className="border border-ink/15 bg-[#fffaf0] p-5 shadow-[0_8px_22px_rgba(49,38,26,.07)] sm:p-7 lg:p-8">
          <div className="h-0.5 w-14 bg-coral" aria-hidden="true" />
          <p className="eyebrow mt-4 text-coral">{featured.eyebrow}</p>
          <p className="mt-2 text-[11px] font-semibold tracking-[.08em] text-ink/45">
            {featured.metadata}
          </p>
          <h2
            id={`${inputId}-heading`}
            className="mt-4 text-3xl leading-tight lg:text-4xl"
          >
            {featured.title}
          </h2>
          <div className="mt-4 space-y-3 text-[15px] leading-6 text-ink/75">
            {featured.excerpt.split(/\n\n+/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div
            className="pointer-events-none relative mt-1 max-h-[68px] select-none overflow-hidden bg-[#f4ead8]/65 px-1 py-1 [mask-image:linear-gradient(to_bottom,black_15%,rgba(0,0,0,.72)_55%,transparent_100%)]"
            aria-hidden="true"
          >
            <p className="text-sm leading-6 text-ink/70 blur-[6px]">
              Continue reading this Studio Letter after joining. The complete
              story is delivered privately to your inbox.
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold text-coral">
            {copy.continue}
          </p>
          <div className="mt-4 border-t border-ink/15 pt-4">
            <p className="mb-4 text-sm leading-5 text-ink/65">
              {copy.transition}
            </p>
            {form}
          </div>
        </article>
      </div>
      {lightbox && (
        <ImageLightbox
          image={lightbox}
          onClose={() => setLightbox(null)}
          closeLabel={copy.closeImage}
        />
      )}
    </section>
  );
}
