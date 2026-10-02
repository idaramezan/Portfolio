import { Link, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import EditorialProductCard from "@/components/EditorialProductCard";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { isPubliclyVisible } from "@/lib/product-status";
import { isAceoProduct } from "@/lib/turkiye-products";
import type { ManagedProduct } from "@/lib/store";

export default function ArtEraDetail() {
  const [, params] = useRoute("/eras/:slug");
  const settings = useShopSettings();
  const era = settings.artEras.find(
    (item) => item.slug === params?.slug && item.status === "published",
  );
  usePageMeta(
    era ? `${era.title} | Aeda Art` : "Art era | Aeda Art",
    era?.shortDescription || "Explore an era from Aida Ramezani's art journey.",
  );

  if (!era) {
    return (
      <main className="era-not-found section-shell">
        <p className="portfolio-kicker">ART JOURNEY</p>
        <h1>This era could not be found.</h1>
        <Link className="portfolio-text-link" href="/">
          Return home <ArrowRight />
        </Link>
      </main>
    );
  }

  const prints = era.printIds
    .map((id) => settings.printProducts.find((product) => product.id === id))
    .filter(
      (product): product is ManagedProduct =>
        Boolean(product) &&
        isPubliclyVisible(product as ManagedProduct) &&
        !isAceoProduct(product as ManagedProduct),
    );

  return (
    <main className="era-page">
      <section className="era-hero section-shell">
        <div className="era-hero__copy">
          <p className="portfolio-kicker">
            {era.eyebrow || "AN ERA IN MY ART JOURNEY"}
          </p>
          <h1>{era.title}</h1>
          {era.shortDescription && <p>{era.shortDescription}</p>}
          <a
            className="era-scroll-cue"
            href="#era-story"
            aria-label="Read the story"
          >
            ↓
          </a>
        </div>
        <div className="era-hero__media">
          <img src={era.heroImage} alt={era.title} fetchPriority="high" />
        </div>
      </section>

      <section id="era-story" className="era-story section-shell">
        <div className="era-story__media">
          <img src={era.storyImage || era.heroImage} alt="" loading="lazy" />
        </div>
        <div className="era-story__copy">
          <p className="portfolio-kicker">THE STORY</p>
          <h2>Inside {era.title}</h2>
          <div className="era-story__text">
            {(era.story || era.shortDescription)
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </div>
      </section>

      {prints.length > 0 && (
        <section className="era-prints section-shell">
          <header>
            <p className="portfolio-kicker">PRINTS FROM THIS ERA</p>
            <h2>The works.</h2>
          </header>
          <div className="catalog-gallery-grid">
            {prints.map((product) => (
              <EditorialProductCard
                key={product.id}
                href={`/shop/prints/${product.slug || product.id}`}
                image={product.imageUrl}
                alt={product.altText || product.name}
                title={product.name}
                metadata="PRINT"
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
