import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  MapPin,
  MessageCircle,
  Users,
  X,
} from "lucide-react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "@/lib/newsletter";
import eventImage from "@assets/istanbul-summer-painting-day.png";
import { analyticsContext, trackAnalytics } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import { PaperButton } from "@/components/ui/playful-studio";

type EventConfig = {
  id: string;
  slug: string;
  timezone: string;
  event_start_at: string;
  total_capacity: number;
  participation_price_try: number;
  audience: "girls_only" | "boys_only" | "everyone";
  image_url: string | null;
  image_alt_text: string;
  image_object_position: string;
  location_text_en: string;
  location_text_tr: string;
  eyebrow_en: string;
  eyebrow_tr: string;
  title_en: string;
  title_tr: string;
  banner_short_title_en: string | null;
  banner_short_title_tr: string | null;
  description_en: string;
  description_tr: string;
  secondary_details_en: string | null;
  secondary_details_tr: string | null;
};
const WHATSAPP_MESSAGE =
  "Hello Aida, I joined the Newsletter through the Istanbul painting day invitation. I would love to reserve my place for the event on Wednesday, 5 August 2026 at 4:00 PM.";

export default function IstanbulPaintingEventBanner({
  placement = "home",
  compact = false,
}: {
  placement?: "home" | "turkiye-shop" | "international-shop";
  compact?: boolean;
}) {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const submitting = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [remainingSeats, setRemainingSeats] = useState(0);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [serverWhatsappUrl, setServerWhatsappUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    trackAnalytics("painting_event_banner_viewed");
    fetch(
      `/api/events/feature?placement=${encodeURIComponent(placement)}`,
      {
        cache: "no-store",
      },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error();
        setConfig(result.config || null);
        if (Number.isInteger(result.remainingSeats))
          setRemainingSeats(Math.max(0, result.remainingSeats));
      })
      .catch(() => undefined);
  }, [placement]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  if (!config) return null;
  const local = locale === "tr";
  const eventDate = new Intl.DateTimeFormat(local ? "tr-TR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timezone,
  }).format(new Date(config.event_start_at));
  const eventTeaserDate = new Intl.DateTimeFormat(local ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: config.timezone,
  }).format(new Date(config.event_start_at));
  const audience = local
    ? {
        girls_only: "Yalnızca kızlar",
        boys_only: "Yalnızca erkekler",
        everyone: "Herkes",
      }[config.audience]
    : {
        girls_only: "Girls only",
        boys_only: "Boys only",
        everyone: "Everyone",
      }[config.audience];
  const ui = local
    ? {
        remaining: remainingSeats === 1 ? "yer kaldı" : "yer kaldı",
        details: "Etkinlik ayrıntıları",
        interested: "Katılmak ister misin?",
        join: "Etkinlik ayrıntılarını almak ve Aida ile kaydına devam etmek için Bültene katıl.",
        placeholder: "E-posta adresin",
        submit: "Etkinlik ayrıntılarını al",
        sending: "Gönderiliyor…",
        invalid: "Geçerli bir e-posta adresi gir.",
        error: "Etkinlik ayrıntılarını gönderemedik. Lütfen tekrar dene.",
        success:
          "Etkinlik ayrıntıları gönderildi. E-posta kutunu, Spam veya Gereksiz klasörünü kontrol et.",
        emailLabel: "E-posta adresi",
        joined:
          "Aida’nın etkinlik notu için e-posta kutunu kontrol et. Kaydın WhatsApp üzerinden kişisel olarak devam eder.",
        trust:
          "Katılım ücretsizdir. Ayrıca ara sıra atölye güncellemeleri alırsın.",
        reservation:
          "E-postanı göndermek etkinlik ayrıntılarını yollar. Yerin yalnızca Aida’nın WhatsApp üzerinden kişisel onayından sonra ayrılır.",
        contact: "Yerimi ayırmak için Aida ile iletişime geç",
        openForm: "Katılmak istiyorum",
      }
    : {
        remaining:
          remainingSeats === 1 ? "place remaining" : "places remaining",
        details: "Event details",
        interested: "Interested in joining?",
        join: "Join the Newsletter to receive the event details and continue your registration with Aida.",
        placeholder: "Your email address",
        submit: "Get event details",
        sending: "Sending…",
        invalid: "Enter a valid email address.",
        error: "We couldn’t send the event details. Please try again.",
        success:
          "Event details sent. Check your inbox, and please check your Spam or Junk folder too.",
        emailLabel: "Email address",
        joined:
          "Check your inbox for Aida’s event note. Your registration continues personally on WhatsApp.",
        trust:
          "Free to join. You’ll also receive occasional studio updates and early notice of special releases.",
        reservation:
          "Submitting your email sends the event details. Your place is reserved only after personal confirmation with Aida on WhatsApp.",
        contact: "Contact Aida to reserve my place",
        openForm: "I’m interested in joining",
      };

  const showSuccessToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setShowToast(true);
    toastTimer.current = setTimeout(() => setShowToast(false), 7_000);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    trackAnalytics("painting_event_form_started");
    const normalized = normalizeNewsletterEmail(email);
    if (!isValidNewsletterEmail(normalized)) {
      setStatus("error");
      setError(ui.invalid);
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
          source: "istanbul-painting-day-august-2026",
          campaignId: config.id,
          eventInterest: true,
          consentToStudioLetter: true,
          locale,
          ...analyticsContext(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setServerWhatsappUrl(
        typeof result.whatsappUrl === "string" ? result.whatsappUrl : null,
      );
      setEmail("");
      setStatus("success");
      trackAnalytics("painting_event_signup_success");
      showSuccessToast();
    } catch {
      setStatus("error");
      setError(ui.error);
    } finally {
      submitting.current = false;
    }
  };

  const whatsappNumber = settings.whatsapp.number.replace(/\D/g, "");
  const fallbackWhatsappUrl = /^\d{8,15}$/.test(whatsappNumber)
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;
  const whatsappUrl = serverWhatsappUrl || fallbackWhatsappUrl;
  const shopStrip = compact && placement === "turkiye-shop";
  const bannerTitle = local
    ? config.banner_short_title_tr || config.title_tr
    : config.banner_short_title_en || config.title_en;
  const bannerImage = config.image_url || eventImage;
  const soldOut = remainingSeats <= 0;

  const compactAnnouncement = compact ? (
    <section
      className="home-event-announcement"
      aria-labelledby="home-event-heading"
      data-no-translate
    >
      <div className="home-event-announcement__inner">
        <figure className="home-event-announcement__photo">
          <img
            src={bannerImage}
            alt={config.image_alt_text}
            width="480"
            height="600"
            style={{ objectPosition: config.image_object_position }}
          />
        </figure>
        <div className="home-event-announcement__content">
          <p className="home-event-announcement__date">{eventTeaserDate}</p>
          <h2 id="home-event-heading" className="home-event-announcement__title">
            {bannerTitle}
          </h2>
          <p className="home-event-announcement__details">
            {audience} ·{" "}
            {local ? config.location_text_tr : config.location_text_en}
          </p>
          <strong className="home-event-announcement__places">
            {soldOut
              ? local ? "Tamamen dolu" : "Fully booked"
              : `${remainingSeats} ${ui.remaining}`}
          </strong>
          <PaperButton
            href={`/events/${config.slug}`}
            variant="pink"
            size="sm"
            arrow
            className="home-event-announcement__cta"
            onClick={() => trackAnalytics("homepage_event_clicked")}
          >
            {soldOut
              ? local ? "Etkinliği görüntüle" : "View event"
              : local ? "Etkinlik ayrıntıları" : "View event details"}
          </PaperButton>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <>
      {compactAnnouncement}
      {!shopStrip && !compact && (
      <section
        className={`event-ticket relative border-b ${compact ? "hidden md:block" : ""}`}
        aria-labelledby="istanbul-painting-day-heading"
        data-no-translate
      >
        {showToast && (
          <div
            className="fixed right-4 top-24 z-[80] flex max-w-sm items-start gap-3 border border-white/15 bg-[#1b1b18] p-4 text-sm leading-6 text-[#fffaf1] shadow-2xl"
            role="status"
            aria-live="polite"
          >
            <CircleCheck
              className="mt-0.5 shrink-0 text-coral"
              size={20}
              aria-hidden="true"
            />
            <p>{ui.success}</p>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="-mr-1 -mt-1 grid min-h-11 min-w-11 place-items-center text-[#fffaf1]/70 hover:text-white focus-visible:ring-2 focus-visible:ring-coral"
              aria-label="Close notification"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="section-shell grid items-center gap-7 !py-9 md:!py-11 lg:grid-cols-[1.27fr_1fr] lg:gap-12 lg:!py-12">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow text-coral">
                {local ? config.eyebrow_tr : config.eyebrow_en}
              </p>
              <span className="border border-coral/70 px-2 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-coral">
                {remainingSeats} {ui.remaining}
              </span>
            </div>
            <h2
              id="istanbul-painting-day-heading"
              className="mt-3 max-w-3xl text-3xl leading-tight text-[#fffaf1] md:text-4xl"
            >
              {local ? config.title_tr : config.title_en}
            </h2>
            <p className="mt-3 hidden max-w-3xl text-sm leading-6 text-[#fffaf1]/68 sm:block md:text-[15px]">
              {local ? config.description_tr : config.description_en}
            </p>
            <details className="group mt-3 border-y border-white/15 py-2 sm:hidden">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-bold">
                {ui.details}
                <span className="text-coral group-open:rotate-45">+</span>
              </summary>
              <p className="pb-2 text-sm leading-6 text-[#fffaf1]/68">
                {local ? config.description_tr : config.description_en}
              </p>
            </details>

            <ul
              className="mt-4 flex flex-wrap gap-2 text-xs"
              aria-label="Event facts"
            >
              {[
                [CalendarDays, eventDate],
                [
                  MapPin,
                  local ? config.location_text_tr : config.location_text_en,
                ],
                [Users, audience],
                [CircleCheck, `${config.participation_price_try} TL`],
              ].map(([Icon, value]) => {
                const FactIcon = Icon as typeof CalendarDays;
                return (
                  <li
                    key={value as string}
                    className="flex min-h-9 items-center gap-2 border border-white/15 bg-white/[.04] px-3"
                  >
                    <FactIcon
                      size={13}
                      className="text-coral"
                      aria-hidden="true"
                    />
                    <span className="font-semibold">{value as string}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-[#fffaf1]/55">
              {local
                ? config.secondary_details_tr
                : config.secondary_details_en}
            </p>

            <figure className="relative mt-5 rotate-[.2deg] border-[6px] border-b-[25px] border-[#fffaf1] bg-[#fffaf1] shadow-[0_12px_28px_rgba(0,0,0,.28)] lg:hidden">
              <img
                src={config.image_url || eventImage}
                alt={config.image_alt_text}
                width="1400"
                height="1122"
                loading="eager"
                decoding="async"
                className="aspect-[5/4] w-full object-cover"
                style={{ objectPosition: config.image_object_position }}
              />
            </figure>

            <PaperButton
              href={`/events/${encodeURIComponent(config.id)}/apply`}
              variant="pink"
              size="sm"
              arrow
              className="mt-5 w-full justify-center lg:hidden"
            >
              {ui.openForm}
            </PaperButton>

            <div
              id="event-registration-form"
              className="mt-4 hidden border-t border-white/15 pt-4 lg:block"
            >
              <h3 className="font-serif text-xl text-[#fffaf1]">
                {ui.interested}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-[#fffaf1]/60">
                {local ? "Başvurunuz beklemede başlar. Aida yerinizi onayladığında e-posta alırsınız." : "Your application starts as pending. You will receive an email when Aida confirms your place."}
              </p>
              <PaperButton href={`/events/${encodeURIComponent(config.id)}/apply`} variant="pink" size="sm" arrow className="mt-4">
                {local ? "Etkinliğe başvur" : "Apply for the event"}
              </PaperButton>
            </div>
          </article>

          <figure className="relative hidden rotate-[.35deg] border-[8px] border-b-[32px] border-[#fffaf1] bg-[#fffaf1] shadow-[0_18px_40px_rgba(0,0,0,.35)] motion-reduce:rotate-0 lg:block">
            <div className="absolute -left-2 -top-2 z-10 bg-coral px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-white">
              {eventDate.toUpperCase()}
            </div>
            <img
              src={config.image_url || eventImage}
              alt={config.image_alt_text}
              width="1400"
              height="1122"
              loading="eager"
              decoding="async"
              className="aspect-[5/4] w-full object-cover"
              style={{ objectPosition: config.image_object_position }}
            />
            <figcaption className="px-2 pt-1.5 font-hand text-sm text-ink/65">
              A summer afternoon for painting together.
            </figcaption>
          </figure>
        </div>
      </section>
      )}
    </>
  );
}
