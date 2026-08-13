import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  getResponsiveImageSrcSet,
  heroPortrait,
  homeAboutImage,
  originalsCoverImage,
  printsCoverImage,
} from "@/lib/assets";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import type { ManagedProduct } from "@/lib/store";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { trackAnalytics } from "@/lib/analytics";
import Money from "@/components/Money";
import TikTokLiveSection from "@/components/TikTokLiveSection";
import StudioDiscordSection from "@/components/StudioDiscordSection";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import IstanbulPaintingEventBanner from "@/components/IstanbulPaintingEventBanner";
import { PaperButton } from "@/components/ui/playful-studio";
import { useLocale } from "@/lib/locale";
import { useShippingDestination } from "@/lib/shipping-destination";
import { resolveProductPresentation } from "@/lib/product-presentation";

const SEO_TITLE = "Original Art, Prints & Goods | Aida Ramezani";
const SEO_DESCRIPTION =
  "Shop original paintings, prints and studio goods by Istanbul artist Aida Ramezani.";

function NewsletterEnvelopeCard({
  href,
  number,
  locale,
  onClick,
}: {
  href: string;
  number: string;
  locale: "en" | "tr";
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setArrived(true);
        observer.disconnect();
      },
      { threshold: 0.45 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={cardRef}
      href={href}
      onClick={onClick}
      className="newsletter-envelope-card"
      data-arrived={arrived || undefined}
      aria-label={
        locale === "tr"
          ? "Bülteni oku ve abone ol"
          : "Read and subscribe to the Newsletter"
      }
    >
      <span className="newsletter-envelope-card__paper" aria-hidden="true">
        <span className="newsletter-envelope-card__flap" />
        <span className="newsletter-envelope-card__sender">
          AIDA · ISTANBUL
        </span>
        <span className="newsletter-envelope-card__stamp">AR</span>
        <span className="newsletter-envelope-card__postmark" />
      </span>
      <span className="newsletter-envelope-card__content">
        <span className="home-category-link__number home-category-link__number--desktop">
          {number}
        </span>
        <span className="newsletter-envelope-card__eyebrow">
          {locale === "tr"
            ? "GELEN KUTUNA, AIDA’DAN"
            : "FROM AIDA, TO YOUR INBOX"}
        </span>
        <h3>{locale === "tr" ? "Bülten" : "Newsletter"}</h3>
        <p>
          {locale === "tr"
            ? "Kişisel sanat hikâyeleri, atölye notları ve yeni çalışmalara ilk bakışlar."
            : "Personal art stories, studio notes and first looks at new work."}
        </p>
        <span className="newsletter-envelope-card__cta">
          {locale === "tr" ? "Oku ve abone ol" : "Read and subscribe"}{" "}
          <ArrowRight aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function ProductTile({
  product,
  internationalProducts,
}: {
  product: ManagedProduct;
  internationalProducts: ReturnType<
    typeof useInternationalProducts
  >["products"];
}) {
  const { destination } = useShippingDestination();
  const original = product.kind === "original";
  const href = `/shop/${original ? "originals" : "prints"}/${product.slug || product.id}`;
  const linked = internationalProducts.find(
    (item) => item.id === product.fourthwallProductId,
  );
  const presentation = resolveProductPresentation(
    product,
    destination,
    linked,
    product.fourthwallProductUrl,
  );
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
            metadata: { countryCode: destination?.countryCode || "unknown" },
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
          {presentation.amountMinor !== null && presentation.currency && (
            <Money
              baseAmountUsdCents={presentation.amountMinor}
              canonicalCurrency={presentation.currency}
              className="mt-2 block text-sm font-bold"
            />
          )}
          {presentation.externalPrice && (
            <strong className="mt-2 block text-sm">
              {presentation.externalPrice}
            </strong>
          )}
          {presentation.availability === "loading" && (
            <span className="price-skeleton mt-2" aria-label="Price loading" />
          )}
          <p className="mt-2 text-xs text-ink/55">
            {presentation.shippingMessage}
          </p>
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
  const links = settings.siteLinks;
  const originals = settings.originalProducts
    .filter(isPubliclyVisible)
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  const localPrints = settings.printProducts
    .filter(isPubliclyVisible)
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  const recentProducts = originals.length
    ? [...originals.slice(0, 1), ...localPrints.slice(0, 2)]
    : localPrints.slice(0, 3);
  const categoryItems = [
    {
      href: "/shop?category=originals",
      image: originalsCoverImage,
      title: "Original Art",
      copy: "One-of-a-kind oil pastel paintings.",
      number: "01",
    },
    {
      href: "/shop?category=prints",
      image: printsCoverImage,
      title: "Prints & Stickers",
      copy: "Signed prints, stickers and studio pieces.",
      number: "02",
    },
    {
      href: "/100-windows",
      image: settings.hundredWindows?.heroImageUrl || printsCoverImage,
      title: "100 Windows",
      copy: "One new window, one new story, every day.",
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
            <div
              className="home-market-actions home-market-actions--unified"
              aria-label={
                locale === "tr" ? "Stüdyoyu keşfet" : "Explore the studio"
              }
            >
              <PaperButton href="/shop" variant="pink" size="lg" arrow>
                {locale === "tr" ? "Mağazayı keşfet" : "Explore the shop"}
              </PaperButton>
              <Link href="/100-windows" className="button-link">
                {locale === "tr"
                  ? "100 Windows'ı takip et"
                  : "Follow 100 Windows"}{" "}
                →
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
        <div className="home-category-grid home-category-grid--region mt-8">
          {categoryItems.map((item, index) =>
            item.title === "Newsletter" ? (
              <NewsletterEnvelopeCard
                key={item.href}
                href={item.href}
                number={item.number}
                locale={locale}
                onClick={() =>
                  trackAnalytics("homepage_category_clicked", {
                    metadata: { category: item.title },
                  })
                }
              />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`home-category-link home-category-link--paper home-category-link--tone-${index + 1}`}
                aria-label={`${item.title === "Newsletter" ? "Read about" : "Explore"} ${item.title}`}
                onClick={() =>
                  trackAnalytics("homepage_category_clicked", {
                    metadata: { category: item.title },
                  })
                }
              >
                <span className="home-category-link__media">
                  <img
                    src={item.image}
                    alt=""
                    width="480"
                    height="600"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="home-category-link__content">
                  <span className="home-category-link__number home-category-link__number--desktop">
                    {item.number}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <span className="home-category-link__cta">
                    {item.title === "Original Art"
                      ? "Explore originals"
                      : item.title === "Newsletter"
                        ? "Read the Newsletter"
                        : item.title === "100 Windows"
                          ? "Follow the project"
                          : "Browse prints & goods"}
                  </span>
                </span>
                <ArrowRight
                  className="home-category-link__arrow"
                  aria-hidden="true"
                />
              </Link>
            ),
          )}
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
        <div className="home-product-grid mt-8">
          {recentProducts.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              internationalProducts={international.products}
            />
          ))}
        </div>
        <div className="product-section__footer">
          <PaperButton href="/shop" variant="pink" size="lg" arrow>
            View all available work
          </PaperButton>
        </div>
      </section>

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

      <TikTokLiveSection
        links={{
          tiktokUrl: links.tiktokUrl,
          twitchUrl: links.twitchUrl,
          kickUrl: links.kickUrl,
        }}
      />
      <StudioDiscordSection discordUrl={links.discordUrl} />
    </div>
  );
}
