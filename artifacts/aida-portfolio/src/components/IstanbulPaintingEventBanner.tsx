import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  MapPin,
  MessageCircle,
  Sparkles,
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
  "Hello Aida, I joined the Studio Letter through the Istanbul painting day invitation. I would love to confirm my place for the event on 4 August 2026.";

export default function IstanbulPaintingEventBanner() {
  const settings = useShopSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [active, setActive] = useState(() => Date.now() < EVENT_DEADLINE);
  const [freePlacesRemaining, setFreePlacesRemaining] = useState(2);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    fetch(
      `/api/newsletter/event-status?campaignId=${encodeURIComponent(CAMPAIGN_ID)}`,
      { cache: "no-store" },
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
      setIsFree(Boolean(result.event?.isFree));
      setStatus("success");
      if (!result.event?.alreadyRegistered)
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
  const whatsappUrl = /^\d{8,15}$/.test(whatsappNumber)
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;
  const freeMessage =
    freePlacesRemaining >= 2
      ? "The first two people who join through this event form attend for free."
      : freePlacesRemaining === 1
        ? "One free place remains for the next person who joins through this event form."
        : "The two free places have been claimed. Limited places are still available for 100 TL.";

  return (
    <section
      className="border-b border-ink/10 bg-[#f5ecdc]"
      aria-labelledby="istanbul-painting-day-heading"
      data-no-translate
    >
      <div className="section-shell grid items-center gap-8 !py-8 md:!py-12 lg:grid-cols-[1.38fr_1fr] lg:gap-12 lg:!py-14">
        <article className="order-2 min-w-0 lg:order-1">
          <p className="eyebrow text-coral">
            A SUMMER PAINTING DAY IN ISTANBUL
          </p>
          <h2
            id="istanbul-painting-day-heading"
            className="mt-3 max-w-3xl text-3xl leading-tight md:text-4xl"
          >
            Paint, meet and spend a sunny afternoon together.
          </h2>
          <div className="mt-4 max-w-3xl space-y-2 text-sm leading-6 text-ink/70 md:text-[15px]">
            <p>
              On 4 August 2026, Aida is hosting a relaxed girls-only painting
              gathering in a park on Istanbul’s European side.
            </p>
            <p>
              No art experience is needed. This is not a class or workshop. It
              is simply a small outdoor gathering for girls who want to paint,
              meet one another, share tea and enjoy a beautiful summer day
              together.
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 text-sm sm:grid-cols-3">
            {[
              [CalendarDays, "Date", "4 August 2026"],
              [MapPin, "Location", "European side of Istanbul"],
              [Users, "Audience", "Girls only"],
              [Sparkles, "Experience", "No experience needed"],
              [Users, "Availability", "Limited places"],
              [CircleCheck, "Participation", "100 TL participation fee"],
            ].map(([Icon, label, value]) => {
              const FactIcon = Icon as typeof CalendarDays;
              return (
                <div
                  key={label as string}
                  className="min-w-0 bg-paper px-3 py-3"
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
          <p className="mt-3 text-xs text-ink/60">
            The participation fee only helps cover tea and snacks.
          </p>
          <p className="mt-4 border-l-2 border-coral bg-paper/70 px-4 py-3 text-sm font-bold text-ink">
            {freeMessage}
          </p>

          <div className="mt-5 border-t border-ink/15 pt-5">
            {status === "success" ? (
              <div role="status" aria-live="polite">
                <div className="flex items-center gap-2 text-coral">
                  <CircleCheck size={20} aria-hidden="true" />
                  <h3 className="font-serif text-2xl text-ink">
                    You’re on the event list.
                  </h3>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
                  Check your inbox for Aida’s event note. You can then message
                  her on WhatsApp to confirm your place and receive the exact
                  park and time details.
                </p>
                {isFree && (
                  <p className="mt-3 text-sm font-bold text-coral">
                    Your event note confirms that your 100 TL participation fee
                    is fully covered.
                  </p>
                )}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-primary mt-4"
                  >
                    <MessageCircle size={17} aria-hidden="true" /> Message Aida
                    on WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <>
                <h3 className="font-serif text-2xl">Interested in joining?</h3>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  Join the free Studio Letter to receive the event email and
                  continue your registration with Aida.
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
                      ref={inputRef}
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
                    Free to join. You will also receive occasional stories,
                    studio news and early access from Aida.
                  </p>
                </form>
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="mt-2 text-left text-xs text-ink/60 underline decoration-coral underline-offset-4 focus-visible:ring-2 focus-visible:ring-coral"
                >
                  Already receive the Studio Letter? You can still register your
                  interest here.
                </button>
                <p className="mt-3 text-xs font-semibold text-ink/55">
                  Submitting this form registers your interest. Your place is
                  confirmed personally with Aida on WhatsApp.
                </p>
              </>
            )}
          </div>
        </article>

        <figure className="order-1 border-[9px] border-b-[36px] border-[#fffdf8] bg-[#fffdf8] shadow-[0_12px_26px_rgba(49,38,26,.16)] lg:order-2">
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
