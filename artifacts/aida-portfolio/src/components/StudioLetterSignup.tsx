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

export type StudioLetterVariant =
  "story-preview" | "compact" | "footer" | "hero";

export const studioLetterCopy = {
  en: {
    emailLabel: "Email address",
    emailPlaceholder: "Your email address",
    footerSubmit: "Join free",
    compactSubmit: "Join the Studio Letter — Free",
    storySubmit: "Send me the full story",
    heroSubmit: "Send me the Studio Letter",
    loading: "Joining…",
    successTitle: "You’re on the Studio Letter list.",
    successBody:
      "The next note from Aida’s studio will find its way to your inbox.",
    storySuccessTitle: "The full story is on its way.",
    storySuccessBody:
      "Check your inbox, and your Spam or Junk folder in case it landed there.",
    duplicate:
      "You’re already on the list. The next studio note will reach you.",
    invalid: "Enter a valid email address.",
    error: "We couldn’t add you just now. Please try again.",
    storyError: "We couldn’t send the story. Please try again.",
    trust:
      "Free to join. Occasional letters only. Unsubscribe whenever you like.",
    storyTrust: "Free to join · Occasional letters · Unsubscribe anytime",
    footerHeading: "Studio Letter",
    footerSubheading: "Stories, new artwork and limited studio releases.",
    continue: "The rest of this story can arrive in your inbox.",
    transition:
      "Free personal stories, studio notes and first looks at new work.",
    closeImage: "Close image viewer",
  },
  tr: {
    emailLabel: "E-posta adresi",
    emailPlaceholder: "E-posta adresin",
    footerSubmit: "Ücretsiz katıl",
    compactSubmit: "Stüdyo Mektubu’na ücretsiz katıl",
    storySubmit: "Hikâyenin tamamını gönder",
    heroSubmit: "Stüdyo Mektubu’nu bana gönder",
    loading: "Katılım tamamlanıyor…",
    successTitle: "Stüdyo Mektubu listesine katıldın.",
    successBody:
      "Aida’nın atölyesinden gelecek bir sonraki not e-posta kutuna ulaşacak.",
    storySuccessTitle: "Hikâyenin tamamı yolda.",
    storySuccessBody:
      "Gelen kutunu ve Spam veya Gereksiz klasörünü kontrol et.",
    duplicate:
      "Zaten listedesin. Atölyeden gelecek bir sonraki not sana da ulaşacak.",
    invalid: "Geçerli bir e-posta adresi gir.",
    error: "Şu anda kaydını tamamlayamadık. Lütfen tekrar dene.",
    storyError: "Hikâyeyi gönderemedik. Lütfen tekrar dene.",
    trust:
      "Katılım tamamen ücretsizdir. Yalnızca ara sıra e-posta gönderilir. Dilediğin zaman abonelikten ayrılabilirsin.",
    storyTrust:
      "Katılım ücretsiz · Mektuplar ara sıra gelir · İstediğin zaman ayrılabilirsin",
    footerHeading: "Stüdyo Mektubu",
    footerSubheading: "Hikâyeler, yeni eserler ve sınırlı atölye edisyonları.",
    continue: "Bu hikâyenin devamı gelen kutuna ulaşabilir.",
    transition:
      "Ücretsiz kişisel hikâyeler, atölye notları ve yeni eserlere ilk bakışlar.",
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
  templateId: string;
  eyebrow: string;
  title: string;
  metadata: string;
  excerpt: string;
  desktopExcerpt?: string;
  mobileExcerpt?: string;
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
  presentation = "standard",
}: {
  variant: StudioLetterVariant;
  context: StudioLetterContext;
  submitLabel?: Partial<Record<SiteLocale, string>>;
  trustText?: Partial<Record<SiteLocale, string>>;
  dark?: boolean;
  presentation?: "compact" | "standard" | "page-feature";
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
  const [featuredLoaded, setFeaturedLoaded] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const submitting = useRef(false);
  const story = variant === "story-preview";
  const hero = variant === "hero";

  useEffect(() => {
    trackAnalytics("newsletter_section_viewed", {
      metadata: { form: context },
    });
  }, [context]);
  useEffect(() => {
    if (!story && !hero) return;
    const placement = hero
      ? "newsletter"
      : context === "turkiye"
        ? "turkiye-shop"
        : context === "international"
          ? "international-shop"
          : context;
    fetch(
      `/api/newsletter/featured-letter?context=${encodeURIComponent(placement)}`,
      { cache: "no-store" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then(setFeatured)
      .catch(() => setFeatured(null))
      .finally(() => setFeaturedLoaded(true));
  }, [context, hero, story]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobilePreview(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const subscribed = () => setStatus("success");
    window.addEventListener("studio-letter:subscribed", subscribed);
    return () =>
      window.removeEventListener("studio-letter:subscribed", subscribed);
  }, []);

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
          signupForm: hero ? "studio-letter-hero" : context,
          ...(featured
            ? {
                featuredTemplateId: featured.templateId,
                featuredLetterRevisionId: featured.id,
              }
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
      window.dispatchEvent(
        new CustomEvent("studio-letter:subscribed", { detail: result }),
      );
      trackAnalytics("newsletter_signup_success", {
        metadata: { form: context, newSubscriber: !result.alreadySubscribed },
      });
    } catch {
      setStatus("error");
      setError(story ? copy.storyError : copy.error);
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
        className={
          variant === "footer"
            ? "footer-newsletter-form"
            : `w-full ${story ? "studio-letter-preview__form" : ""}`
        }
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
            disabled={status === "loading" || (hero && !featuredLoaded)}
            className={
              variant === "footer"
                ? "footer-newsletter-input"
                : `min-h-12 min-w-0 border px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral ${dark ? "border-paper/30 bg-paper text-ink" : "border-ink/20 bg-paper"}`
            }
          />
          <button
            type="submit"
            disabled={status === "loading" || (hero && !featuredLoaded)}
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
                    : hero
                      ? copy.heroSubmit
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
  const excerpt = mobilePreview
    ? featured.mobileExcerpt || featured.excerpt
    : featured.desktopExcerpt || featured.excerpt;

  const openImage = (
    event: React.MouseEvent<HTMLButtonElement>,
    src: string,
    alt: string,
    caption: string,
  ) => setLightbox({ src, alt, caption, trigger: event.currentTarget });

  return (
    <section
      id="studio-letter"
      className={`studio-letter-preview studio-letter-preview--${presentation} section-shell scroll-mt-24`}
      aria-labelledby={`${inputId}-heading`}
      data-studio-letter={context}
      data-no-translate
    >
      <div className="studio-letter-preview__layout">
        <div
          className={`studio-letter-preview__images ${featured.images.length === 1 ? "studio-letter-preview__images--single" : "studio-letter-preview__images--double"}`}
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
                    ? "block h-full w-full object-contain"
                    : "block aspect-square w-full object-cover"
                }
              />
              <span className="absolute inset-x-3 bottom-3 font-hand text-base text-ink/65 transition-colors duration-300 group-hover:text-ink group-focus-visible:text-ink">
                {image.caption || featured.title}
              </span>
            </button>
          ))}
        </div>

        <article className="studio-letter-preview__content">
          <div className="h-0.5 w-14 bg-coral" aria-hidden="true" />
          <p className="eyebrow mt-4 text-coral">{featured.eyebrow}</p>
          <p className="mt-2 text-[11px] font-semibold tracking-[.08em] text-ink/45">
            {featured.metadata}
          </p>
          <h2
            id={`${inputId}-heading`}
            className="studio-letter-preview__title"
          >
            {featured.title}
          </h2>
          <div className="studio-letter-preview__excerpt mt-4 space-y-3 text-[15px] leading-6 text-ink/75">
            {excerpt.split(/\n\n+/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div
            className="studio-letter-preview__blur pointer-events-none mt-3 space-y-2 select-none"
            aria-hidden="true"
          >
            <span className="block h-2 w-[88%] bg-current opacity-15 blur-[4px]" />
            <span className="block h-2 w-[62%] bg-current opacity-10 blur-[5px]" />
          </div>
          <p className="studio-letter-preview__continue">{copy.continue}</p>
          <div className="studio-letter-preview__signup">
            <p className="studio-letter-preview__transition">
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
