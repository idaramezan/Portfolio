import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import type { ManagedProduct } from "@/lib/store";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { trackAnalytics } from "@/lib/analytics";
import Money from "@/components/Money";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import CommissionLinkCard from "@/components/CommissionLinkCard";
import { useLocale } from "@/lib/locale";
import { useShippingDestination } from "@/lib/shipping-destination";
import { resolveProductPresentation } from "@/lib/product-presentation";
import { isAceoProduct } from "@/lib/turkiye-products";
import EditorialProductCard from "@/components/EditorialProductCard";
import {
  getDefaultFourthwallVariant,
  getFourthwallVariants,
  getLowestFourthwallVariant,
} from "@/lib/fourthwall-variants";

const HERO_IMAGE = "/assets/aida-green-gallery-hero.png";
type HomeFilter = "originals" | "prints";
type HomeSort = "newest" | "price-asc" | "price-desc";

const copy = {
  en: {
    seoTitle: "Original Art, Prints & Small Works | Aida Ramezani",
    seoDescription:
      "Original paintings, prints and small works by Aida Ramezani.",
    heroEyebrow: "ART TO LIVE WITH",
    heroLead: "Art that makes",
    heroAccent: "room for feeling.",
    heroBody: "Original paintings, small works and art made to live with you.",
    collection: "View the collection",
    commission: "Commission a piece",
    introEyebrow: "ART BY AIDA RAMEZANI",
    introTitle: "A little wild, a little quiet. Art made to stay with you.",
    introBody:
      "Aida works through colour, memory and small moments that are easy to miss. Each piece begins by hand and is made to bring something personal into the spaces we live in.",
    browse: "Browse the current works",
    available: "AVAILABLE NOW",
    collectionTitle: "The collection",
    collectionBody:
      "Original works, prints and small pieces ready to find a home.",
    originals: "Originals",
    prints: "Prints",
    sort: "Sort",
    newest: "Newest",
    low: "Price low to high",
    high: "Price high to low",
    more: "View more works",
    fullShop: "View full shop",
    notesEyebrow: "FROM AIDA",
    notesTitle: "Notes on making",
    notes: [
      [
        "01",
        "The person behind the work",
        "A little more about Aida, her materials and the ideas that stay with her.",
        "/about",
        "About Aida",
      ],
      [
        "02",
        "A piece made for you",
        "Oil pastel and digital commissions shaped around a photograph, character, place or idea.",
        "#commissions",
        "See commissions",
      ],
    ],
    keep: "KEEP IN TOUCH",
    good: "Good things,",
    occasionally: "occasionally.",
    newsletterBody:
      "New work, stories, events and the occasional early look. No noise.",
    originalType: "Original",
    printType: "Print",
    sold: "Sold",
    availableLabel: "Available",
    turkiyeOnly: "Türkiye only",
    viewWork: "View work",
    priceLoading: "Price loading",
  },
  tr: {
    seoTitle: "Orijinal Eserler, Baskılar ve Küçük İşler | Aida Ramezani",
    seoDescription:
      "Aida Ramezani'nin orijinal resimleri, baskıları ve küçük eserleri.",
    heroEyebrow: "YAŞAMAK İÇİN SANAT",
    heroLead: "Duygulara yer",
    heroAccent: "açan sanat.",
    heroBody:
      "Seninle yaşamak için yapılmış orijinal resimler, küçük eserler ve sanat.",
    collection: "Koleksiyonu gör",
    commission: "Özel eser siparişi",
    introEyebrow: "AIDA RAMEZANI'NİN SANATI",
    introTitle: "Biraz özgür, biraz sakin. Seninle kalmak için yapılan sanat.",
    introBody:
      "Aida renkler, anılar ve kolayca gözden kaçan küçük anlar üzerinden çalışır. Her eser elde başlar ve yaşadığımız alanlara kişisel bir his katmak için yapılır.",
    browse: "Mevcut eserleri keşfet",
    available: "ŞİMDİ MEVCUT",
    collectionTitle: "Koleksiyon",
    collectionBody:
      "Yeni bir yuva bulmaya hazır orijinal eserler, baskılar ve küçük parçalar.",
    originals: "Orijinaller",
    prints: "Baskılar",
    sort: "Sırala",
    newest: "En yeni",
    low: "Fiyat artan",
    high: "Fiyat azalan",
    more: "Daha fazla eser gör",
    fullShop: "Tüm mağazayı gör",
    notesEyebrow: "AIDA'DAN",
    notesTitle: "Üretime dair notlar",
    notes: [
      [
        "01",
        "Eserlerin ardındaki kişi",
        "Aida, malzemeleri ve onunla kalan fikirler hakkında biraz daha fazlası.",
        "/about",
        "Aida hakkında",
      ],
      [
        "02",
        "Senin için bir eser",
        "Bir fotoğraf, karakter, yer veya fikirden doğan yağlı pastel ve dijital siparişler.",
        "#commissions",
        "Siparişleri gör",
      ],
    ],
    keep: "HABERDAR OL",
    good: "Güzel şeyler,",
    occasionally: "ara sıra.",
    newsletterBody:
      "Yeni eserler, hikâyeler, etkinlikler ve bazen erken bir bakış. Gürültü yok.",
    originalType: "Orijinal",
    printType: "Baskı",
    sold: "Satıldı",
    availableLabel: "Mevcut",
    turkiyeOnly: "Yalnızca Türkiye",
    viewWork: "Eseri gör",
    priceLoading: "Fiyat yükleniyor",
  },
} as const;

function ProductTile({
  product,
  internationalProducts,
  internationalShopUrl,
  locale,
}: {
  product: ManagedProduct;
  internationalProducts: ReturnType<
    typeof useInternationalProducts
  >["products"];
  internationalShopUrl: string | null;
  locale: "en" | "tr";
}) {
  const text = copy[locale];
  const { destination } = useShippingDestination();
  const original = product.kind === "original";
  const aceo = isAceoProduct(product);
  const href = `/shop/${original ? "originals" : aceo ? "aceos" : "prints"}/${product.slug || product.id}`;
  const linked = internationalProducts.find(
    (item) => item.id === product.fourthwallProductId,
  );
  const variants = getFourthwallVariants(
    product,
    internationalProducts,
    internationalShopUrl,
  );
  const cardVariant = getLowestFourthwallVariant(variants);
  const presentation = resolveProductPresentation(
    product,
    destination,
    cardVariant?.product || linked,
    cardVariant?.href || product.fourthwallProductUrl,
  );
  const sold = isSoldOut(product);
  const price =
    presentation.amountMinor !== null && presentation.currency ? (
      <Money
        baseAmountUsdCents={presentation.amountMinor}
        canonicalCurrency={presentation.currency}
      />
    ) : presentation.externalPrice ? (
      presentation.externalPrice
    ) : presentation.availability === "loading" ? (
      <span className="price-skeleton" aria-label={text.priceLoading} />
    ) : undefined;
  const type = aceo
    ? "ACEO"
    : original
      ? text.originalType
      : product.category === "print" || !product.category
        ? text.printType
        : product.category;
  return (
    <EditorialProductCard
      href={href}
      image={product.imageUrl}
      alt={product.altText || product.name}
      title={product.name}
      price={price}
      pricePrefix={
        presentation.externalPrice &&
        variants.filter((variant) => variant.available).length > 1
          ? locale === "tr"
            ? "BAŞLANGIÇ"
            : "FROM"
          : undefined
      }
      metadata={`${type} · ${sold ? text.sold : text.availableLabel}`}
      status={sold ? "sold" : presentation.availability}
      onNavigate={() =>
        trackAnalytics("homepage_product_clicked", {
          entityType: original ? "original" : "product",
          entityId: product.id,
          entityName: product.name,
          metadata: { countryCode: destination?.countryCode || "unknown" },
        })
      }
    />
  );
}

export default function Home() {
  const { locale } = useLocale();
  const text = copy[locale];
  usePageMeta(text.seoTitle, text.seoDescription);
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, loading: destinationLoading } = useShippingDestination();
  const [filter, setFilter] = useState<HomeFilter>("prints");
  const [sort, setSort] = useState<HomeSort>("newest");
  const [visible, setVisible] = useState(8);
  const products = useMemo(() => {
    if (!destination) return [];
    const filtered =
      filter === "originals" && destination.countryCode === "TR"
        ? settings.originalProducts.filter(isPubliclyVisible)
        : settings.printProducts.filter(
            (product) => isPubliclyVisible(product) && !isAceoProduct(product),
          );
    return filtered.sort((a, b) =>
      sort === "newest"
        ? (Date.parse(b.createdAt || "") || 0) -
          (Date.parse(a.createdAt || "") || 0)
        : sort === "price-asc"
          ? a.priceUsdCents - b.priceUsdCents
          : b.priceUsdCents - a.priceUsdCents,
    );
  }, [
    settings.originalProducts,
    settings.printProducts,
    destination,
    filter,
    sort,
  ]);
  useEffect(() => {
    if (destination?.countryCode !== "TR" && filter === "originals")
      setFilter("prints");
  }, [destination?.countryCode, filter]);
  const availableFilters: Array<[HomeFilter, string]> = [];
  if (
    settings.printProducts.some(
      (product) => isPubliclyVisible(product) && !isAceoProduct(product),
    )
  )
    availableFilters.push(["prints", text.prints]);
  if (
    destination?.countryCode === "TR" &&
    settings.originalProducts.some(isPubliclyVisible)
  )
    availableFilters.push(["originals", text.originals]);

  return (
    <div className="home-green">
      <section className="home-green-hero" aria-labelledby="home-hero-title">
        <img
          src={HERO_IMAGE}
          srcSet="/assets/aida-green-gallery-hero-720.jpg 720w, /assets/aida-green-gallery-hero-1080.jpg 1080w, /assets/aida-green-gallery-hero.png 1080w"
          sizes="100vw"
          alt="Two colorful paintings displayed above a handcrafted wooden console on a forest green wall"
          width="1080"
          height="1080"
          fetchPriority="high"
        />
        <div className="home-green-hero__shade" />
        <div className="home-green-hero__content">
          <p className="eyebrow">{text.heroEyebrow}</p>
          <h1 id="home-hero-title">
            {text.heroLead}
            <br />
            <em>{text.heroAccent}</em>
          </h1>
          <p>{text.heroBody}</p>
          <div>
            <a href="#collection" className="home-green-button">
              {text.collection} ↗
            </a>
            <a href="#commissions" className="home-green-text-link">
              {text.commission} ↘
            </a>
          </div>
        </div>
        <a href="#introduction" className="home-green-hero__scroll">
          Scroll to explore
        </a>
      </section>

      <section id="introduction" className="home-green-intro section-shell">
        <div>
          <p className="eyebrow">{text.introEyebrow}</p>
          <h2>{text.introTitle}</h2>
        </div>
        <div>
          <p>{text.introBody}</p>
          <Link href="/shop" className="home-green-rule-link">
            {text.browse} <ArrowRight />
          </Link>
        </div>
      </section>

      <section id="collection" className="home-green-collection section-shell">
        <header>
          <div>
            <p className="eyebrow">{text.available}</p>
            <h2>{text.collectionTitle}</h2>
          </div>
          <p>
            {destination?.countryCode === "TR"
              ? text.collectionBody
              : locale === "tr"
                ? "Yeni bir yuva bulmaya hazır sanat baskıları."
                : "Art prints ready to find a home."}
          </p>
        </header>
        <div className="home-green-collection__tools">
          <div
            role="tablist"
            aria-label={locale === "tr" ? "Ürün türü" : "Product type"}
          >
            {availableFilters.map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={filter === value}
                onClick={() => {
                  setFilter(value);
                  setVisible(8);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            <span>{text.sort}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as HomeSort)}
            >
              <option value="newest">{text.newest}</option>
              <option value="price-asc">{text.low}</option>
              <option value="price-desc">{text.high}</option>
            </select>
          </label>
        </div>
        {destinationLoading && !destination ? (
          <div
            className="storefront-catalog-skeleton"
            aria-label="Loading collection"
          />
        ) : (
          <div className="home-collection-grid">
            {products.slice(0, visible).map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                internationalProducts={international.products}
                internationalShopUrl={international.shopUrl}
                locale={locale}
              />
            ))}
          </div>
        )}
        {!products.length && (
          <div className="home-green-empty">
            <h3>
              {locale === "tr"
                ? "Bu kategoride henüz eser yok."
                : "No works in this category yet."}
            </h3>
            <p>
              {locale === "tr"
                ? "Başka bir kategoriye göz atabilirsin."
                : "Try another part of the collection."}
            </p>
          </div>
        )}
        <footer>
          {visible < products.length && (
            <button onClick={() => setVisible((count) => count + 8)}>
              {text.more} ↓
            </button>
          )}
          <Link href="/shop">{text.fullShop} →</Link>
        </footer>
      </section>

      <section className="home-green-notes">
        <div className="section-shell">
          <p className="eyebrow">{text.notesEyebrow}</p>
          <h2>{text.notesTitle}</h2>
          <div>
            {text.notes.map(([number, title, body, href, label]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
                <a href={href}>{label} ↗</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="commissions"
        className="home-green-commissions section-shell"
      >
        <CommissionLinkCard locale={locale} />
      </section>

      <section className="home-green-newsletter section-shell">
        <div>
          <p className="eyebrow">{text.keep}</p>
          <h2>
            {text.good}
            <br />
            <em>{text.occasionally}</em>
          </h2>
        </div>
        <div>
          <p>{text.newsletterBody}</p>
          <StudioLetterSignup
            variant="compact"
            context="home"
            submitLabel={{ en: "Subscribe ↗", tr: "Abone ol ↗" }}
            trustText={{
              en: "Occasional notes. Unsubscribe anytime.",
              tr: "Ara sıra notlar. İstediğin zaman ayrıl.",
            }}
          />
        </div>
      </section>
    </div>
  );
}
