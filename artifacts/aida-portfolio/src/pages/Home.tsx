import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  getResponsiveImageSrcSet,
  heroPortrait,
  homeAboutImage,
  mysteryMailCoverImage,
  originalsCoverImage,
  printsCoverImage,
  studioMailCoverImage,
} from "@/lib/assets";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import {
  getActiveShoppingRegion,
  hasActiveShoppingRegionPreference,
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
  const [hasPreference, setHasPreference] = useState(() =>
    hasActiveShoppingRegionPreference(),
  );
  const links = settings.siteLinks;

  const chooseMarket = (next: ShoppingRegion) => {
    setActiveShoppingRegion(next);
    setMarket(next);
    setHasPreference(true);
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
    ...localPrints.slice(0, 3),
  ].slice(0, 4);

  const categoryItems =
    market === "TR"
      ? [
          {
            href: "/shop/turkiye/originals",
            image: originalsCoverImage,
            title: "Original Art",
            copy: "One-of-a-kind oil pastel paintings.",
            cta: "Explore originals",
            feature: true,
          },
          {
            href: "/shop/turkiye/prints",
            image: printsCoverImage,
            title: "Prints & Stickers",
            copy: "Signed, accessible pieces from Aida’s work.",
            cta: "Shop prints and stickers",
          },
          {
            href: "/shop/turkiye/mystery-mail",
            image: mysteryMailCoverImage,
            title: "Mystery Mail",
            copy: "A sealed themed art package with a few surprises.",
            cta: "Discover Mystery Mail",
          },
          {
            href: "/studio-letter",
            image: studioMailCoverImage,
            title: "Studio Letter",
            copy: "Free personal stories from Aida’s studio.",
            cta: "Read about the Studio Letter",
          },
        ]
      : [
          {
            href: "/shop/international/originals",
            image: originalsCoverImage,
            title: "Original Art",
            copy: "One-of-a-kind paintings shipped worldwide.",
            cta: "Explore originals",
            feature: true,
          },
          {
            href: "/shop/international/prints",
            image: printsCoverImage,
            title: "Prints & Goods",
            copy: "Accessible editions fulfilled internationally.",
            cta: "Shop prints and goods",
          },
          {
            href: "/studio-letter",
            image: studioMailCoverImage,
            title: "Studio Letter",
            copy: "Free personal stories from Aida’s studio.",
            cta: "Read about the Studio Letter",
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
                <strong>Shop in Türkiye</strong>
                <span>Originals, prints, stickers and Mystery Mail</span>
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/shop/international"
                className="home-market-action"
                onClick={() => chooseMarket("INTERNATIONAL")}
              >
                <strong>Shop internationally</strong>
                <span>Original paintings and worldwide products</span>
                <ArrowRight aria-hidden="true" />
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
            <p className="eyebrow">Your collection</p>
            <h2 className="mt-2 text-4xl md:text-5xl">
              What are you looking for?
            </h2>
          </div>
          {hasPreference && (
            <div className="text-sm text-ink/60">
              Shopping {market === "TR" ? "in Türkiye" : "internationally"} ·{" "}
              <button
                type="button"
                className="min-h-11 font-bold text-ink underline underline-offset-4"
                onClick={() => setHasPreference(false)}
              >
                Change
              </button>
            </div>
          )}
        </div>
        {!hasPreference && (
          <div className="mt-5 flex gap-2" aria-label="Choose category market">
            <button
              className="button-primary"
              onClick={() => chooseMarket("TR")}
            >
              Türkiye
            </button>
            <button
              className="button-secondary"
              onClick={() => chooseMarket("INTERNATIONAL")}
            >
              International
            </button>
          </div>
        )}
        <div className="home-category-grid mt-8">
          {categoryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`home-category-link ${item.feature ? "home-category-link--feature" : ""}`}
              onClick={() =>
                trackAnalytics("homepage_category_clicked", {
                  metadata: { market, category: item.title },
                })
              }
            >
              <img src={item.image} alt="" loading="lazy" decoding="async" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <span>{item.cta} →</span>
              </div>
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
          </div>
        )}
        <Link href={base} className="button-link mt-7 sm:hidden">
          View all available pieces →
        </Link>
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
