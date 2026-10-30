import { useMemo, useState } from "react";
import { useLocale } from "@/lib/locale";
import { COUNTRY_CODES } from "@/lib/shipping-destination";

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
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      name: names.of(code) || code,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="enquiry-success" role="status">
        <h2>{kind === "moving_image" ? (tr ? "Projeniz stüdyoya ulaştı." : "Your project found its way to the studio.") : "Thank you."}</h2>
        <p>
          {kind === "artwork"
            ? "The artist will contact you by email with availability and artwork details."
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
      {kind === "moving_image" ? <>
        <div className="enquiry-form__grid enquiry-form__grid--commission">
          <label><span className="sr-only">{tr ? "Adınız" : "Name"}</span><input name="name" required autoComplete="name" aria-label={tr ? "Adınız" : "Name"} placeholder={tr ? "AD" : "NAME"} /></label>
          <label><span className="sr-only">{tr ? "E-posta" : "Email"}</span><input name="email" required type="email" autoComplete="email" aria-label={tr ? "E-posta" : "Email"} placeholder={tr ? "E-POSTA" : "EMAIL"} /></label>
          <label><span className="sr-only">{tr ? "Bütçe aralığı" : "Budget range"}</span><select name="budgetRange" aria-label={tr ? "Bütçe aralığı" : "Budget range"} defaultValue=""><option value="" disabled>{tr ? "BÜTÇE ARALIĞI" : "BUDGET RANGE"}</option><option>Not sure yet</option><option>Under $300</option><option>$300–$700</option><option>$700–$1,500</option><option>$1,500+</option><option>Let's discuss</option></select></label>
          <label><span className="sr-only">{tr ? "Talep" : "Request"}</span><select name="projectType" required aria-label={tr ? "Talep" : "Request"} defaultValue=""><option value="" disabled>{tr ? "TALEP" : "REQUEST"}</option><option value="Illustration">{tr ? "İllüstrasyon" : "Illustration"}</option><option value="Animation">{tr ? "Animasyon" : "Animation"}</option></select></label>
        </div>
        <label className="enquiry-form__message"><span className="sr-only">{tr ? "Projeyi anlatın" : "About project"}</span><textarea name="message" rows={6} required aria-label={tr ? "Projeyi anlatın" : "About project"} placeholder={tr ? "PROJE HAKKINDA" : "ABOUT PROJECT"} /></label>
      </> : <>
        <div className="enquiry-form__grid">
          <label>{tr ? "Ad soyad" : "Full name"}<input name="name" required autoComplete="name" /></label>
          <label>{tr ? "E-posta" : "Email"}<input name="email" required type="email" autoComplete="email" /></label>
          {kind === "artwork" && (
            <label>
              {tr ? "Ülke" : "Country"}
              <select name="country" required defaultValue="" autoComplete="country-name">
                <option value="" disabled>{tr ? "Ülke seçin" : "Choose a country"}</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="enquiry-form__message">{tr ? "Not (isteğe bağlı)" : "Note (optional)"}<textarea name="message" rows={6} /></label>
      </>}
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
            : "SUBMIT"}
      </button>
    </form>
  );
}
