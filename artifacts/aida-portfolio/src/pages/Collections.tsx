import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { compareProductDisplayOrder } from "@/lib/product-order";
import { Link } from "wouter";
import ProgressiveImage from "@/components/ProgressiveImage";

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
      <header className="catalog-title section-shell">
        <h1>Originals</h1>
      </header>
      <section
        className="originals-editorial-list section-shell"
        aria-label="Available originals"
      >
        {originals.map((artwork, index) => {
          const href = `/artworks/${artwork.slug || artwork.id}`;
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
                <h2>
                  {artwork.name}
                  {artwork.year ? `, ${artwork.year}` : ""}
                </h2>
                {artwork.dimension && <p>{artwork.dimension}</p>}
                {artwork.artworkSurface && (
                  <p>{artwork.artworkSurface.toUpperCase()}</p>
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
