import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { heroPortrait } from "@/lib/assets";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { useShippingDestination } from "@/lib/shipping-destination";
import { compareProductDisplayOrder } from "@/lib/product-order";
import { isAceoProduct } from "@/lib/turkiye-products";
import {
  getFourthwallVariants,
  getLowestFourthwallVariant,
  hasConfiguredFourthwallOptions,
} from "@/lib/fourthwall-variants";
import EditorialProductCard from "@/components/EditorialProductCard";
import ProductPrice from "@/components/ProductPrice";
import StudioLetterSignup from "@/components/StudioLetterSignup";

const fallbackHero = "/assets/aida-green-gallery-hero.png";

export default function PortfolioHome() {
  const settings = useShopSettings();
  const content = settings.homepageContent;
  const international = useInternationalProducts();
  const { destination } = useShippingDestination();
  const local = destination?.countryCode === "TR";
  usePageMeta(
    "Aeda Art | Paintings & Moving Image",
    "Paintings, animation and moving-image work by Aida Ramezani.",
  );
  const originals = settings.originalProducts.filter(isPubliclyVisible);
  const artworkFor = (collectionId: string) =>
    originals.find((item) => item.collectionId === collectionId) ||
    originals.find((item) =>
      settings.artCollections
        .find((collection) => collection.id === collectionId)
        ?.artworkIds.includes(item.id),
    );
  const current =
    settings.artCollections.find(
      (item) => item.id === content.currentCollectionId,
    ) || settings.artCollections[0];
  const second =
    settings.artCollections.find(
      (item) => item.id === content.secondCollectionId,
    ) || settings.artCollections[1];
  const currentArtwork = current && artworkFor(current.id);
  const secondArtwork = second && artworkFor(second.id);
  const projects = [...settings.movingImageProjects]
    .filter((item) => item.status === "published")
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.displayOrder - b.displayOrder,
    );
  const featuredProject =
    projects.find((item) => item.id === content.featuredMovingProjectId) ||
    projects[0];
  const selectedOriginals = content.featuredOriginalIds
    .map((id) => originals.find((item) => item.id === id))
    .filter(Boolean);
  const featuredOriginals = (
    selectedOriginals.length
      ? selectedOriginals
      : originals.filter((item) => !isSoldOut(item))
  ).slice(0, 3);
  const purchasablePrints = settings.printProducts
    .filter(
      (item) =>
        isPubliclyVisible(item) &&
        !isAceoProduct(item) &&
        (local || hasConfiguredFourthwallOptions(item)),
    )
    .sort(compareProductDisplayOrder);
  const selectedPrints = content.featuredPrintIds
    .map((id) => purchasablePrints.find((item) => item.id === id))
    .filter(Boolean);
  const featuredPrints = (
    selectedPrints.length ? selectedPrints : purchasablePrints
  ).slice(0, 4);
  const paintingPathImage =
    content.paintingPath.image ||
    current?.heroImage ||
    currentArtwork?.imageUrl ||
    fallbackHero;
  const movingPathImage =
    content.movingPath.image || featuredProject?.thumbnail || fallbackHero;

  return (
    <div className="portfolio-home portfolio-home--directed">
      <section className="directed-hero section-shell">
        <div className="directed-hero__copy">
          <p className="portfolio-kicker">{content.hero.eyebrow}</p>
          <h1>{content.hero.headline}</h1>
          <p className="portfolio-lede">{content.hero.supportingText}</p>
          <div className="directed-hero__actions">
            <Link
              className="portfolio-text-link"
              href={content.hero.primaryCtaUrl}
            >
              {content.hero.primaryCtaText}
              <ArrowRight />
            </Link>
            <Link
              className="portfolio-text-link portfolio-text-link--quiet"
              href={content.hero.secondaryCtaUrl}
            >
              {content.hero.secondaryCtaText}
              <ArrowRight />
            </Link>
          </div>
        </div>
        <div className="directed-hero__media">
          <img
            src={
              content.hero.image ||
              current?.heroImage ||
              currentArtwork?.imageUrl ||
              fallbackHero
            }
            alt={currentArtwork?.altText || "Painting by Aida Ramezani"}
            fetchPriority="high"
          />
        </div>
      </section>

      <section
        className="creative-paths section-shell"
        aria-label="Explore Aida's practice"
      >
        <Link
          href="/paintings"
          className="creative-path creative-path--paintings"
        >
          <img src={paintingPathImage} alt="Explore Aida's paintings" />
          <span>
            <small>PAINTINGS</small>
            <strong>{content.paintingPath.heading}</strong>
            <p>{content.paintingPath.description}</p>
            <em>
              Explore Paintings <ArrowRight />
            </em>
          </span>
        </Link>
        <Link
          href="/moving-image"
          className="creative-path creative-path--moving"
        >
          {content.movingPath.previewVideo ? (
            <video
              src={content.movingPath.previewVideo}
              poster={movingPathImage}
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={movingPathImage}
              alt="Explore Aida's moving-image work"
              loading="lazy"
            />
          )}
          <span>
            <small>MOVING IMAGE</small>
            <strong>{content.movingPath.heading}</strong>
            <p>{content.movingPath.description}</p>
            <em>
              Watch Moving Image <ArrowRight />
            </em>
          </span>
        </Link>
      </section>

      {current && (
        <CollectionFeature
          collection={current}
          artwork={currentArtwork}
          current
        />
      )}
      {second && (
        <CollectionFeature collection={second} artwork={secondArtwork} />
      )}

      {featuredProject && (
        <section className="featured-moving section-shell">
          <header>
            <p className="portfolio-kicker">MOVING IMAGE</p>
            <h2>{featuredProject?.title || "Stories built around sound."}</h2>
          </header>
          <Link
            className="featured-moving__media"
            href={`/moving-image/${featuredProject.slug}`}
          >
            <img
              src={content.featuredMovingCover || featuredProject.thumbnail}
              alt={featuredProject.title}
              loading="lazy"
            />
            <span>
              <small>
                {featuredProject.projectType} · {featuredProject.year}
              </small>
              <strong>
                {featuredProject.client && `For ${featuredProject.client}`}
              </strong>
              <p>{featuredProject.shortDescription}</p>
              <em>
                Watch project <ArrowRight />
              </em>
            </span>
          </Link>
          <Link className="portfolio-text-link" href="/moving-image">
            View all moving image <ArrowRight />
          </Link>
        </section>
      )}

      <section className="available-originals section-shell">
        <header>
          <div>
            <p className="portfolio-kicker">AVAILABLE ORIGINALS</p>
            <h2>Selected original works</h2>
          </div>
          <Link href="/paintings">
            View available originals <ArrowRight />
          </Link>
        </header>
        <div className="editorial-art-grid">
          {featuredOriginals.map(
            (item) =>
              item && (
                <EditorialProductCard
                  key={item.id}
                  href={`/artworks/${item.slug || item.id}`}
                  image={item.imageUrl}
                  alt={item.altText || item.name}
                  title={item.name}
                  metadata={`${item.artworkSurface === "canvas" ? "OIL PASTEL ON CANVAS" : "OIL PASTEL ON PAPER"} · ${item.dimension}${item.year ? ` · ${item.year}` : ""}`}
                />
              ),
          )}
        </div>
      </section>

      <section className="home-prints section-shell">
        <header>
          <div>
            <p className="portfolio-kicker">PRINTS</p>
            <h2>Art prints made from Aida’s original work.</h2>
          </div>
          <Link href="/shop?category=prints">
            View all prints <ArrowRight />
          </Link>
        </header>
        <div className="home-print-grid">
          {featuredPrints.map((item) => {
            if (!item) return null;
            const variants = getFourthwallVariants(
              item,
              international.products,
              international.shopUrl,
            );
            const linked = getLowestFourthwallVariant(variants)?.product;
            return (
              <EditorialProductCard
                key={item.id}
                href={`/shop/prints/${item.slug || item.id}`}
                image={item.imageUrl}
                alt={item.altText || item.name}
                title={item.name}
                metadata="PRINT"
                price={
                  local ? (
                    <ProductPrice
                      regularPriceMinor={item.priceMinor ?? item.priceUsdCents}
                      currency="TRY"
                      sale={item.sale}
                      compact
                    />
                  ) : (
                    linked?.price.formatted
                  )
                }
              />
            );
          })}
        </div>
      </section>

      <section className="studio-letter-invitation section-shell">
        <div className="studio-letter-invitation__story">
          {content.studioLetter.image && (
            <img
              src={content.studioLetter.image}
              alt="From Aida's Studio Letter"
              loading="lazy"
            />
          )}
          <p className="portfolio-kicker">STUDIO LETTER</p>
          <h2>{content.studioLetter.heading}</h2>
          <p>{content.studioLetter.body}</p>
          <blockquote>
            “{content.studioLetter.excerpt}
            <span aria-hidden="true">
              {" "}
              the rest of the story continues quietly beyond this preview...
            </span>
            ”
          </blockquote>
        </div>
        <div className="studio-letter-invitation__form">
          <StudioLetterSignup
            variant="compact"
            context="home"
            presentation="compact"
            submitLabel={{
              en: content.studioLetter.cta,
              tr: content.studioLetter.cta,
            }}
          />
          <small>Free. Occasional. Unsubscribe whenever you like.</small>
        </div>
      </section>

      <section className="home-about-preview section-shell">
        <img
          src={content.about.portrait || heroPortrait}
          alt="Aida Ramezani"
          loading="lazy"
        />
        <div>
          <p className="portfolio-kicker">{content.about.eyebrow}</p>
          <h2>{content.about.headline}</h2>
          <p>{content.about.paragraph}</p>
          <Link className="portfolio-text-link" href={content.about.ctaUrl}>
            {content.about.cta}
            <ArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}

function CollectionFeature({
  collection,
  artwork,
  current = false,
}: {
  collection: ReturnType<typeof useShopSettings>["artCollections"][number];
  artwork?: ReturnType<typeof useShopSettings>["originalProducts"][number];
  current?: boolean;
}) {
  return (
    <section
      className={`single-collection-feature section-shell ${current ? "single-collection-feature--current" : "single-collection-feature--second"}`}
    >
      <div className="single-collection-feature__media">
        <img
          src={collection.heroImage || artwork?.imageUrl || fallbackHero}
          alt={artwork?.altText || collection.title}
          loading={current ? "eager" : "lazy"}
        />
      </div>
      <div className="single-collection-feature__copy">
        <p className="portfolio-kicker">
          {current ? "CURRENT BODY OF WORK" : collection.eyebrow}
        </p>
        <h2>{collection.title}</h2>
        <p>{collection.shortDescription}</p>
        <Link
          className="portfolio-text-link"
          href={`/paintings/${collection.slug}`}
        >
          {collection.ctaLabel || `Explore ${collection.title}`}
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}
