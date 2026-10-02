import { Link } from "wouter";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { compareProductDisplayOrder } from "@/lib/product-order";

export function PaintingsIndex() {
  const settings = useShopSettings();
  const originals = [...settings.originalProducts]
    .filter((item) => isPubliclyVisible(item) && !isSoldOut(item))
    .sort(compareProductDisplayOrder);

  usePageMeta(
    "Available Original Paintings | Aeda Art",
    "Explore all currently available original paintings by Aida Ramezani.",
  );

  return (
    <main className="portfolio-page originals-index">
      <header className="portfolio-page-header section-shell">
        <p className="portfolio-kicker">AVAILABLE ORIGINALS</p>
        <h1>One-of-one works.</h1>
        <p>Every original painting currently available from Aida’s studio.</p>
      </header>
      <section
        className="artwork-gallery section-shell"
        aria-label="Available originals"
      >
        {originals.map((artwork) => (
          <Link
            href={`/artworks/${artwork.slug || artwork.id}`}
            key={artwork.id}
          >
            <img
              src={artwork.imageUrl}
              alt={artwork.altText || artwork.name}
              loading="lazy"
            />
            <span>
              <strong>{artwork.name}</strong>
              <small>
                {artwork.dimension}
                {artwork.artworkSurface
                  ? ` · ${artwork.artworkSurface.toUpperCase()}`
                  : ""}
              </small>
            </span>
          </Link>
        ))}
        {!originals.length && (
          <p className="portfolio-empty">
            No originals are currently available.
          </p>
        )}
      </section>
    </main>
  );
}
