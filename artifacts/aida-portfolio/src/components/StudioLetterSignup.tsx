import { useEffect, useId, useRef, useState } from "react";
import { CircleCheck, Mail, X } from "lucide-react";
import { useLocale, type SiteLocale } from "@/lib/locale";
import {
  isValidNewsletterEmail,
  NEWSLETTER_SOURCE,
  normalizeNewsletterEmail,
  type StudioLetterContext,
} from "@/lib/newsletter";
import memoriesPhoto from "@assets/memories-of-summer-reference-photo.png";
import memoriesPainting from "@assets/memories-of-summer-painting.JPG";

export type StudioLetterVariant = "story-preview" | "compact" | "footer";

export const studioLetterCopy = {
  en: {
    emailLabel: "Email address",
    emailPlaceholder: "Your email address",
    footerSubmit: "Join free",
    compactSubmit: "Join the Studio Letter — Free",
    storySubmit: "Send me the Studio Letter — Free",
    loading: "Joining…",
    successTitle: "You’re on the Studio Letter list.",
    successBody:
      "The next note from Aida’s studio will find its way to your inbox.",
    storySuccessTitle: "Your next studio story is on its way.",
    storySuccessBody:
      "You’re now part of the Studio Letter. The next note from Aida’s studio will arrive in your inbox.",
    duplicate:
      "You’re already on the list — the next studio note will reach you.",
    invalid: "Enter a valid email address.",
    error: "We couldn’t add you just now. Please try again.",
    trust:
      "Free to join. Occasional letters only. Unsubscribe whenever you like.",
    storyTrust:
      "Free to join. Occasional letters only. Unsubscribe whenever you like.",
    footerHeading: "Studio Letter",
    footerSubheading: "Stories, new artwork and limited studio releases.",
    sectionEyebrow: "THE FREE STUDIO LETTER",
    sectionHeading: "Every painting begins somewhere.",
    sectionBody:
      "Step inside the memories, places and small moments behind Aida’s work.",
    previewEyebrow: "A PREVIEW FROM THE STUDIO LETTER",
    previewMetadata: "FROM AIDA’S ISTANBUL STUDIO · 4 MIN READ",
    previewHeading: "The story behind “Memories of Summer”",
    paragraphOne:
      "It all started on a sunny, warm summer day while I was on my way to Beşiktaş. I was watching the city pass through the car window when I caught my reflection in the side mirror.",
    paragraphTwo:
      "It was an ordinary moment — warm light, moving streets and a brief smile — but something about it stayed with me. Later, when I returned to the studio, I began turning that memory into an oil pastel painting…",
    continue: "Continue reading stories like this in the Studio Letter.",
    transition:
      "Stories behind the paintings, studio notes, new originals and first notice of limited releases — sent occasionally and always free.",
    photoCaption: "The moment that stayed with me.",
    paintingCaption: "Memories of Summer",
    openPhoto: "Open the reference photograph",
    openPainting: "Open the Memories of Summer painting",
    closeImage: "Close image viewer",
  },
  tr: {
    emailLabel: "E-posta adresi",
    emailPlaceholder: "E-posta adresin",
    footerSubmit: "Ücretsiz katıl",
    compactSubmit: "Stüdyo Mektubu’na ücretsiz katıl",
    storySubmit: "Stüdyo Mektubu’nu bana gönder — Ücretsiz",
    loading: "Katılım tamamlanıyor…",
    successTitle: "Stüdyo Mektubu listesine katıldın.",
    successBody:
      "Aida’nın atölyesinden gelecek bir sonraki not e-posta kutuna ulaşacak.",
    storySuccessTitle: "Bir sonraki atölye hikâyesi sana doğru yola çıktı.",
    storySuccessBody:
      "Artık Stüdyo Mektubu’ndasın. Aida’nın atölyesinden gelecek bir sonraki not e-posta kutuna ulaşacak.",
    duplicate:
      "Zaten listedesin — atölyeden gelecek bir sonraki not sana da ulaşacak.",
    invalid: "Geçerli bir e-posta adresi gir.",
    error: "Şu anda kaydını tamamlayamadık. Lütfen tekrar dene.",
    trust:
      "Katılım tamamen ücretsizdir. Yalnızca ara sıra e-posta gönderilir. Dilediğin zaman abonelikten ayrılabilirsin.",
    storyTrust:
      "Katılım ücretsizdir. Yalnızca ara sıra gönderilir. Dilediğin zaman abonelikten ayrılabilirsin.",
    footerHeading: "Stüdyo Mektubu",
    footerSubheading: "Hikâyeler, yeni eserler ve sınırlı atölye edisyonları.",
    sectionEyebrow: "ÜCRETSİZ STÜDYO MEKTUBU",
    sectionHeading: "Her resim bir yerde başlar.",
    sectionBody:
      "Aida’nın eserlerinin ardındaki anılara, yerlere ve küçük anlara yaklaş.",
    previewEyebrow: "STÜDYO MEKTUBU’NDAN BİR ÖN İZLEME",
    previewMetadata: "AIDA’NIN İSTANBUL ATÖLYESİNDEN · 4 DAKİKALIK OKUMA",
    previewHeading: "“Memories of Summer”ın ardındaki hikâye",
    paragraphOne:
      "Her şey, Beşiktaş’a doğru giderken güneşli ve sıcak bir yaz gününde başladı. Şehir araba camının ardından akıp giderken yan aynada kendi yansımamı gördüm.",
    paragraphTwo:
      "Sıcak ışık, hareket hâlindeki sokaklar ve kısa bir gülümseme… Sıradan bir andı ama nedense aklımda kaldı. Daha sonra atölyeye döndüğümde bu anıyı yağlı pastel bir resme dönüştürmeye başladım…",
    continue: "Bunun gibi hikâyelerin devamını Stüdyo Mektubu’nda oku.",
    transition:
      "Resimlerin ardındaki hikâyeler, atölye notları, yeni orijinaller ve sınırlı edisyonlara dair ilk haberler — yalnızca ara sıra ve her zaman ücretsiz.",
    photoCaption: "Aklımda kalan o an.",
    paintingCaption: "Memories of Summer",
    openPhoto: "İlham veren fotoğrafı aç",
    openPainting: "Memories of Summer eserini aç",
    closeImage: "Görsel görüntüleyiciyi kapat",
  },
} as const;

type PreviewImage = {
  src: string;
  alt: string;
  caption: string;
  trigger: HTMLButtonElement;
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
  const submitting = useRef(false);
  const story = variant === "story-preview";

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
                ? "grid gap-3"
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
                : `button-primary min-h-12 justify-center disabled:cursor-wait disabled:opacity-70 ${story ? "w-full" : ""}`
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

  const openImage = (
    event: React.MouseEvent<HTMLButtonElement>,
    src: string,
    alt: string,
    caption: string,
  ) => setLightbox({ src, alt, caption, trigger: event.currentTarget });

  return (
    <section
      className="section-shell !py-14 md:!py-20"
      aria-labelledby={`${inputId}-heading`}
      data-studio-letter={context}
      data-no-translate
    >
      <header className="mb-10 max-w-2xl md:mb-14">
        <p className="eyebrow text-coral">{copy.sectionEyebrow}</p>
        <h2 id={`${inputId}-heading`} className="mt-4 text-4xl md:text-5xl">
          {copy.sectionHeading}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/65">
          {copy.sectionBody}
        </p>
      </header>

      <div className="grid items-center gap-12 lg:grid-cols-[.88fr_1.12fr] lg:gap-16 xl:gap-20">
        <div
          className="relative mx-auto min-h-[560px] w-full max-w-[560px] sm:min-h-[680px] lg:min-h-[720px]"
          aria-label="The memory and the painting it inspired"
        >
          <button
            type="button"
            onClick={(event) =>
              openImage(
                event,
                memoriesPhoto,
                "Aida Ramezani reflected in a car side mirror during a summer journey to Beşiktaş",
                copy.photoCaption,
              )
            }
            className="group absolute left-[3%] top-0 w-[67%] -rotate-2 border-[10px] border-b-[46px] border-[#fffdf8] bg-[#fffdf8] text-left shadow-[0_12px_30px_rgba(45,37,28,.18)] transition duration-300 ease-out hover:-translate-y-1.5 hover:-rotate-1 hover:shadow-[0_18px_34px_rgba(45,37,28,.22)] focus-visible:-translate-y-1.5 focus-visible:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral motion-reduce:transform-none motion-reduce:transition-none sm:border-[12px] sm:border-b-[52px]"
            aria-label={copy.openPhoto}
          >
            <img
              src={memoriesPhoto}
              alt="Aida Ramezani reflected in a car side mirror during a summer journey to Beşiktaş"
              width="941"
              height="1672"
              loading="lazy"
              decoding="async"
              className="block aspect-[941/1672] w-full object-cover"
            />
            <span className="absolute inset-x-3 bottom-3 font-hand text-base text-ink/65 transition-colors duration-300 group-hover:text-ink group-focus-visible:text-ink">
              {copy.photoCaption}
            </span>
          </button>

          <span
            className="absolute left-[54%] top-[44%] z-20 h-8 w-24 -translate-x-1/2 -rotate-3 bg-[#e7d4aa]/70 shadow-sm"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={(event) =>
              openImage(
                event,
                memoriesPainting,
                "Memories of Summer, an original oil pastel painting by Aida Ramezani",
                copy.paintingCaption,
              )
            }
            className="group absolute bottom-1 right-[1%] z-10 w-[73%] rotate-2 border-[10px] border-b-[46px] border-[#fffdf8] bg-[#fffdf8] text-left shadow-[0_12px_30px_rgba(45,37,28,.2)] transition duration-300 ease-out hover:-translate-y-1.5 hover:rotate-1 hover:shadow-[0_18px_34px_rgba(45,37,28,.24)] focus-visible:-translate-y-1.5 focus-visible:rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral motion-reduce:transform-none motion-reduce:transition-none sm:border-[12px] sm:border-b-[52px]"
            aria-label={copy.openPainting}
          >
            <img
              src={memoriesPainting}
              alt="Memories of Summer, an original oil pastel painting by Aida Ramezani"
              width="1838"
              height="1893"
              loading="lazy"
              decoding="async"
              className="block aspect-[1838/1893] w-full bg-[#f3ede1] object-contain"
            />
            <span className="absolute inset-x-3 bottom-3 font-hand text-lg text-ink/65 transition-colors duration-300 group-hover:text-ink group-focus-visible:text-ink">
              {copy.paintingCaption}
            </span>
          </button>
        </div>

        <article className="border border-ink/15 bg-[#fffaf0] p-6 shadow-[0_10px_26px_rgba(49,38,26,.09)] sm:p-8 md:p-10">
          <div className="h-0.5 w-14 bg-coral" aria-hidden="true" />
          <p className="eyebrow mt-5 text-coral">{copy.previewEyebrow}</p>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[.13em] text-ink/45">
            {copy.previewMetadata}
          </p>
          <h3 className="mt-5 text-3xl leading-tight md:text-4xl">
            {copy.previewHeading}
          </h3>
          <div className="mt-6 space-y-4 text-[15px] leading-7 text-ink/75">
            <p>{copy.paragraphOne}</p>
            <p>{copy.paragraphTwo}</p>
          </div>
          <div
            className="relative mt-3 overflow-hidden pb-16"
            aria-hidden="true"
          >
            <p className="text-sm leading-7 text-ink/50 blur-[.7px]">
              The colours began to hold the warmth of the road and the movement
              of that afternoon.
            </p>
            <p className="text-sm leading-7 text-ink/35 blur-[1.4px]">
              Layer by layer, the remembered moment became something I could
              hold onto.
            </p>
            <p className="text-sm leading-7 text-ink/20 blur-[2.2px]">
              And slowly, the painting found its own way back to me.
            </p>
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-[#fffaf0]/0 via-[#fffaf0]/90 to-[#fffaf0]" />
            <p className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-coral blur-none">
              {copy.continue}
            </p>
          </div>
          <div className="mt-5 border-t border-ink/15 pt-6">
            <p className="mb-5 text-sm leading-6 text-ink/65">
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
