import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/locale";
import { eventText, type PublicEvent } from "./Events";
import { trackAnalytics } from "@/lib/analytics";
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
  return (
    <main className="event-detail">
      <Link href="/events">
        ← {locale === "tr" ? "Tüm etkinlikler" : "All events"}
      </Link>
      <header>
        {event.image_url && (
          <img src={event.image_url} alt={event.image_alt_text} />
        )}
        <div>
          <p className="events-date">
            {new Date(event.event_start_at).toLocaleString(locale)}
          </p>
          <h1>{eventText(event, "title", locale)}</h1>
          <p>
            {eventText(event, "full_description", locale) ||
              eventText(event, "description", locale)}
          </p>
          <p>
            {eventText(event, "location_text", locale)} ·{" "}
            {event.audience?.replaceAll("_", " ")}
          </p>
          {event.bookable ? (
            <Link
              className="events-button"
              href={`/events/${event.id}/apply`}
              onClick={() =>
                trackAnalytics("event_booking_click", {
                  metadata: { eventId: event.id },
                })
              }
            >
              {locale === "tr"
                ? "Katılmak istiyorum"
                : "I’m interested in joining"}{" "}
              →
            </Link>
          ) : (
            !completed && (
              <strong>
                {locale === "tr"
                  ? "Kontenjan dolu veya rezervasyon kapalı"
                  : "Fully booked or booking closed"}
              </strong>
            )
          )}
        </div>
      </header>
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
                <cite>— {r.display_name}</cite>
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
