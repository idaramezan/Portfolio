import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics";

const COMMISSION_IMAGE = "/assets/commission-order-your-unique-art.png";

const ETSY_URL =
  "https://www.etsy.com/listing/4546787742/custom-oil-pastel-portrait-from-photo";
type CommissionMedium = "oil-pastel" | "digital";
const media = {
  "oil-pastel": {
    label: "Oil pastel",
    description: "A handmade physical artwork created in oil pastel.",
  },
  digital: {
    label: "Digital art",
    description:
      "A custom digital artwork created from your idea or reference.",
  },
} as const;

export default function CommissionLinkCard({
  locale,
  compactMobile = false,
}: {
  locale: "en" | "tr";
  compactMobile?: boolean;
}) {
  const [activeMedium, setActiveMedium] =
    useState<CommissionMedium>("oil-pastel");
  const tr = locale === "tr";
  return (
    <section
      className={`commission-link-card commission-link-card--editorial ${compactMobile ? "commission-link-card--links-mobile" : ""}`}
    >
      <div className="commission-link-card__intro">
        <p className="eyebrow">{tr ? "ÖZEL SİPARİŞ" : "COMMISSION"}</p>
        <h2>
          {tr ? (
            <>
              Aklında bir şey
              <br />
              var mı?
            </>
          ) : (
            <>
              Have something
              <br />
              in mind?
            </>
          )}
        </h2>
        <p className="commission-link-card__body">
          {tr
            ? "Bir fotoğraf, karakter, yer veya fikirden yola çıkarak senin için hazırlanan kişisel bir eser."
            : "A personal piece made from a photograph, character, place or idea."}
        </p>
        <div
          className="commission-link-card__selectors"
          aria-label={
            tr ? "Sipariş tekniğini seç" : "Choose a commission medium"
          }
        >
          {(Object.keys(media) as CommissionMedium[]).map((medium) => (
            <button
              key={medium}
              type="button"
              aria-pressed={activeMedium === medium}
              onClick={() => setActiveMedium(medium)}
            >
              {media[medium].label}
            </button>
          ))}
        </div>
        <p className="commission-link-card__medium-copy" aria-live="polite">
          {media[activeMedium].description}
        </p>
        <a
          href={ETSY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="home-green-button"
          onClick={() =>
            trackAnalytics("commission_etsy_click", {
              metadata: {
                source: compactMobile ? "links_page" : "home",
                destination: "etsy",
                type: activeMedium,
              },
            })
          }
        >
          {tr ? "Siparişe başla" : "Start a commission"}{" "}
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <div className="commission-link-card__gallery">
        <img
          src={COMMISSION_IMAGE}
          alt={
            tr
              ? "Kendine özgü sanat eserini sipariş et"
              : "Order your unique art"
          }
          width="1080"
          height="1080"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
