import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale";

export type PublicEvent = Record<string, any> & {
  id: string;
  slug: string;
  status: string;
  remainingSeats: number;
  bookable: boolean;
  gallery: any[];
  reviews: any[];
};
const copy = {
  en: {
    eyebrow: "PAINT, MEET, REMEMBER",
    title: "Events from Aida’s studio",
    intro:
      "Small creative gatherings in Istanbul, made for slowing down, meeting kind people and leaving with a memory.",
    now: "Current & upcoming",
    past: "Past events",
    empty: "No event is open for booking today.",
    emptyBody:
      "Join the free Newsletter and you’ll hear when the next studio day opens.",
    details: "View event details",
    book: "I’m interested in joining",
    full: "Fully booked",
    places: "places remaining",
    archive: "See the memories",
  },
  tr: {
    eyebrow: "BOYA, TANIŞ, HATIRLA",
    title: "Aida’nın stüdyosundan etkinlikler",
    intro:
      "İstanbul’da yavaşlamak, güzel insanlarla tanışmak ve bir anıyla ayrılmak için küçük yaratıcı buluşmalar.",
    now: "Güncel ve yaklaşan",
    past: "Geçmiş etkinlikler",
    empty: "Bugün rezervasyona açık bir etkinlik yok.",
    emptyBody:
      "Ücretsiz Bültene katıl; sıradaki stüdyo günü açıldığında ilk sen duy.",
    details: "Etkinlik detayları",
    book: "Katılmak istiyorum",
    full: "Kontenjan doldu",
    places: "yer kaldı",
    archive: "Anıları gör",
  },
} as const;
export function eventText(e: any, key: string, locale: string) {
  return e[`${key}_${locale}`] || e[`${key}_en`] || "";
}
function EventCard({
  event,
  finished = false,
}: {
  event: PublicEvent;
  finished?: boolean;
}) {
  const { locale } = useLocale(),
    c = copy[locale];
  return (
    <article className="events-card">
      <div className="events-card-media">
        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.image_alt_text || eventText(event, "title", locale)}
          />
        )}
      </div>
      <div className="events-card-copy">
        <p className="events-date">
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: event.timezone || "Europe/Istanbul",
          }).format(new Date(event.event_start_at))}
        </p>
        <h3>{eventText(event, "title", locale)}</h3>
        <p>
          {eventText(
            event,
            finished ? "recap_text" : "short_description",
            locale,
          ) || eventText(event, "description", locale)}
        </p>
        <p className="events-facts">
          {event.location_text_tr && eventText(event, "location_text", locale)}{" "}
          ·{" "}
          {event.participation_price_try
            ? `${event.participation_price_try} ${event.currency || "TRY"}`
            : locale === "tr"
              ? "Ücretsiz"
              : "Free"}
        </p>
        {!finished && (
          <strong>
            {event.bookable ? `${event.remainingSeats} ${c.places}` : c.full}
          </strong>
        )}
        <Link className="events-button" href={`/events/${event.slug}`}>
          {finished ? c.archive : c.details} →
        </Link>
      </div>
    </article>
  );
}
export default function Events() {
  const { locale } = useLocale(),
    c = copy[locale];
  const [data, setData] = useState<{
    current: PublicEvent[];
    upcoming: PublicEvent[];
    finished: PublicEvent[];
  } | null>(null);
  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData({ current: [], upcoming: [], finished: [] }));
  }, []);
  const open = [...(data?.current || []), ...(data?.upcoming || [])];
  return (
    <main className="events-page">
      <header className="events-hero">
        <p>{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <div>{c.intro}</div>
      </header>
      <section className="events-section">
        <h2>{c.now}</h2>
        {!data ? (
          <p>Loading…</p>
        ) : open.length ? (
          <div className="events-grid">
            {open.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="events-empty">
            <h3>{c.empty}</h3>
            <p>{c.emptyBody}</p>
            <Link className="events-button" href="/newsletter">
              {locale === "tr" ? "Bültene katıl" : "Join the Newsletter"} →
            </Link>
          </div>
        )}
      </section>
      {Boolean(data?.finished.length) && (
        <section className="events-section events-archive">
          <h2>{c.past}</h2>
          <div className="events-grid">
            {data!.finished.map((e) => (
              <EventCard key={e.id} event={e} finished />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
