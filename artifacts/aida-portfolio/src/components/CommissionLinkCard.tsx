import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics";
import commissionImage from "@assets/oil-pastel-commission-card.jpg";
import digitalCatsImage from "@assets/digital-commission-cats.jpg";
import digitalCharacterImage from "@assets/digital-commission-character.jpg";

const ETSY_URL =
  "https://www.etsy.com/listing/4546787742/custom-oil-pastel-portrait-from-photo";
type CommissionMedium = "oil-pastel" | "digital";
const media = {
  "oil-pastel": {
    label: "Oil pastel",
    description: "A handmade physical artwork drawn with oil pastels.",
  },
  digital: {
    label: "Digital art",
    description:
      "A textured digital drawing in Aida's expressive sketch style.",
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
      <div
        className="commission-link-card__gallery"
        aria-label={tr ? "Sipariş örnekleri" : "Commission examples"}
      >
        {activeMedium === "oil-pastel" ? (
          <img
            src={commissionImage}
            alt="Oil pastel commission examples by Aida"
            width="1090"
            height="1600"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div>
            <img
              src={digitalCatsImage}
              alt="Digital drawing of two cats"
              width="1169"
              height="1800"
              loading="lazy"
              decoding="async"
            />
            <img
              src={digitalCharacterImage}
              alt="Digital character illustration"
              width="1076"
              height="1349"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </div>
    </section>
  );
}
