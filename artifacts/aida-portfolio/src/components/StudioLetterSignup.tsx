import { useId, useRef, useState } from "react";
import { Check, Mail } from "lucide-react";
import { useLocale, type SiteLocale } from "@/lib/locale";
import {
  isValidNewsletterEmail,
  NEWSLETTER_SOURCE,
  normalizeNewsletterEmail,
  type StudioLetterContext,
} from "@/lib/newsletter";

export type StudioLetterVariant = "editorial" | "compact" | "footer";

export const studioLetterCopy = {
  en: {
    eyebrow: "STUDIO LETTER",
    heading: "Stories from the studio, sent to you.",
    body: "Join Aida’s free Studio Letter for the stories behind new paintings, notes from the Istanbul studio, early news of limited releases and occasional special offers.",
    benefits: [
      "Discover the story behind selected artworks",
      "Hear about new originals before they disappear",
      "Be first to know when the next Mystery Mail opens",
      "Receive occasional subscriber-only updates and offers",
    ],
    emailLabel: "Email address",
    emailPlaceholder: "Your email address",
    submit: "Join the Studio Letter — Free",
    footerSubmit: "Join free",
    loading: "Joining…",
    successTitle: "You’re on the Studio Letter list.",
    successBody:
      "The next note from Aida’s studio will find its way to your inbox.",
    duplicate:
      "You’re already on the list — the next studio note will reach you.",
    invalid: "Enter a valid email address.",
    error: "We couldn’t add you just now. Please try again.",
    trust:
      "Free to join. Occasional letters only. Unsubscribe whenever you like.",
    supportingLine: "A quieter way to stay close to the studio.",
    footerHeading: "Studio Letter",
    footerSubheading: "Stories, new artwork and limited studio releases.",
  },
  tr: {
    eyebrow: "STÜDYO MEKTUBU",
    heading: "Atölyeden hikâyeler, doğrudan sana.",
    body: "Yeni resimlerin ardındaki hikâyeler, İstanbul’daki atölyeden notlar, sınırlı koleksiyonlara erken erişim haberleri ve zaman zaman sunulan özel fırsatlar için Aida’nın ücretsiz Stüdyo Mektubu’na katıl.",
    benefits: [
      "Seçili eserlerin ardındaki hikâyeleri keşfet",
      "Yeni orijinaller tükenmeden önce haberdar ol",
      "Yeni Mystery Mail satışa çıktığında ilk öğrenenlerden ol",
      "Abonelere özel güncellemeleri ve dönemsel fırsatları kaçırma",
    ],
    emailLabel: "E-posta adresi",
    emailPlaceholder: "E-posta adresin",
    submit: "Stüdyo Mektubu’na ücretsiz katıl",
    footerSubmit: "Ücretsiz katıl",
    loading: "Katılım tamamlanıyor…",
    successTitle: "Stüdyo Mektubu listesine katıldın.",
    successBody:
      "Aida’nın atölyesinden gelecek bir sonraki not e-posta kutuna ulaşacak.",
    duplicate:
      "Zaten listedesin — atölyeden gelecek bir sonraki not sana da ulaşacak.",
    invalid: "Geçerli bir e-posta adresi gir.",
    error: "Şu anda kaydını tamamlayamadık. Lütfen tekrar dene.",
    trust:
      "Katılım tamamen ücretsizdir. Yalnızca ara sıra e-posta gönderilir. Dilediğin zaman abonelikten ayrılabilirsin.",
    supportingLine: "Atölyeye yakın kalmanın daha sakin bir yolu.",
    footerHeading: "Stüdyo Mektubu",
    footerSubheading: "Hikâyeler, yeni eserler ve sınırlı atölye edisyonları.",
  },
} as const;

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
  const submitting = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
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
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || copy.error);
      setEmail(normalized);
      setStatus(result.alreadySubscribed ? "duplicate" : "success");
    } catch {
      setStatus("error");
      setError(copy.error);
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
        <p
          className={`${variant === "footer" ? "font-serif text-2xl text-paper" : "font-serif text-2xl"}`}
        >
          {status === "duplicate" ? copy.duplicate : copy.successTitle}
        </p>
        {status === "success" && (
          <p
            className={`mt-2 text-sm ${dark || variant === "footer" ? "text-paper/65" : "text-ink/60"}`}
          >
            {copy.successBody}
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
                (variant === "footer" ? copy.footerSubmit : copy.submit)}
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
          {trustText?.[locale] || copy.trust}
        </p>
      </form>
    );

  if (variant !== "editorial") return <div data-no-translate>{form}</div>;

  return (
    <section
      className="section-shell"
      aria-labelledby={`${inputId}-heading`}
      data-studio-letter={context}
      data-no-translate
    >
      <div className="grid items-center gap-10 border border-ink/15 bg-[#f4ecdc] px-6 py-12 md:px-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:px-14 lg:py-16">
        <div>
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-coral" aria-hidden="true" />
            <p className="eyebrow text-coral">{copy.eyebrow}</p>
          </div>
          <h2
            id={`${inputId}-heading`}
            className="mt-4 max-w-2xl text-4xl md:text-5xl"
          >
            {copy.heading}
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink/70">
            {copy.body}
          </p>
          <ul className="mt-6 space-y-3">
            {copy.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-3 text-sm leading-relaxed text-ink/75"
              >
                <Check
                  size={17}
                  className="mt-0.5 shrink-0 text-coral"
                  aria-hidden="true"
                />
                {benefit}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-l-2 border-coral pl-4 text-sm italic text-ink/60">
            {copy.supportingLine}
          </p>
        </div>
        <div className="w-full lg:ml-auto lg:max-w-[500px]">{form}</div>
      </div>
    </section>
  );
}
