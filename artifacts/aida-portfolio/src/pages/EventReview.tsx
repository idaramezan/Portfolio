import { FormEvent, useEffect, useState } from "react";
type Context = {
  eventTitle: string;
  displayName: string;
  locale: "en" | "tr";
  csrfToken: string;
};
export default function EventReview({ token }: { token: string }) {
  const [context, setContext] = useState<Context | null>();
  const [rating, setRating] = useState(0),
    [name, setName] = useState(""),
    [comment, setComment] = useState(""),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.append(meta);
    fetch(`/api/events/review/${encodeURIComponent(token)}`, {
      referrerPolicy: "no-referrer",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x: Context) => {
        setContext(x);
        setName(x.displayName);
      })
      .catch(() => setContext(null));
    return () => meta.remove();
  }, [token]);
  if (context === undefined)
    return <main className="review-page">Loading…</main>;
  if (!context)
    return (
      <main className="review-page">
        <h1>This private review link is no longer active.</h1>
      </main>
    );
  const tr = context.locale === "tr";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const response = await fetch(
      `/api/events/review/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          csrfToken: context!.csrfToken,
          displayName: name,
          rating,
          comment,
          consent,
        }),
      },
    );
    setMessage(
      response.ok
        ? tr
          ? "Teşekkürler. Yorumun Aida’ya ulaştı."
          : "Thank you. Your review has reached Aida."
        : (await response.json()).error || "Please try again.",
    );
  }
  return (
    <main className="review-page">
      <form onSubmit={submit}>
        <p>{tr ? "ÖZEL KATILIMCI BAĞLANTISI" : "PRIVATE ATTENDEE LINK"}</p>
        <h1>
          {tr
            ? `${context.eventTitle} anını paylaş`
            : `Share your ${context.eventTitle} memory`}
        </h1>
        <fieldset>
          <legend>{tr ? "Puan" : "Rating"}</legend>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              key={n}
            >
              ★
            </button>
          ))}
        </fieldset>
        <label>
          {tr ? "Görünen ad" : "Display name"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
        </label>
        <label>
          {tr ? "Deneyimin" : "Your experience"}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            minLength={10}
            maxLength={1000}
            required
          />
        </label>
        <label className="review-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          {tr
            ? "Bu yorumun etkinlik sayfasında gösterilmesine izin veriyorum."
            : "I agree that this review may be shown on the public event page."}
        </label>
        <button className="events-button" disabled={!rating}>
          {tr ? "Yorumu gönder" : "Send review"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </main>
  );
}
