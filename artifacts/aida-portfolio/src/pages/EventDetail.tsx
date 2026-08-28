import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/locale";
import { eventText, type PublicEvent } from "./Events";
import { trackAnalytics } from "@/lib/analytics";
import { ArrowLeft, Banknote, CalendarDays, MapPin, Users } from "lucide-react";
export default function EventDetail({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const [event, setEvent] = useState<PublicEvent | null>();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) => setEvent(x.event))
      .catch(() => setEvent(null));
  }, [slug]);
  useEffect(() => {
    if (event?.id)
      trackAnalytics(
        event.status === "completed"
          ? "finished_event_open"
          : "event_page_view",
        { metadata: { eventId: event.id, status: event.status } },
      );
  }, [event?.id]);
  useEffect(() => {
    if (lightbox === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
        trigger.current?.focus();
      }
      if (e.key === "ArrowRight")
        setLightbox((i) =>
          i === null ? null : (i + 1) % event!.gallery.length,
        );
      if (e.key === "ArrowLeft")
        setLightbox((i) =>
          i === null
            ? null
            : (i - 1 + event!.gallery.length) % event!.gallery.length,
        );
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [lightbox, event]);
  if (event === undefined)
    return (
      <main className="events-page">
        <p>Loading…</p>
      </main>
    );
  if (!event)
    return (
      <main className="events-page">
        <h1>{locale === "tr" ? "Etkinlik bulunamadı" : "Event not found"}</h1>
      </main>
    );
  const completed = event.status === "completed";
  const date = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: event.timezone || "Europe/Istanbul",
  }).format(new Date(event.event_start_at));
  const bookingOpens = event.booking_open_at
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: event.timezone || "Europe/Istanbul",
      }).format(new Date(event.booking_open_at))
    : null;
  const audience = {
    en: {
      girls_only: "Women only",
      boys_only: "Men only",
      everyone: "Everyone welcome",
    },
    tr: {
      girls_only: "Yalnızca kadınlar",
      boys_only: "Yalnızca erkekler",
      everyone: "Herkes katılabilir",
    },
  }[locale][event.audience as "girls_only" | "boys_only" | "everyone"];
  const bookingMessage =
    event.bookingState === "fully_booked"
      ? locale === "tr"
        ? "Bu etkinliğin kontenjanı doldu."
        : "This event is fully booked."
      : event.bookingState === "not_open"
        ? locale === "tr"
          ? `Başvurular ${bookingOpens} tarihinde açılacak.`
          : `Applications open ${bookingOpens}.`
        : locale === "tr"
          ? "Bu etkinlik için başvurular kapandı."
          : "Applications for this event are closed.";
  return (
    <main className="event-detail">
      <Link href="/events" className="event-detail__back">
        <ArrowLeft size={17} aria-hidden="true" />
        {locale === "tr" ? "Tüm etkinlikler" : "All events"}
      </Link>
      <header className="event-detail__hero">
        <figure className="event-detail__image">
          {event.image_url ? (
            <img src={event.image_url} alt={event.image_alt_text} />
          ) : (
            <div aria-hidden="true" />
          )}
        </figure>
        <div className="event-detail__content">
          <p className="eyebrow">
            {eventText(event, "eyebrow", locale) ||
              (locale === "tr" ? "AIDA İLE BULUŞ" : "MEET WITH AIDA")}
          </p>
          <h1>{eventText(event, "title", locale)}</h1>
          <p className="event-detail__intro">
            {eventText(event, "short_description", locale) ||
              eventText(event, "description", locale)}
          </p>
          <dl className="event-detail__facts">
            <div>
              <dt>
                <CalendarDays aria-hidden="true" />
              </dt>
              <dd>
                <small>
                  {locale === "tr" ? "Tarih ve saat" : "Date & time"}
                </small>
                <strong>{date}</strong>
              </dd>
            </div>
            <div>
              <dt>
                <MapPin aria-hidden="true" />
              </dt>
              <dd>
                <small>{locale === "tr" ? "Konum" : "Location"}</small>
                <strong>{eventText(event, "location_text", locale)}</strong>
              </dd>
            </div>
            <div>
              <dt>
                <Users aria-hidden="true" />
              </dt>
              <dd>
                <small>{locale === "tr" ? "Katılım" : "Who can join"}</small>
                <strong>{audience}</strong>
              </dd>
            </div>
            <div>
              <dt>
                <Banknote aria-hidden="true" />
              </dt>
              <dd>
                <small>
                  {locale === "tr" ? "Katılım ücreti" : "Participation"}
                </small>
                <strong>
                  {Number(event.participation_price_try) > 0
                    ? `${event.participation_price_try} ${event.currency || "TRY"}`
                    : locale === "tr"
                      ? "Ücretsiz"
                      : "Free"}
                </strong>
              </dd>
            </div>
          </dl>
          {event.bookable ? (
            <div className="event-detail__booking">
              <p>
                <strong>{event.remainingSeats}</strong>{" "}
                {locale === "tr"
                  ? "yer kaldı"
                  : event.remainingSeats === 1
                    ? "place remaining"
                    : "places remaining"}
              </p>
              <Link
                className="events-button"
                href={`/events/${event.id}/apply`}
                onClick={() =>
                  trackAnalytics("event_booking_click", {
                    metadata: { eventId: event.id },
                  })
                }
              >
                {locale === "tr" ? "Katılmak için başvur" : "Apply to join"} →
              </Link>
              <small>
                {locale === "tr"
                  ? "Başvurun Aida tarafından incelendikten sonra yerin e-posta ile onaylanır."
                  : "Aida reviews each application and confirms your place by email."}
              </small>
            </div>
          ) : (
            !completed && (
              <p className="event-detail__unavailable" role="status">
                {bookingMessage}
              </p>
            )
          )}
        </div>
      </header>
      {!completed && eventText(event, "full_description", locale) && (
        <section className="event-detail__story">
          <p className="eyebrow">
            {locale === "tr" ? "BİLMEN GEREKENLER" : "WHAT TO EXPECT"}
          </p>
          <h2>
            {locale === "tr" ? "Günün ayrıntıları" : "A little about the day"}
          </h2>
          <p>{eventText(event, "full_description", locale)}</p>
        </section>
      )}
      {completed && eventText(event, "recap_text", locale) && (
        <section>
          <h2>{locale === "tr" ? "O günden" : "From the day"}</h2>
          <p>{eventText(event, "recap_text", locale)}</p>
        </section>
      )}
      {event.gallery?.length > 0 && (
        <section>
          <h2>{locale === "tr" ? "Galeri" : "Gallery"}</h2>
          <div className="event-gallery">
            {event.gallery.map((image: any, i: number) => (
              <button
                key={image.id}
                ref={i === lightbox ? trigger : undefined}
                onClick={(e) => {
                  trigger.current = e.currentTarget;
                  setLightbox(i);
                  trackAnalytics("event_gallery_open", {
                    metadata: { eventId: event.id },
                  });
                }}
              >
                <img src={image.image_url} alt={image.alt_text} />
              </button>
            ))}
          </div>
        </section>
      )}
      {event.reviews?.length > 0 && (
        <section>
          <h2>
            {locale === "tr" ? "Katılımcılardan" : "From attendees"} ·{" "}
            {event.ratingSummary.average.toFixed(1)} ★
          </h2>
          <div className="event-reviews">
            {event.reviews.map((r: any) => (
              <blockquote key={r.id}>
                <div aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}
                </div>
                <p>“{r.comment}”</p>
                <cite>· {r.display_name}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      )}
      {completed && (
        <section className="events-empty">
          <h2>
            {locale === "tr"
              ? "Sıradaki buluşmayı kaçırma"
              : "Don’t miss the next gathering"}
          </h2>
          <p>
            {locale === "tr"
              ? "Yeni etkinlikleri ilk duyanlardan olmak için ücretsiz Bültene katıl."
              : "Join the free Newsletter to hear when the next studio event opens."}
          </p>
          <Link className="events-button" href="/newsletter">
            {locale === "tr" ? "Bültene katıl" : "Join the Newsletter"} →
          </Link>
        </section>
      )}
      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="event-lightbox"
          onClick={() => setLightbox(null)}
        >
          <button aria-label="Close">×</button>
          <img
            src={event.gallery[lightbox].image_url}
            alt={event.gallery[lightbox].alt_text}
          />
        </div>
      )}
    </main>
  );
}
