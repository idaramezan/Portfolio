import { Link } from "wouter";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  getResponsiveImageSrcSet,
  heroPortrait,
  homeAboutImage,
  originalsCoverImage,
  printsCoverImage,
  studioMailCoverImage,
  mysteryMailCoverImage,
} from "@/lib/assets";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import {
  getActiveShoppingRegion,
  setActiveShoppingRegion,
  type ManagedProduct,
  type ShoppingRegion,
} from "@/lib/store";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { trackAnalytics } from "@/lib/analytics";
import Money from "@/components/Money";
import TikTokLiveSection from "@/components/TikTokLiveSection";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import IstanbulPaintingEventBanner from "@/components/IstanbulPaintingEventBanner";
import OriginalCollectorExperience from "@/components/OriginalCollectorExperience";

const SEO_TITLE =
  "Original Art, Prints & Goods and Mystery Mail | Aida Ramezani";
const SEO_DESCRIPTION =
  "Shop original paintings, Prints & Goods and limited Mystery Mail editions by Istanbul artist Aida Ramezani.";

function ProductTile({
  product,
  market,
}: {
  product: ManagedProduct;
  market: ShoppingRegion;
}) {
  const original = product.kind === "original";
  const href = `/shop/${market === "TR" ? "turkiye" : "international"}/${original ? "originals" : "prints"}${original && product.slug ? `/${product.slug}` : `?product=${product.id}`}`;
  const canonicalCurrency = product.priceCurrency || (original ? "USD" : "TRY");
  const amount = product.priceMinor ?? product.priceUsdCents;
  return (
    <article
      className={`home-product-tile ${original ? "home-product-tile--original" : "home-product-tile--goods"}`}
    >
      <Link
        href={href}
        className="group block"
        onClick={() =>
          trackAnalytics("homepage_product_clicked", {
            entityType: original ? "original" : "product",
            entityId: product.id,
            entityName: product.name,
            metadata: { market },
          })
        }
      >
        <img
          src={product.imageUrl}
          alt={product.altText || product.name}
          loading="lazy"
          decoding="async"
          className="aspect-[4/5] w-full bg-white object-contain transition-transform duration-300 group-hover:scale-[1.01]"
        />
        <div className="pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[.1em] text-ink/45">
            {original ? "Original oil pastel" : product.category || "Print"} ·{" "}
            {isSoldOut(product) ? "Sold" : "Available"}
          </p>
          <h3 className="mt-2 text-2xl leading-tight">{product.name}</h3>
          <Money
            baseAmountUsdCents={amount}
            canonicalCurrency={canonicalCurrency}
            className="mt-2 block text-sm font-bold"
          />
          <span className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-ink underline decoration-ink/25 underline-offset-4">
            {original ? "View artwork" : "See options"} →
          </span>
        </div>
      </Link>
    </article>
  );
}

export default function Home() {
  usePageMeta(SEO_TITLE, SEO_DESCRIPTION);
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const [market, setMarket] = useState<ShoppingRegion>(() =>
    getActiveShoppingRegion(),
  );
  const links = settings.siteLinks;

  const chooseMarket = (next: ShoppingRegion) => {
    setActiveShoppingRegion(next);
    setMarket(next);
    trackAnalytics("homepage_market_selected", {
      metadata: { market: next },
    });
  };

  const base = market === "TR" ? "/shop/turkiye" : "/shop/international";
  const originals = settings.originalProducts
    .filter(
      (product) =>
        isPubliclyVisible(product) &&
        (market === "TR"
          ? product.availableInTurkiye !== false
          : product.availableInternationally !== false),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );
  const localPrints = settings.printProducts
    .filter(
      (product) =>
        isPubliclyVisible(product) && product.availableInTurkiye !== false,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );
  const latestLocal = [
    ...originals.slice(0, 1),
    ...localPrints.slice(0, 2),
  ].slice(0, 3);

  const mysteryMailAvailable = settings.studioMailPackages.some((item) =>
    isPubliclyVisible(item),
  );
  const categoryItems =
    market === "TR"
      ? [
          {
            href: "/shop/turkiye/originals",
            image: originalsCoverImage,
            title: "Originals",
            copy: "One-of-a-kind oil pastel paintings.",
          },
          {
            href: "/shop/turkiye/prints",
            image: printsCoverImage,
            title: "Prints & Stickers",
            copy: "Signed prints, stickers and useful studio goods.",
          },
          {
            href: "/studio-letter",
            image: studioMailCoverImage,
            title: "Studio Letter",
            copy: "Free personal stories and notes from Aida’s studio.",
          },
          ...(mysteryMailAvailable
            ? [{
                href: "/shop/turkiye/mystery-mail",
                image: mysteryMailCoverImage,
                title: "Mystery Mail",
                copy: "A limited surprise parcel packed in Aida’s studio.",
              }]
            : []),
        ]
      : [
          {
            href: "/shop/international/originals",
            image: originalsCoverImage,
            title: "Originals",
            copy: "One-of-a-kind paintings available worldwide.",
          },
          {
            href: "/shop/international/prints",
            image: printsCoverImage,
            title: "Prints & Goods",
            copy: "Worldwide editions and practical studio products.",
          },
          {
            href: "/studio-letter",
            image: studioMailCoverImage,
            title: "Studio Letter",
            copy: "Free personal stories and notes from Aida’s studio.",
          },
        ];

  return (
    <div className="home-editorial flex flex-col overflow-hidden">
      <IstanbulPaintingEventBanner placement="home" compact />

      <section className="home-market-hero">
        <div className="section-shell home-market-hero__layout">
          <div className="home-market-hero__content">
            <p className="eyebrow">Art from Aida’s Istanbul studio</p>
            <h1>Pieces made to hold a memory.</h1>
            <p className="home-market-hero__intro">
              Original paintings, signed prints and small studio editions,
              available in Türkiye and internationally.
            </p>
            <img
              src={heroPortrait}
              srcSet={getResponsiveImageSrcSet(heroPortrait)}
              sizes="100vw"
              alt="Aida Ramezani in her Istanbul studio"
              width="800"
              height="1000"
              fetchPriority="high"
              className="home-market-hero__image home-market-hero__image--mobile"
            />
            <div className="home-market-actions" aria-label="Choose your shop">
              <Link
                href="/shop/turkiye"
                className="home-market-action home-market-action--primary"
                onClick={() => chooseMarket("TR")}
              >
                <img
                  src={originalsCoverImage}
                  alt="Original artwork and packaging from Aida’s Istanbul studio"
                  width="420"
                  height="520"
                />
                <span className="home-market-action__content">
                  <span className="home-market-action__label">Local shop</span>
                  <strong>Shop in Türkiye</strong>
                  <span>Originals, prints, stickers and Mystery Mail</span>
                </span>
                <span className="home-market-action__arrow" aria-hidden="true"><ArrowRight /></span>
              </Link>
              <Link
                href="/shop/international"
                className="home-market-action"
                onClick={() => chooseMarket("INTERNATIONAL")}
              >
                <img
                  src={printsCoverImage}
                  alt="Aida’s prints prepared for collectors worldwide"
                  width="420"
                  height="520"
                />
                <span className="home-market-action__content">
                  <span className="home-market-action__label">Worldwide</span>
                  <strong>Shop internationally</strong>
                  <span>Original paintings and worldwide studio products</span>
                </span>
                <span className="home-market-action__arrow" aria-hidden="true"><ArrowRight /></span>
              </Link>
            </div>
          </div>
          <img
            src={heroPortrait}
            srcSet={getResponsiveImageSrcSet(heroPortrait)}
            sizes="(max-width: 767px) 100vw, 48vw"
            alt="Aida Ramezani in her Istanbul studio"
            width="800"
            height="1000"
            fetchPriority="high"
            className="home-market-hero__image"
          />
        </div>
      </section>

      <section className="section-shell home-categories">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
          <div>
            <p className="eyebrow">Browse the studio</p>
            <h2 className="mt-2 text-4xl md:text-5xl">
              What are you looking for?
            </h2>
          </div>
        </div>
        <div className="home-category-grid mt-8">
          {categoryItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`home-category-link home-category-link--paper home-category-link--tone-${index + 1}`}
              onClick={() =>
                trackAnalytics("homepage_category_clicked", {
                  metadata: { market, category: item.title },
                })
              }
            >
              <img src={item.image} alt="" width="480" height="600" loading="lazy" decoding="async" />
              <span className="home-category-link__content">
                <span className="home-category-link__label">Studio collection</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <span className="home-category-link__cta">Explore <ArrowRight aria-hidden="true" /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell home-latest !pt-4">
        <div>
          <div>
            <p className="eyebrow">Available now</p>
            <h2 className="mt-2 text-4xl md:text-5xl">
              Recently from the studio
            </h2>
          </div>
        </div>
        {market === "TR" ? (
          <div className="home-product-grid mt-8">
            {latestLocal.map((product) => (
              <ProductTile key={product.id} product={product} market={market} />
            ))}
            <Link href={base} className="home-product-view-all">
              <span>Studio shelf</span>
              <strong>View all available work</strong>
              <span>Browse the complete collection →</span>
            </Link>
          </div>
        ) : (
          <div className="home-product-grid mt-8">
            {originals.slice(0, 1).map((product) => (
              <ProductTile key={product.id} product={product} market={market} />
            ))}
            {international.products.slice(0, 2).map((product) => (
              <article key={product.id} className="home-product-tile">
                <a
                  href={product.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackAnalytics("homepage_product_clicked", {
                      entityType: "fourthwall",
                      entityId: product.id,
                      entityName: product.name,
                      metadata: { market },
                    })
                  }
                >
                  {product.primaryImage && (
                    <img
                      src={product.primaryImage.url}
                      width={product.primaryImage.width || 800}
                      height={product.primaryImage.height || 800}
                      alt={product.primaryImage.alt}
                      loading="lazy"
                      className="aspect-[4/5] w-full bg-white object-contain"
                    />
                  )}
                  <div className="pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[.1em] text-ink/45">
                      International print ·{" "}
                      {product.soldOut ? "Sold out" : "Available"}
                    </p>
                    <h3 className="mt-2 text-2xl">{product.name}</h3>
                    <p className="mt-2 text-sm font-bold">
                      {product.price.formatted}
                    </p>
                    <span className="mt-3 inline-flex min-h-11 items-center text-sm font-bold underline decoration-ink/25 underline-offset-4">
                      View product →
                    </span>
                  </div>
                </a>
              </article>
            ))}
            <Link href={base} className="home-product-view-all">
              <span>Studio shelf</span>
              <strong>View all available work</strong>
              <span>Browse the complete collection →</span>
            </Link>
          </div>
        )}
      </section>

      <OriginalCollectorExperience
        market={market === "TR" ? "turkiye" : "international"}
      />

      <div className="home-studio-letter">
        <StudioLetterSignup
          variant="story-preview"
          context="home"
          presentation="compact"
        />
      </div>

      <section className="home-about-teaser section-shell">
        <img
          src={homeAboutImage}
          srcSet={getResponsiveImageSrcSet(homeAboutImage)}
          sizes="(max-width: 767px) 100vw, 42vw"
          alt="Aida preparing artwork in her Istanbul studio"
          loading="lazy"
        />
        <div>
          <p className="eyebrow">About the artist</p>
          <h2>Made by Aida in Istanbul.</h2>
          <p>
            Original art, prints and studio packages created and prepared
            personally by Aida Ramezani.
          </p>
          <Link
            href="/about"
            className="button-link"
            onClick={() => trackAnalytics("homepage_about_clicked")}
          >
            Meet Aida →
          </Link>
        </div>
      </section>

      <TikTokLiveSection tiktokUrl={links.tiktokUrl} secondaryCtaLabel="" />
    </div>
  );
}
