import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { compareProductDisplayOrder } from "@/lib/product-order";
import { Link } from "wouter";
import ProgressiveImage from "@/components/ProgressiveImage";
import { useShippingDestination } from "@/lib/shipping-destination";
import { useServerNow } from "@/hooks/use-server-now";
import { calculateProductSale, getSaleStatus } from "@/lib/product-sale";
import {
  convertUsdCentsToTry,
  formatCurrencyMinor,
  useCurrency,
} from "@/lib/currency";

const ORIGINALS_PROMOTION_END = Date.parse("2026-11-30T23:59:59+03:00");

export function PaintingsIndex({ embeddedAsHomepage = false }: { embeddedAsHomepage?: boolean } = {}) {
  const settings = useShopSettings();
  const { isTürkiye } = useShippingDestination();
  const { rate } = useCurrency();
  const now = useServerNow();
  const originals = [...settings.originalProducts]
    .filter((item) => isPubliclyVisible(item) && !isSoldOut(item))
    .sort(compareProductDisplayOrder);

  usePageMeta(
    "Available Original Paintings | Aeda Art",
    "Explore all currently available original paintings by Aida Ramezani.",
    !embeddedAsHomepage,
  );

  return (
    <main className="portfolio-page originals-index">
      {isTürkiye && <OriginalsPromotion originals={originals} now={now} />}
      <header className="catalog-title section-shell">
        <h1>Originals</h1>
      </header>
      <section
        className="originals-editorial-list section-shell"
        aria-label="Available originals"
      >
        {originals.map((artwork, index) => {
          const href = `/artworks/${artwork.slug || artwork.id}`;
          const convertedPrice = rate
            ? convertUsdCentsToTry(artwork.priceUsdCents, rate)
            : null;
          const pricing =
            convertedPrice == null
              ? null
              : calculateProductSale(convertedPrice, artwork.sale, now);
          const discounted = Boolean(pricing && pricing.percentage > 0);
          return (
            <article className="originals-editorial-item" key={artwork.id}>
              <Link className="originals-editorial-item__media" href={href}>
                <ProgressiveImage
                  src={artwork.imageUrl}
                  alt={artwork.altText || artwork.name}
                  priority={index === 0}
                  sizes="(max-width: 760px) 92vw, 65vw"
                />
              </Link>
              <div className="originals-editorial-item__details">
                {isTürkiye && (
                  <span
                    className={`original-discount-badge ${discounted ? "original-discount-badge--active" : "original-discount-badge--standard"}`}
                  >
                    {discounted
                      ? `${pricing!.percentage}% OFF`
                      : "STANDARD PRICE"}
                  </span>
                )}
                <h2>
                  {artwork.name}
                  {artwork.year ? `, ${artwork.year}` : ""}
                </h2>
                {artwork.dimension && <p>{artwork.dimension}</p>}
                {artwork.artworkSurface && (
                  <p>{artwork.artworkSurface.toUpperCase()}</p>
                )}
                {isTürkiye && pricing && (
                  <div className="originals-editorial-item__price">
                    {discounted && (
                      <s>
                        {formatCurrencyMinor(
                          pricing.regularPriceMinor,
                          "TRY",
                        )}
                      </s>
                    )}
                    <strong>
                      {formatCurrencyMinor(pricing.finalPriceMinor, "TRY")}
                    </strong>
                    {discounted && (
                      <small>{pricing.percentage}% off</small>
                    )}
                  </div>
                )}
                <Link href={href}>View full details →</Link>
              </div>
            </article>
          );
        })}
        {!originals.length && (
          <p className="portfolio-empty">
            No originals are currently available.
          </p>
        )}
      </section>
    </main>
  );
}

function OriginalsPromotion({
  originals,
  now,
}: {
  originals: Array<{ sale?: Parameters<typeof getSaleStatus>[0] }>;
  now: number;
}) {
  const highestDiscount = originals.reduce(
    (highest, artwork) =>
      getSaleStatus(artwork.sale, now) === "active"
        ? Math.max(highest, Number(artwork.sale?.percentage) || 0)
        : highest,
    0,
  );
  const remaining = Math.max(0, ORIGINALS_PROMOTION_END - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor(remaining / 3_600_000) % 24;
  const minutes = Math.floor(remaining / 60_000) % 60;
  const seconds = Math.floor(remaining / 1_000) % 60;
  const values = [days, hours, minutes, seconds];
  const labels = ["DAYS", "HOURS", "MINS", "SECS"];
  return (
    <aside
      className="originals-promotion"
      aria-label={`Original artwork promotion, up to ${highestDiscount || 50}% off`}
    >
      <div className="originals-promotion__inner section-shell">
        <div className="originals-promotion__copy">
          <p>A LITTLE SOMETHING, FOR YOUR WALLS</p>
          <h2>Up to {highestDiscount || 50}% off</h2>
          <span>Selected original works · For a limited time</span>
        </div>
        <div className="originals-promotion__timer">
          <p>{remaining === 0 ? "OFFER ENDED" : "ENDS IN"}</p>
          <div role="timer" aria-live="off">
            {values.map((value, index) => (
              <span key={labels[index]}>
                <strong>{String(value).padStart(2, "0")}</strong>
                <small>{labels[index]}</small>
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
