import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  MapPin,
  MessageCircle,
  Users,
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

export default function IstanbulPaintingEventBanner() {
  const settings = useShopSettings();
  const submitting = useRef(false);
  const [active, setActive] = useState(() => Date.now() < EVENT_DEADLINE);
  const [freePlacesRemaining, setFreePlacesRemaining] = useState(2);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [emailWarning, setEmailWarning] = useState(false);
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
        setFreePlacesRemaining(Number(result.freePlacesRemaining || 0));
      })
      .catch(() => undefined);
  }, []);

  if (!active) return null;

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
      if (!response.ok)
        throw new Error(
          result.error || "Your event interest could not be saved.",
        );
      setIsFree(result.registrationTier === "first-two-free");
      setEmailWarning(result.emailDeliveryStatus === "failed");
      setServerWhatsappUrl(
        typeof result.whatsappUrl === "string" ? result.whatsappUrl : null,
      );
      setStatus("success");
      if (
        result.eventRegistrationStatus === "new" &&
        result.registrationTier === "first-two-free"
      )
        setFreePlacesRemaining((current) => Math.max(0, current - 1));
    } catch (reason) {
      setStatus("error");
      setError(
        reason instanceof Error
          ? reason.message
          : "Your event interest could not be saved.",
      );
    } finally {
      submitting.current = false;
    }
  };

  const whatsappNumber = settings.whatsapp.number.replace(/\D/g, "");
  const fallbackWhatsappUrl = /^\d{8,15}$/.test(whatsappNumber)
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;
  const whatsappUrl = serverWhatsappUrl || fallbackWhatsappUrl;
  const freeMessage =
    freePlacesRemaining >= 2
      ? "The first two girls to join through this invitation attend for free."
      : freePlacesRemaining === 1
        ? "One complimentary place is still available."
        : "The complimentary places have been claimed. Remaining places are 100 TL.";

  return (
    <section
      className="border-b border-ink/10 bg-[#f5ecdc]"
      aria-labelledby="istanbul-painting-day-heading"
      data-no-translate
    >
      <div className="section-shell grid items-center gap-8 !py-8 md:!py-12 lg:grid-cols-[1.22fr_1fr] lg:gap-12 lg:!py-14">
        <article className="min-w-0">
          <p className="eyebrow text-coral">
            A SUMMER PAINTING DAY IN ISTANBUL
          </p>
          <h2
            id="istanbul-painting-day-heading"
            className="mt-3 max-w-3xl text-3xl leading-tight md:text-4xl"
          >
            Paint, meet and spend a sunny afternoon together.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/70 md:text-[15px]">
            On 4 August, Aida is bringing together a small group of girls for a
            relaxed afternoon of painting, tea and conversation in a park on
            Istanbul’s European side. No art experience is needed. This is not a
            class, just a sunny day to create, meet new people and enjoy
            painting together.
          </p>

          <dl className="mt-5 grid grid-cols-2 border-y border-ink/15 text-sm sm:grid-cols-4">
            {[
              [CalendarDays, "Date", "4 August 2026"],
              [MapPin, "Location", "European side"],
              [Users, "Who", "Girls only"],
              [CircleCheck, "Fee", "100 TL"],
            ].map(([Icon, label, value], index) => {
              const FactIcon = Icon as typeof CalendarDays;
              return (
                <div
                  key={label as string}
                  className={`min-w-0 py-3 ${index % 2 ? "border-l border-ink/15 pl-3" : "pr-3"} ${index > 1 ? "border-t border-ink/15 sm:border-t-0" : ""} sm:border-l sm:border-ink/15 sm:px-3 sm:first:border-l-0 sm:first:pl-0`}
                >
                  <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-ink/45">
                    <FactIcon
                      size={13}
                      className="shrink-0 text-coral"
                      aria-hidden="true"
                    />
                    {label as string}
                  </dt>
                  <dd className="mt-1 font-semibold leading-snug">
                    {value as string}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-2 text-xs text-ink/60">
            No experience needed · Tea and snacks included · Limited places
          </p>
          <aside className="mt-4 border-l-2 border-coral bg-paper/70 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-coral">
              A little invitation
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{freeMessage}</p>
            <p className="mt-1 text-xs text-ink/55">
              The 100 TL participation fee only helps cover tea and snacks.
            </p>
          </aside>

          <div className="mt-5 border-t border-ink/15 pt-5">
            {status === "success" ? (
              <div role="status" aria-live="polite">
                <div className="flex items-center gap-2 text-coral">
                  <CircleCheck size={20} aria-hidden="true" />
                  <h3 className="font-serif text-2xl text-ink">
                    Your event note is on its way.
                  </h3>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
                  Check your inbox for the painting day details. To reserve your
                  place and receive the exact park and meeting time, continue
                  with Aida on WhatsApp.
                </p>
                {emailWarning && (
                  <p className="mt-3 text-sm font-semibold text-coral">
                    Your interest has been registered, but the event email may
                    be delayed. You can contact Aida directly to continue.
                  </p>
                )}
                <p className="mt-3 text-sm font-bold text-coral">
                  {isFree
                    ? "You received one of the complimentary places."
                    : "The participation fee is 100 TL and only helps cover tea and snacks."}
                </p>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-primary mt-4"
                  >
                    <MessageCircle size={17} aria-hidden="true" /> Contact Aida
                    to reserve my place
                  </a>
                )}
                <p className="mt-3 text-xs font-semibold text-ink/55">
                  Your place is not reserved until Aida confirms it with you
                  personally.
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-serif text-2xl">
                  Interested in joining us?
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  Leave your email to receive Aida’s event note and continue
                  your registration.
                </p>
                <form onSubmit={submit} noValidate className="mt-3">
                  <label
                    htmlFor="istanbul-event-email"
                    className="mb-2 block text-sm font-semibold"
                  >
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
                        status === "error" ? "istanbul-event-error" : undefined
                      }
                      className="min-h-12 min-w-0 border border-ink/20 bg-paper px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="button-primary min-h-12 justify-center disabled:cursor-wait disabled:opacity-70"
                    >
                      {status === "loading"
                        ? "Sending…"
                        : "Send me the event details"}
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
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink/55">
                    Free to join the Studio Letter. Occasional stories, studio
                    updates and early access only.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink/55">
                    By submitting, you agree to receive the event email and
                    occasional Studio Letter updates from Aida. You can
                    unsubscribe at any time.
                  </p>
                </form>
                <p className="mt-3 text-xs font-semibold text-ink/55">
                  Submitting your email registers your interest. Your place is
                  confirmed personally with Aida on WhatsApp.
                </p>
              </>
            )}
          </div>
        </article>

        <figure className="relative rotate-[.45deg] border-[9px] border-b-[36px] border-[#fffdf8] bg-[#fffdf8] shadow-[0_12px_26px_rgba(49,38,26,.16)] motion-reduce:rotate-0">
          <div className="absolute -left-3 -top-3 z-10 bg-coral px-3 py-2 text-center text-[10px] font-bold uppercase leading-tight tracking-[.12em] text-white shadow-sm">
            4 AUG
            <br />
            ISTANBUL
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
          <figcaption className="px-2 pt-2 font-hand text-base text-ink/65">
            A summer afternoon for painting together.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
