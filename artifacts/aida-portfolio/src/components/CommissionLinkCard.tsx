import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics";
import commissionImage from "@assets/oil-pastel-commission-card.jpg";
import digitalCatsImage from "@assets/digital-commission-cats.jpg";
import digitalCharacterImage from "@assets/digital-commission-character.jpg";

const ETSY_URL =
  "https://www.etsy.com/listing/4546787742/custom-oil-pastel-portrait-from-photo";

type CommissionMedium = "oil-pastel" | "digital";

const media: Record<
  CommissionMedium,
  { label: string; description: string; metadata: string }
> = {
  "oil-pastel": {
    label: "Oil Pastel",
    description: "A handmade physical artwork drawn with oil pastels.",
    metadata: "PHYSICAL ORIGINAL",
  },
  digital: {
    label: "Digital Art",
    description:
      "Textured digital drawings made in Aida's expressive sketch style.",
    metadata: "DIGITAL COMMISSION",
  },
};

export default function CommissionLinkCard({
  compactMobile = false,
}: {
  locale: "en" | "tr";
  compactMobile?: boolean;
}) {
  const [activeMedium, setActiveMedium] =
    useState<CommissionMedium>("oil-pastel");
  const active = media[activeMedium];

  return (
    <section
      className={`commission-link-card ${compactMobile ? "commission-link-card--links-mobile" : ""}`}
    >
      <div className="commission-link-card__note" aria-hidden="true">
        <Sparkles /> made just for you ♡
      </div>

      <div className="commission-link-card__intro">
        <p className="eyebrow">CUSTOM ART COMMISSIONS</p>
        <h2>Have something you want me to make?</h2>
        <p className="commission-link-card__body">
          Turn a photo, pet, character, place or idea into a piece made
          especially for you.
        </p>
      </div>

      <div
        className="commission-link-card__gallery"
        aria-label="Commission examples"
      >
        <div
          className="commission-link-card__pastel"
          data-active={activeMedium === "oil-pastel" || undefined}
        >
          <img
            src={commissionImage}
            alt="Selection of colorful oil pastel artworks available as custom commissions"
            width="1090"
            height="1600"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div
          className="commission-link-card__digital"
          data-active={activeMedium === "digital" || undefined}
        >
          <img
            src={digitalCatsImage}
            alt="Textured monochrome digital drawing of two cats sitting together"
            width="1169"
            height="1800"
            loading="lazy"
            decoding="async"
          />
          <img
            src={digitalCharacterImage}
            alt="Textured monochrome digital character illustration with cat-like features"
            width="1076"
            height="1349"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div
        className="commission-link-card__selectors"
        aria-label="Choose a commission medium"
      >
        {(Object.keys(media) as CommissionMedium[]).map((medium, index) => (
          <button
            key={medium}
            type="button"
            className={`commission-link-card__selector commission-link-card__selector--${medium}`}
            aria-pressed={activeMedium === medium}
            onClick={() => setActiveMedium(medium)}
          >
            <small>0{index + 1}</small>
            <span>{media[medium].label}</span>
          </button>
        ))}
      </div>

      <div className="commission-link-card__medium-copy" aria-live="polite">
        <small>{active.metadata}</small>
        <p>{active.description}</p>
      </div>
      <p className="commission-link-card__categories">
        Pets · portraits · characters · places · personal ideas
      </p>
      <a
        href={ETSY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="paper-button paper-button--pink paper-button--md"
        aria-label="Start a custom art commission with Aida on Etsy"
        onClick={() =>
          trackAnalytics("commission_etsy_click", {
            metadata: {
              source: "links_page",
              destination: "etsy",
              type: activeMedium,
            },
          })
        }
      >
        <span>Start a commission</span>
        <ExternalLink aria-hidden="true" />
      </a>
      <div className="commission-link-card__trust">
        <strong>Choose oil pastel or digital when you order.</strong>
        <span>Order and send your references through Etsy.</span>
      </div>
    </section>
  );
}
