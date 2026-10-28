import { useState } from "react";
import { useLocale } from "@/lib/locale";

type Kind = "artwork" | "moving_image";

export default function EnquiryForm({
  kind,
  subjectId,
  subjectName,
  variant,
}: {
  kind: Kind;
  subjectId?: string;
  subjectName?: string;
  variant?: "moving";
}) {
  const { locale } = useLocale();
  const tr = locale === "tr";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="enquiry-success" role="status">
        <h2>{kind === "moving_image" ? (tr ? "Projeniz stüdyoya ulaştı." : "Your project found its way to the studio.") : "Thank you."}</h2>
        <p>
          {kind === "artwork"
            ? "Aida will get back to you personally with availability, shipping and collection details."
            : tr ? "Anlattığınız için teşekkürler. Verdiğiniz e-posta adresinden size dönüş yapacağım." : "Thanks for telling me about it. I’ll get back to you using the email you provided."}
        </p>
      </div>
    );
  return (
    <form
      className={`enquiry-form${variant ? ` enquiry-form--${variant}` : ""}`}
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const body = Object.fromEntries(form.entries());
        if (body.website) return;
        if (kind === "moving_image" && (body.desiredDurationMinutes || body.desiredDurationSeconds)) {
          const minutes = Number(body.desiredDurationMinutes || 0);
          const seconds = Number(body.desiredDurationSeconds || 0);
          body.desiredDuration = `${minutes} min ${seconds} sec`;
          delete body.desiredDurationMinutes;
          delete body.desiredDurationSeconds;
        }
        try {
          const response = await fetch("/api/enquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...body,
              type: kind,
              subjectId,
              subjectName,
              subjectUrl: window.location.href,
            }),
          });
          const payload = await response.json();
          if (!response.ok)
            throw new Error(payload.error || "Your request could not be sent.");
          setDone(true);
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Your request could not be sent.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="enquiry-form__grid">
        <label>
          {tr ? "Adınız" : "Name"}
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          {tr ? "E-posta" : "Email"}
          <input name="email" required type="email" autoComplete="email" />
        </label>
        {kind === "artwork" ? (
          <>
            <label>
              {tr ? "Proje türü" : "Project type"}
              <select name="projectType" required defaultValue="">
                <option value="" disabled>{tr ? "Seçin" : "Choose one"}</option>
                <option>Music Video</option><option>Animated Loop</option><option>Music Visual</option><option>Illustration + Animation</option><option>Social / Promotional Animation</option><option>Other</option>
              </select>
            </label>
            <label>
              {tr ? "Sanatçı / Grup / Şirket" : "Artist / Band / Company"}
              <input name="organisation" autoComplete="organization" />
            </label>
            <label>
              Country
              <input name="country" required autoComplete="country-name" />
            </label>
          </>
        ) : (
          <>
            <label>
              {tr ? "Hedef süre" : "Target duration"}
              <input name="desiredDuration" placeholder={tr ? "örn. 30 saniye" : "e.g. 30 seconds"} />
            </label>
            <label>
              {tr ? "Hedef tarih" : "Desired deadline"}
              <input name="deadline" type="date" />
            </label>
            <label>
              {tr ? "Bütçe aralığı" : "Budget range"}
              <select name="budgetRange" defaultValue="Not sure yet"><option>Not sure yet</option><option>Under $300</option><option>$300–$700</option><option>$700–$1,500</option><option>$1,500+</option><option>Let's discuss</option></select>
            </label>
            <label className="enquiry-form__wide">
              {tr ? "Referans / Drive / YouTube / Spotify bağlantısı" : "Reference / Drive / YouTube / Spotify link"}
              <input name="referenceLinks" type="url" inputMode="url" placeholder="https://" />
            </label>
          </>
        )}
      </div>
      <label className="enquiry-form__message">
        {kind === "artwork"
          ? "Message (optional)"
          : tr ? "Projeyi anlatın" : "Tell me about the project"}
        <textarea name="message" rows={6} required={kind === "moving_image"} />
      </label>
      {error && (
        <p role="alert" className="enquiry-form__error">
          {error}
        </p>
      )}
      <label className="enquiry-form__honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="button-primary" disabled={busy}>
        {busy
          ? "Sending…"
          : kind === "artwork"
            ? "Send artwork request"
            : tr ? "PROJE TALEBİ GÖNDER →" : "SEND PROJECT ENQUIRY →"}
      </button>
    </form>
  );
}
