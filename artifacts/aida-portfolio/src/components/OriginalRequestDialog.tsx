import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ManagedProduct } from "@/lib/store";
import {
  COUNTRY_CODES,
  useShippingDestination,
} from "@/lib/shipping-destination";
import { useLocale } from "@/lib/locale";
import { trackAnalytics } from "@/lib/analytics";

export default function OriginalRequestDialog({
  product,
  onClose,
}: {
  product: ManagedProduct | null;
  onClose: () => void;
}) {
  const { destination } = useShippingDestination();
  const { locale } = useLocale();
  const dialog = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    countryCode: destination?.countryCode || "",
    city: "",
    phone: "",
    message: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const countries = COUNTRY_CODES.filter((code) => !["TR", "US"].includes(code))
    .map((code) => ({ code, name: names.of(code) || code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  useEffect(() => {
    if (!product) return;
    setForm((value) => ({
      ...value,
      countryCode: destination?.countryCode || value.countryCode,
    }));
    setError("");
    setSuccess("");
    document.body.style.overflow = "hidden";
    trackAnalytics("original_delivery_request_started", {
      metadata: {
        productId: product.id,
        countryCode: destination?.countryCode || "unknown",
      },
    });
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
    };
  }, [product]);
  if (!product) return null;
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const country = countries.find((item) => item.code === form.countryCode);
      const response = await fetch("/api/checkout/original-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          countryName: country?.name || "",
          productId: product.id,
          language: locale,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccess(result.requestNumber);
      trackAnalytics("original_delivery_request_submitted", {
        metadata: { productId: product.id, countryCode: form.countryCode },
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <div
      className="destination-modal__overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="original-request-title"
        className="destination-modal original-request-modal"
      >
        <button
          type="button"
          className="destination-modal__close"
          onClick={onClose}
          aria-label={locale === "tr" ? "Formu kapat" : "Close request form"}
        >
          <X aria-hidden="true" />
        </button>
        {success ? (
          <>
            <p className="eyebrow">
              {locale === "tr" ? "TALEP GÖNDERİLDİ" : "REQUEST SENT"}
            </p>
            <h2 id="original-request-title">
              {locale === "tr" ? "Talebin bize ulaştı." : "Your request is in."}
            </h2>
            <p>
              {locale === "tr"
                ? "Aida, ödeme yapmadan önce uygunluk ve teslimat ayrıntılarını e-postayla onaylayacak."
                : "Aida will confirm availability and delivery details by email before you make any payment."}
            </p>
            <strong>{success}</strong>
            <button
              type="button"
              className="paper-button paper-button--pink paper-button--md"
              onClick={onClose}
            >
              {locale === "tr" ? "Kapat" : "Close"}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="eyebrow">
              {locale === "tr"
                ? "ULUSLARARASI ORİJİNAL TESLİMATI"
                : "INTERNATIONAL ORIGINAL DELIVERY"}
            </p>
            <h2 id="original-request-title">
              {locale === "tr"
                ? "Teslimat talebi gönder"
                : "Request international delivery"}
            </h2>
            <p>
              {locale === "tr"
                ? "Aida, herhangi bir ödeme yapılmadan önce uygunluk ve kargoyu onaylayacak."
                : "Aida will confirm availability and shipping before any payment is made."}
            </p>
            <div className="original-request-modal__fields">
              <label>
                <span>{locale === "tr" ? "Ad soyad" : "Full name"} *</span>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </label>
              <label>
                <span>E-mail *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
              <label>
                <span>{locale === "tr" ? "Ülke" : "Country"} *</span>
                <select
                  required
                  value={form.countryCode}
                  onChange={(e) => set("countryCode", e.target.value)}
                >
                  <option value="">
                    {locale === "tr" ? "Ülke seç" : "Choose country"}
                  </option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{locale === "tr" ? "Şehir" : "City"} *</span>
                <input
                  required
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </label>
              <label>
                <span>{locale === "tr" ? "Telefon" : "Phone"}</span>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </label>
              <label className="original-request-modal__message">
                <span>{locale === "tr" ? "Mesaj" : "Message"}</span>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-coral">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="paper-button paper-button--pink paper-button--md"
            >
              {busy
                ? locale === "tr"
                  ? "Gönderiliyor…"
                  : "Sending…"
                : locale === "tr"
                  ? "Teslimat talebi gönder"
                  : "Send delivery request"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
