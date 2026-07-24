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

const CAMPAIGN_ID = "istanbul-painting-day-2026-08-04";
const EVENT_DEADLINE = Date.parse("2026-08-04T21:00:00.000Z");
const WHATSAPP_MESSAGE =
  "Hello Aida, I joined the Studio Letter through the Istanbul painting day invitation. I would love to reserve my place for the event on 4 August 2026.";
const SUCCESS_MESSAGE =
  "Event details sent. Check your inbox, and please check your Spam or Junk folder too in case the email landed there.";

export default function IstanbulPaintingEventBanner() {
  const settings = useShopSettings();
  const submitting = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(() => Date.now() < EVENT_DEADLINE);
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
    fetch(
      `/api/newsletter/event-status?campaignId=${encodeURIComponent(CAMPAIGN_ID)}`,
      {
        cache: "no-store",
      },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error();
        setActive(Boolean(result.active));
      })
      .catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  if (!active) return null;

  const showSuccessToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setShowToast(true);
    toastTimer.current = setTimeout(() => setShowToast(false), 7_000);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const normalized = normalizeNewsletterEmail(email);
    if (!isValidNewsletterEmail(normalized)) {
      setStatus("error");
      setError("Enter a valid email address.");
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
          campaignId: CAMPAIGN_ID,
          eventInterest: true,
          consentToStudioLetter: true,
          locale: "en",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setServerWhatsappUrl(
        typeof result.whatsappUrl === "string" ? result.whatsappUrl : null,
      );
      setEmail("");
      setStatus("success");
      showSuccessToast();
    } catch {
      setStatus("error");
      setError("We couldn’t send the event details. Please try again.");
    } finally {
      submitting.current = false;
    }
  };

  const whatsappNumber = settings.whatsapp.number.replace(/\D/g, "");
  const fallbackWhatsappUrl = /^\d{8,15}$/.test(whatsappNumber)
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;
  const whatsappUrl = serverWhatsappUrl || fallbackWhatsappUrl;

  return (
    <section
      className="relative border-b border-white/10 bg-[#11110f] text-[#fffaf1]"
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
          <p>{SUCCESS_MESSAGE}</p>
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
              A SUMMER PAINTING DAY IN ISTANBUL
            </p>
            <span className="border border-coral/70 px-2 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-coral">
              Limited places
            </span>
          </div>
          <h2
            id="istanbul-painting-day-heading"
            className="mt-3 max-w-3xl text-3xl leading-tight text-[#fffaf1] md:text-4xl"
          >
            Paint, meet and spend a sunny afternoon together.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#fffaf1]/68 md:text-[15px]">
            On 4 August, Aida is hosting a small girls-only painting gathering
            in a park on Istanbul’s European side. No experience is needed —
            just come to paint, meet new people, drink tea and enjoy a beautiful
            summer day together.
          </p>

          <ul
            className="mt-4 flex flex-wrap gap-2 text-xs"
            aria-label="Event facts"
          >
            {[
              [CalendarDays, "4 August 2026"],
              [MapPin, "European side"],
              [Users, "Girls only"],
              [CircleCheck, "100 TL"],
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
            No experience needed · Tea and snacks included · Limited places
          </p>

          <div className="mt-4 border-l-2 border-coral bg-white/[.05] px-4 py-2.5">
            <p className="text-sm font-bold">
              Two early participants will attend free.
            </p>
            <p className="mt-0.5 text-xs text-[#fffaf1]/60">
              Complimentary places and attendance are confirmed personally by
              Aida.
            </p>
          </div>

          <div className="mt-4 border-t border-white/15 pt-4">
            <h3 className="font-serif text-xl text-[#fffaf1]">
              Interested in joining?
            </h3>
            <p className="mt-1 text-sm text-[#fffaf1]/60">
              Join the Studio Letter to receive the event details and continue
              your registration with Aida.
            </p>
            <form onSubmit={submit} noValidate className="mt-3 max-w-2xl">
              <label htmlFor="istanbul-event-email" className="sr-only">
                Email address
              </label>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  id="istanbul-event-email"
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
                  placeholder="Your email address"
                  disabled={status === "loading"}
                  aria-invalid={status === "error" ? "true" : undefined}
                  aria-describedby={
                    status === "error"
                      ? "istanbul-event-error"
                      : "istanbul-event-help"
                  }
                  className="min-h-11 min-w-0 border border-white/25 bg-white/[.07] px-4 text-base text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-coral"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="button-primary min-h-11 justify-center disabled:cursor-wait disabled:opacity-70"
                >
                  {status === "loading" ? "Sending…" : "Get event details"}
                </button>
              </div>
              <div aria-live="polite">
                {status === "error" && (
                  <p
                    id="istanbul-event-error"
                    role="alert"
                    className="mt-2 text-sm font-semibold text-coral"
                  >
                    {error}
                  </p>
                )}
                {status === "success" && (
                  <p className="mt-2 text-sm font-semibold text-[#fffaf1]">
                    Check your inbox for Aida’s event note. Your registration
                    continues personally on WhatsApp.
                  </p>
                )}
              </div>
              <p
                id="istanbul-event-help"
                className="mt-2 text-xs leading-relaxed text-[#fffaf1]/50"
              >
                Free to join. You’ll also receive occasional studio updates and
                early notice of special releases.
              </p>
            </form>
            <p className="mt-2 text-xs font-semibold text-[#fffaf1]/60">
              Submitting your email sends the event details. Your place is
              reserved only after personal confirmation with Aida on WhatsApp.
            </p>
            {status === "success" && whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-coral underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-coral"
              >
                <MessageCircle size={16} aria-hidden="true" /> Contact Aida to
                reserve my place
              </a>
            )}
          </div>
        </article>

        <figure className="relative rotate-[.35deg] border-[8px] border-b-[32px] border-[#fffaf1] bg-[#fffaf1] shadow-[0_18px_40px_rgba(0,0,0,.35)] motion-reduce:rotate-0">
          <div className="absolute -left-2 -top-2 z-10 bg-coral px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-white">
            4 AUG · ISTANBUL
          </div>
          <img
            src={eventImage}
            alt="Aida and a group of women laughing and painting together on a picnic blanket beneath the trees in an Istanbul park."
            width="1400"
            height="1122"
            loading="eager"
            decoding="async"
            className="aspect-[5/4] w-full object-cover object-center"
          />
          <figcaption className="px-2 pt-1.5 font-hand text-sm text-ink/65">
            A summer afternoon for painting together.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
