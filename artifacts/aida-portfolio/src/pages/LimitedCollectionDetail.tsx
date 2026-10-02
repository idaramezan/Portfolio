import { Link, useRoute } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import type { LimitedEditionGroup } from "@/lib/store";

export default function LimitedCollectionDetail() {
  const [, params] = useRoute("/limited-collections/:slug");
  const settings = useShopSettings();
  const collection = settings.weeklyLimitedCollections.find(
    (item) =>
      item.slug === params?.slug &&
      !["draft", "archived"].includes(item.status),
  );
  const groups = (collection?.editionGroupIds || [])
    .map((id) => settings.limitedEditionGroups.find((group) => group.id === id))
    .filter(
      (group): group is LimitedEditionGroup =>
        Boolean(group) && group?.editionEnabled !== false,
    );

  usePageMeta(
    collection
      ? `${collection.title} | Aeda Art`
      : "Limited collection | Aeda Art",
    collection?.shortDescription || "Explore this month's limited editions.",
  );

  if (!collection) {
    return (
      <main className="portfolio-page">
        <header className="catalog-title section-shell">
          <h1>Collection unavailable</h1>
        </header>
      </main>
    );
  }

  return (
    <main className="portfolio-page limited-collection-index">
      <header className="catalog-title section-shell">
        <h1>{collection.title}</h1>
      </header>
      <section
        className="originals-editorial-list section-shell"
        aria-label={`${collection.title} limited editions`}
      >
        {groups.map((group) => {
          const product = settings.printProducts.find(
            (item) => item.id === group.productId,
          );
          const href = product
            ? `/shop/prints/${product.slug || product.id}?limited=${encodeURIComponent(group.id)}`
            : `/limited-editions/${group.slug}`;
          const title =
            group.homepageTitleOverride || product?.name || group.title;
          const image =
            group.homepageImageOverride || product?.imageUrl || group.image;
          return (
            <article className="originals-editorial-item" key={group.id}>
              <Link className="originals-editorial-item__media" href={href}>
                <img
                  src={image}
                  alt={product?.altText || title}
                  loading="lazy"
                  style={{
                    objectPosition: group.homepageImageFocalPoint || "center",
                  }}
                />
              </Link>
              <div className="originals-editorial-item__details">
                <p>LIMITED EDITION</p>
                <h2>{title}</h2>
                {group.priceLabel && <p>{group.priceLabel}</p>}
                <p>EDITION OF {group.editionSize}</p>
                <Link href={href}>View full details →</Link>
              </div>
            </article>
          );
        })}
        {!groups.length && (
          <p className="portfolio-empty">
            No editions are available in this collection.
          </p>
        )}
      </section>
    </main>
  );
}
