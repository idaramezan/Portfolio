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
            <label>
              Artist / band / brand
              <input name="organisation" required />
            </label>
            <label>
              Project type
              <select name="projectType" required defaultValue="">
                <option value="" disabled>
                  Select one
                </option>
                <option>Music video</option>
                <option>Animated visual</option>
                <option>Loop / visualizer</option>
                <option>Short animation</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Track / project link
              <input name="projectLink" type="url" />
            </label>
            <label>
              Desired duration
              <input name="desiredDuration" />
            </label>
            <label>
              Target release / deadline
              <input name="deadline" type="date" />
            </label>
            <label>
              Budget range
              <input name="budgetRange" />
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
