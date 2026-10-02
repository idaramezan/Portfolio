import { useState } from "react";

type Kind = "artwork" | "moving_image";

export default function EnquiryForm({
  kind,
  subjectId,
  subjectName,
}: {
  kind: Kind;
  subjectId?: string;
  subjectName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="enquiry-success" role="status">
        <h2>Thank you.</h2>
        <p>
          {kind === "artwork"
            ? "Aida will get back to you personally with availability, shipping and collection details."
            : "Aida will read through your project and get back to you personally."}
        </p>
      </div>
    );
  return (
    <form
      className="enquiry-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const body = Object.fromEntries(form.entries());
        if (kind === "moving_image") {
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
          Name
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" required type="email" autoComplete="email" />
        </label>
        {kind === "artwork" ? (
          <>
            <label>
              Country
              <input name="country" required autoComplete="country-name" />
            </label>
          </>
        ) : (
          <>
            <fieldset className="enquiry-form__duration">
              <legend>Desired duration</legend>
              <div>
                <label>
                  <span className="sr-only">Minutes</span>
                  <span className="form-field-with-suffix">
                    <input
                      name="desiredDurationMinutes"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="999"
                      step="1"
                      defaultValue="0"
                      aria-label="Desired duration minutes"
                    />
                    <span>min</span>
                  </span>
                </label>
                <label>
                  <span className="sr-only">Seconds</span>
                  <span className="form-field-with-suffix">
                    <input
                      name="desiredDurationSeconds"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="59"
                      step="1"
                      defaultValue="0"
                      aria-label="Desired duration seconds"
                    />
                    <span>sec</span>
                  </span>
                </label>
              </div>
            </fieldset>
            <label>
              Target release / deadline
              <input name="deadline" type="date" />
            </label>
            <label>
              Budget in USD
              <span className="form-field-with-prefix">
                <span aria-hidden="true">$</span>
                <input
                  name="budgetRange"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="0"
                />
              </span>
            </label>
            <label className="enquiry-form__wide">
              Reference links
              <textarea name="referenceLinks" rows={3} />
            </label>
          </>
        )}
      </div>
      <label className="enquiry-form__message">
        {kind === "artwork"
          ? "Message (optional)"
          : "Tell me about the project"}
        <textarea name="message" rows={6} required={kind === "moving_image"} />
      </label>
      {error && (
        <p role="alert" className="enquiry-form__error">
          {error}
        </p>
      )}
      <button className="button-primary" disabled={busy}>
        {busy
          ? "Sending…"
          : kind === "artwork"
            ? "Send artwork request"
            : "Send creative enquiry"}
      </button>
    </form>
  );
}
