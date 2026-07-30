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
} from "@/lib/assets";
import turkiyeFlagImage from "@assets/home-turkiye-flag.jpg";
import internationalFlagsImage from "@assets/home-international-flags.jpg";
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
import { PaperButton } from "@/components/ui/playful-studio";
import { useLocale } from "@/lib/locale";

const SHOP_REGION_SESSION_KEY = "aida-shop-region";

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
  const { locale } = useLocale();
  const [market, setMarket] = useState<ShoppingRegion>(() => {
    const saved = typeof window === "undefined" ? null : window.sessionStorage.getItem(SHOP_REGION_SESSION_KEY);
    return saved === "TR" || saved === "INTERNATIONAL" ? saved : getActiveShoppingRegion();
  });
  const links = settings.siteLinks;

  const chooseMarket = (next: ShoppingRegion) => {
    setActiveShoppingRegion(next);
    window.sessionStorage.setItem(SHOP_REGION_SESSION_KEY, next);
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
            title: "Original Art",
            copy: "One-of-a-kind oil pastel paintings.",
            number: "01",
          },
          {
            href: "/shop/turkiye/prints",
            image: printsCoverImage,
            title: "Prints & Stickers",
            copy: "Signed prints, stickers and studio pieces.",
            number: "02",
          },
          ...(mysteryMailAvailable
            ? [{
                href: "/shop/turkiye/mystery-mail",
                image: studioMailCoverImage,
                title: "Mystery Mail",
                copy: "A limited surprise parcel packed in Aida’s studio.",
                number: "03",
              }]
            : []),
          {
            href: "/studio-letter",
            image: studioMailCoverImage,
            title: "Studio Letter",
            copy: "Free personal stories and notes from Aida’s studio.",
            number: mysteryMailAvailable ? "04" : "03",
          },
        ]
      : [
          {
            href: "/shop/international/originals",
            image: originalsCoverImage,
            title: "Original Art",
            copy: "One-of-a-kind paintings available worldwide.",
            number: "01",
          },
          {
            href: "/shop/international/prints",
            image: printsCoverImage,
            title: "Prints & Goods",
            copy: "Worldwide editions and practical studio products.",
            number: "02",
          },
          {
            href: "/studio-letter",
            image: studioMailCoverImage,
            title: "Studio Letter",
            copy: "Free personal stories and notes from Aida’s studio.",
            number: "03",
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
                <span className="home-market-action__media"><img src={turkiyeFlagImage} alt="Turkish flag" width="420" height="280" /></span>
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
                <span className="home-market-action__media"><img src={internationalFlagsImage} alt="International flags" width="420" height="255" /></span>
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

      <section className="section-shell home-categories collection-navigation-section home-section">
        <div className="collection-navigation-section__header flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
          <div>
            <p className="eyebrow">Browse the studio</p>
            <h2 className="collection-navigation-section__title mt-2 text-4xl md:text-5xl">
              What are you looking for?
            </h2>
          </div>
        </div>
        <div className="shop-region-switcher-wrap">
          <div className="shop-region-switcher-copy">
            <strong>{market === "TR" ? (locale === "tr" ? "Türkiye’de alışveriş" : "Shopping in Türkiye") : (locale === "tr" ? "Uluslararası alışveriş" : "Shopping internationally")}</strong>
            <button type="button" onClick={() => chooseMarket(market === "TR" ? "INTERNATIONAL" : "TR")}>
              {market === "TR" ? (locale === "tr" ? "Uluslararası mağazaya geç" : "Switch to international") : (locale === "tr" ? "Türkiye mağazasına geç" : "Switch to Türkiye")}
            </button>
          </div>
          <div className="shop-region-switcher" role="group" aria-label={locale === "tr" ? "Alışveriş bölgenizi seçin" : "Choose your shopping region"}>
            <button type="button" data-active={market === "TR"} aria-pressed={market === "TR"} onClick={() => chooseMarket("TR")}>Türkiye</button>
            <button type="button" data-active={market === "INTERNATIONAL"} aria-pressed={market === "INTERNATIONAL"} onClick={() => chooseMarket("INTERNATIONAL")}>{locale === "tr" ? "Uluslararası" : "International"}</button>
          </div>
        </div>
        <div key={market} className="home-category-grid home-category-grid--region mt-8" aria-live="polite">
          {categoryItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`home-category-link home-category-link--paper home-category-link--tone-${index + 1}`}
              aria-label={`${item.title === "Studio Letter" ? "Read about" : "Explore"} ${item.title}`}
              onClick={() =>
                trackAnalytics("homepage_category_clicked", {
                  metadata: { market, category: item.title },
                })
              }
            >
              <span className="home-category-link__media"><img src={item.image} alt="" width="480" height="600" loading="lazy" decoding="async" /></span>
              <span className="home-category-link__content">
                <span className="home-category-link__number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </span>
              <ArrowRight className="home-category-link__arrow" aria-hidden="true" />
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
        <div className="product-section__footer">
          <PaperButton href={base} variant="pink" size="lg" arrow>
            View all available work
          </PaperButton>
        </div>
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
