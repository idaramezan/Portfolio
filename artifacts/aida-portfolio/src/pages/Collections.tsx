import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { compareProductDisplayOrder } from "@/lib/product-order";
import EditorialProductCard from "@/components/EditorialProductCard";

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
        className="catalog-gallery-grid section-shell"
        aria-label="Available originals"
      >
        {originals.map((artwork) => (
          <EditorialProductCard
            image={artwork.imageUrl}
            alt={artwork.altText || artwork.name}
            title={artwork.name}
            href={`/artworks/${artwork.slug || artwork.id}`}
            key={artwork.id}
            metadata={`${artwork.dimension}${artwork.artworkSurface ? ` · ${artwork.artworkSurface.toUpperCase()}` : ""}`}
          />
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
