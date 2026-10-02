import { Link, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";

export function PaintingsIndex() {
  const settings = useShopSettings();
  const collections = [...settings.artCollections]
    .filter((item) => item.status !== "draft")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  usePageMeta(
    "Paintings | Aeda Art",
    "Explore painting collections by Aida Ramezani.",
  );
  return (
    <div className="portfolio-page">
      <header className="portfolio-page-header section-shell">
        <p className="portfolio-kicker">PAINTINGS</p>
        <h1>I paint what stays with me.</h1>
        <p>Three bodies of work shaped by living nature, music and memory.</p>
      </header>
      <div className="paintings-index section-shell">
        {collections.map((collection, index) => {
          const artwork =
            settings.originalProducts.find((item) =>
              collection.artworkIds.includes(item.id),
            ) || settings.originalProducts[index];
          return (
            <Link
              href={`/paintings/${collection.slug}`}
              className="paintings-index__item"
              key={collection.id}
            >
              <span>0{index + 1}</span>
              <div>
                <img
                  src={collection.heroImage || artwork?.imageUrl}
                  alt={artwork?.altText || collection.title}
                />
                <h2>{collection.title}</h2>
                <p>{collection.shortDescription}</p>
              </div>
              <ArrowRight />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CollectionDetail() {
  const [, params] = useRoute("/paintings/:slug");
  const settings = useShopSettings();
  const collection = settings.artCollections.find(
    (item) => item.slug === params?.slug && item.status !== "draft",
  );
  const all = settings.originalProducts.filter(isPubliclyVisible);
  const associated = collection
    ? collection.artworkIds
        .map((id) => all.find((item) => item.id === id))
        .filter(Boolean)
    : [];
  const assigned = collection
    ? all.filter((item) => item.collectionId === collection.id)
    : [];
  const artworks = associated.length
    ? associated
    : assigned.length
      ? assigned
      : all;
  usePageMeta(
    collection?.seoTitle || `${collection?.title || "Paintings"} | Aeda Art`,
    collection?.seoDescription ||
      collection?.shortDescription ||
      "Painting collection by Aida Ramezani.",
  );
  if (!collection)
    return (
      <section className="section-shell portfolio-empty">
        <h1>Collection not found.</h1>
        <Link href="/paintings">View paintings</Link>
      </section>
    );
  const hero = collection.heroImage || artworks[0]?.imageUrl;
  return (
    <article className="collection-page">
      <header className="collection-page__header section-shell">
        <div>
          <p className="portfolio-kicker">{collection.eyebrow}</p>
          <h1>{collection.title}</h1>
          <p className="portfolio-lede">{collection.shortDescription}</p>
        </div>
        {hero && <img src={hero} alt={collection.title} fetchPriority="high" />}
      </header>
      <section className="collection-page__story section-shell">
        <p>{collection.story}</p>
      </section>
      <section className="artwork-gallery section-shell">
        {artworks.map(
          (artwork) =>
            artwork && (
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
                    {artwork.dimension} ·{" "}
                    {isSoldOut(artwork) ? "SOLD" : "AVAILABLE"}
                  </small>
                </span>
              </Link>
            ),
        )}
      </section>
    </article>
  );
}
