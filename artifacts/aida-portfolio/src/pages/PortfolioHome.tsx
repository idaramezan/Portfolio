import { Link } from "wouter";
import { ArrowRight, Play } from "lucide-react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { useLocale } from "@/lib/locale";
import { useShippingDestination } from "@/lib/shipping-destination";
import EditorialProductCard from "@/components/EditorialProductCard";
import HomeCommerce from "@/components/HomeCommerce";
import StudioLetterSignup from "@/components/StudioLetterSignup";

const defaultHero = "/assets/aida-green-gallery-hero.png";

export default function PortfolioHome() {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const { destination } = useShippingDestination();
  usePageMeta(
    "Aeda Art | Paintings, Memory & Moving Image",
    "Paintings and moving-image work by Aida Ramezani, shaped by memory, living nature and music.",
  );
  const originals = settings.originalProducts.filter(isPubliclyVisible);
  const collections = [...settings.artCollections]
    .filter((item) => item.featuredOnHomepage && item.status !== "draft")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const artworkFor = (collectionId: string, index: number) => {
    const collection = collections.find((item) => item.id === collectionId);
    const associated = (collection?.artworkIds || [])
      .map((id) => originals.find((item) => item.id === id))
      .filter(Boolean);
    const assigned = originals.filter(
      (item) => item.collectionId === collectionId,
    );
    return (
      associated[index] ||
      assigned[index] ||
      originals[
        (collections.indexOf(collection!) * 2 + index) %
          Math.max(originals.length, 1)
      ]
    );
  };
  const current =
    collections.find((item) => item.status === "current") || collections[0];
  const currentArtwork = current && artworkFor(current.id, 0);
  const heroImage =
    current?.heroImage || currentArtwork?.imageUrl || defaultHero;
  const projects = [...settings.movingImageProjects]
    .filter((item) => item.status === "published")
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.displayOrder - b.displayOrder,
    );

  return (
    <div className="portfolio-home">
      <section className="portfolio-hero">
        <div className="portfolio-hero__image">
          <img
            src={heroImage}
            alt={
              currentArtwork?.altText || current?.title || "Painting by Aida"
            }
            fetchPriority="high"
          />
        </div>
        <div className="portfolio-hero__copy">
          <p className="portfolio-kicker">
            {current?.eyebrow || "CURRENT BODY OF WORK"}
          </p>
          <h1>{current?.title || "Among Growing Things"}</h1>
          <p className="portfolio-lede">
            {current?.shortDescription || "A small world that keeps moving."}
          </p>
          <Link
            href={`/paintings/${current?.slug || "among-growing-things"}`}
            className="portfolio-text-link"
          >
            {locale === "tr" ? "Koleksiyonu keşfet" : "Explore the collection"}{" "}
            <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="portfolio-intro section-shell">
        <p className="portfolio-kicker">PAINTINGS BY AIDA RAMEZANI</p>
        <h2>I paint what stays with me.</h2>
        <p>
          Sometimes it is something remembered, sometimes a small moment among
          growing things, and sometimes an image left behind by a song.
        </p>
      </section>

      <div className="collection-stories">
        {collections.map((collection, index) => {
          const first = artworkFor(collection.id, 0);
          const second = artworkFor(collection.id, 1);
          return (
            <section
              className={`collection-story collection-story--${(index % 3) + 1}`}
              key={collection.id}
            >
              <div className="collection-story__media">
                <img
                  src={collection.heroImage || first?.imageUrl || defaultHero}
                  alt={first?.altText || collection.title}
                  loading={index ? "lazy" : "eager"}
                />
                {second?.imageUrl && (
                  <img
                    src={second.imageUrl}
                    alt={second.altText || second.name}
                    loading="lazy"
                  />
                )}
              </div>
              <div className="collection-story__copy">
                <span className="collection-story__number">0{index + 1}</span>
                <p className="portfolio-kicker">{collection.eyebrow}</p>
                <h2>{collection.title}</h2>
                <p>{collection.shortDescription}</p>
                <Link
                  href={`/paintings/${collection.slug}`}
                  className="portfolio-text-link"
                >
                  View collection <ArrowRight />
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      <section className="moving-feature section-shell">
        <div className="moving-feature__heading">
          <p className="portfolio-kicker">MOVING IMAGE</p>
          <h2>Stories that move.</h2>
          <p>
            Paintings are only one way I build images. I also create animation,
            music visuals and moving worlds for songs.
          </p>
          <Link href="/moving-image" className="portfolio-text-link">
            Explore Moving Image <ArrowRight />
          </Link>
        </div>
        <Link
          href={
            projects[0] ? `/moving-image/${projects[0].slug}` : "/moving-image"
          }
          className="moving-feature__project"
        >
          {projects[0]?.thumbnail ? (
            <img
              src={projects[0].thumbnail}
              alt={projects[0].title}
              loading="lazy"
            />
          ) : (
            <div className="moving-feature__placeholder">
              <Play />
              <span>Moving image portfolio</span>
            </div>
          )}
          {projects[0] && (
            <span>
              <strong>{projects[0].title}</strong>
              <small>
                {projects[0].client || projects[0].projectType} ·{" "}
                {projects[0].year}
              </small>
            </span>
          )}
        </Link>
      </section>

      <section className="available-originals section-shell">
        <header>
          <p className="portfolio-kicker">AVAILABLE ORIGINALS</p>
          <h2>Works looking for a home.</h2>
          <Link href="/paintings">
            View available originals <ArrowRight />
          </Link>
        </header>
        <div className="editorial-art-grid">
          {originals
            .filter((item) => !isSoldOut(item))
            .slice(0, 3)
            .map((item) => (
              <EditorialProductCard
                key={item.id}
                href={`/artworks/${item.slug || item.id}`}
                image={item.imageUrl}
                alt={item.altText || item.name}
                title={item.name}
                metadata={`ORIGINAL · ${item.dimension || "ONE OF ONE"}`}
              />
            ))}
        </div>
      </section>

      <HomeCommerce />

      <section className="personal-note section-shell">
        <div>
          <p className="portfolio-kicker">ABOUT AIDA</p>
          <h2>Painting is how I keep things a little longer.</h2>
        </div>
        <div>
          <p>
            I work between painting and moving image, following the colours,
            places and small moments that stay after everything else has moved
            on.
          </p>
          <Link href="/about" className="portfolio-text-link">
            Read about the work <ArrowRight />
          </Link>
        </div>
      </section>

      <StudioLetterSignup
        variant="compact"
        context="home"
        presentation="compact"
      />
      <section className="home-faq section-shell">
        <p className="portfolio-kicker">QUESTIONS</p>
        <h2>Collecting, delivery and commissions.</h2>
        <Link href="/faq" className="portfolio-text-link">
          Read the FAQ <ArrowRight />
        </Link>
      </section>
    </div>
  );
}
