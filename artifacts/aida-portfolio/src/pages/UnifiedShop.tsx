import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import EditorialProductCard from "@/components/EditorialProductCard";
import InternationalProductCard from "@/components/InternationalProductCard";
import Money from "@/components/Money";
import ProductPrice from "@/components/ProductPrice";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useToast } from "@/hooks/use-toast";
import { trackAnalytics } from "@/lib/analytics";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import {
  getFourthwallVariants,
  getLowestFourthwallVariant,
} from "@/lib/fourthwall-variants";
import { useLocale } from "@/lib/locale";
import { resolveProductPresentation } from "@/lib/product-presentation";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import {
  DestinationControl,
  useShippingDestination,
  type ShippingDestination,
} from "@/lib/shipping-destination";
import { addItemToCart, type ManagedProduct } from "@/lib/store";
import { isAceoProduct } from "@/lib/turkiye-products";

type Category =
  "prints" | "originals" | "palettes" | "mail-club" | "animation-merch";

const newestFirst = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0);

const copy = {
  en: {
    heroEye: "FROM AIDA'S STUDIO",
    heroTitle: "Shop the studio.",
    heroBody:
      "Original paintings, prints and small studio editions made by Aida.",
    loading: "Loading shop",
    empty: "No pieces are available in this collection right now.",
    available: "AVAILABLE",
    sold: "SOLD",
    add: "Add to basket",
    added: "Added to the basket",
    external: "Shop this piece",
    customCta: "Design your custom palette",
    categories: {
      prints: [
        "LIMITED EDITIONS",
        "Prints",
        "Art prints made from Aida's original work.",
      ],
      originals: [
        "ONE OF ONE",
        "Originals",
        "One-of-a-kind oil pastel works made by Aida.",
      ],
      palettes: [
        "FOR YOUR DESK",
        "Watercolor Palettes",
        "Handmade palettes ready to ship or made around your colours.",
      ],
      "mail-club": [
        "MAIL CLUB",
        "A little art post, just for the people who keep it.",
        "A small envelope of art, notes and little things made to keep. Each edition is created once, sent to a small circle of collectors, and never repeated.",
      ],
      "animation-merch": [
        "FROM THE ANIMATION SERIES",
        "Animation Merch",
        "Wearable and useful little pieces from the world of Aida's animation characters.",
      ],
    },
    labels: {
      prints: "Prints",
      originals: "Originals",
      palettes: "Palettes",
      "mail-club": "Mail Club",
      "animation-merch": "Animation Merch",
    },
    paletteEye: "CUSTOM PALETTE",
    paletteTitle: "A palette made around you.",
    paletteBody:
      "Choose the material and colours for a handmade watercolor palette. It may be created during one of Aida's TikTok LIVE sessions, so you can watch it take shape.",
    readyEye: "READY TO SHIP",
    readyTitle: "Ready-made palettes",
    mailOnce:
      "Some pieces will never be released separately. Each edition is made once, then it becomes part of the people who received it.",
    availableFor: "AVAILABLE FOR",
    days: "DAYS",
    hours: "HOURS",
    minutes: "MIN",
    mailAdd: "Add this edition to basket",
  },
  tr: {
    heroEye: "AIDA'NIN ATÖLYESİNDEN",
    heroTitle: "Atölyeyi keşfet.",
    heroBody:
      "Aida'nın ürettiği orijinal resimler, baskılar ve küçük atölye edisyonları.",
    loading: "Mağaza yükleniyor",
    empty: "Bu koleksiyonda şu anda erişilebilir ürün yok.",
    available: "MEVCUT",
    sold: "SATILDI",
    add: "Sepete ekle",
    added: "Sepete eklendi",
    external: "Ürünü incele",
    customCta: "Kendi paletini tasarla",
    categories: {
      prints: [
        "SINIRLI EDİSYONLAR",
        "Baskılar",
        "Aida'nın orijinal eserlerinden hazırlanan sanat baskıları.",
      ],
      originals: [
        "TEK VE ÖZGÜN",
        "Orijinaller",
        "Aida'nın hazırladığı tek ve özgün yağlı pastel eserler.",
      ],
      palettes: [
        "MASAN İÇİN",
        "Suluboya Paletleri",
        "Gönderime hazır veya renklerine göre hazırlanan el yapımı paletler.",
      ],
      "mail-club": [
        "MAIL CLUB",
        "Saklayanlara özel, küçük bir sanat postası.",
        "Saklamak için hazırlanmış sanat, notlar ve küçük parçalardan oluşan bir zarf. Her edisyon bir kez hazırlanır, küçük bir koleksiyoner çevresine gönderilir ve tekrarlanmaz.",
      ],
      "animation-merch": [
        "ANİMASYON SERİSİNDEN",
        "Animasyon Ürünleri",
        "Aida'nın animasyon karakterleri dünyasından giyilebilir ve kullanışlı küçük parçalar.",
      ],
    },
    labels: {
      prints: "Baskılar",
      originals: "Orijinaller",
      palettes: "Paletler",
      "mail-club": "Mail Club",
      "animation-merch": "Animasyon Ürünleri",
    },
    paletteEye: "KİŞİYE ÖZEL PALET",
    paletteTitle: "Sana özel bir palet.",
    paletteBody:
      "El yapımı suluboya paletin için malzeme ve renklerini seç. Paletin Aida'nın TikTok CANLI yayınlarından birinde hazırlanabilir; böylece oluşumunu izleyebilirsin.",
    readyEye: "GÖNDERİME HAZIR",
    readyTitle: "Hazır paletler",
    mailOnce:
      "Bazı parçalar ayrı olarak hiçbir zaman yayınlanmaz. Her edisyon bir kez hazırlanır ve sonra onu alan insanların hikâyesine katılır.",
    availableFor: "KALAN SÜRE",
    days: "GÜN",
    hours: "SAAT",
    minutes: "DK",
    mailAdd: "Bu edisyonu sepete ekle",
  },
} as const;

export default function UnifiedShop() {
  const { locale } = useLocale();
  const t = copy[locale];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, loading: destinationLoading } = useShippingDestination();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const activeRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(Date.now());
  const local = destination?.countryCode === "TR";

  const readyPalettes = useMemo(
    () =>
      settings.readyMadePalettes
        .filter((item) => item.status === "available" && item.stock > 0)
        .sort(newestFirst),
    [settings.readyMadePalettes],
  );
  const customPaletteAvailable =
    settings.paletteSettings.enabled &&
    settings.paletteSettings.types.some((type) => type.enabled);
  const currentMail = settings.mailClubEditions.find((edition) => {
    const start = edition.availabilityStart
      ? Date.parse(edition.availabilityStart)
      : 0;
    const end = edition.availabilityEnd
      ? Date.parse(edition.availabilityEnd)
      : Infinity;
    return (
      edition.current &&
      edition.enabled &&
      edition.status === "published" &&
      edition.stock > 0 &&
      now >= start &&
      now < end
    );
  });
  const merch = international.products.filter(
    (product) =>
      settings.animationMerchProductIds.includes(product.id) &&
      product.available &&
      product.externalUrl,
  );
  const categories = useMemo(() => {
    const values: Category[] = ["prints"];
    if (local) {
      values.push("originals");
      if (customPaletteAvailable || readyPalettes.length)
        values.push("palettes");
      if (currentMail) values.push("mail-club");
    }
    if (merch.length) values.push("animation-merch");
    return values;
  }, [
    local,
    customPaletteAvailable,
    readyPalettes.length,
    currentMail,
    merch.length,
  ]);
  const requested = new URLSearchParams(search).get(
    "category",
  ) as Category | null;
  const category: Category =
    requested && categories.includes(requested) ? requested : "prints";

  usePageMeta(
    locale === "tr"
      ? "Atölyeyi keşfet | Aeda Art"
      : "Shop the Studio | Aeda Art",
    t.heroBody,
  );
  useEffect(() => {
    trackAnalytics("shop_view", {
      metadata: { countryCode: destination?.countryCode || "unknown" },
    });
  }, []);
  useEffect(() => {
    if (!currentMail?.availabilityEnd) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [currentMail?.availabilityEnd]);
  useEffect(() => {
    if (destinationLoading || international.loading) return;
    if (requested && !categories.includes(requested))
      navigate("/shop?category=prints", { replace: true });
  }, [
    categories,
    destinationLoading,
    international.loading,
    navigate,
    requested,
  ]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [category]);

  if (!destination) {
    return (
      <main className="unified-shop">
        <header className="section-shell unified-shop__header">
          <p className="eyebrow">{t.heroEye}</p>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroBody}</p>
          <DestinationControl compact />
        </header>
        <div
          className="section-shell storefront-catalog-skeleton"
          aria-label={t.loading}
        />
      </main>
    );
  }

  const intro = t.categories[category];
  const add = (item: Parameters<typeof addItemToCart>[0], max: number) => {
    const result = addItemToCart(item, max, "TR");
    toast({
      title: result.ok ? t.added : result.reason || t.empty,
      description: result.ok ? item.title : undefined,
      duration: 3000,
      className: result.ok
        ? "border-green/30 bg-[#edf6ed] text-ink"
        : undefined,
    });
  };

  return (
    <main className="unified-shop">
      <header className="section-shell unified-shop__header">
        <p className="eyebrow">{t.heroEye}</p>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroBody}</p>
        <DestinationControl compact />
      </header>
      <div className="unified-shop__rail-wrap">
        <nav
          className="section-shell unified-shop__filters"
          aria-label={
            locale === "tr" ? "Mağaza kategorileri" : "Shop categories"
          }
        >
          {categories.map((value) => (
            <button
              ref={category === value ? activeRef : undefined}
              type="button"
              key={value}
              onClick={() => navigate(`/shop?category=${value}`)}
              aria-current={category === value ? "page" : undefined}
            >
              {t.labels[value]}
            </button>
          ))}
        </nav>
      </div>
      <section className="section-shell unified-shop__collection-intro">
        <p className="eyebrow">{intro[0]}</p>
        <h2>{intro[1]}</h2>
        <p>{intro[2]}</p>
      </section>

      {category === "prints" && (
        <ProductCatalogue
          products={settings.printProducts
            .filter(
              (product) =>
                isPubliclyVisible(product) && !isAceoProduct(product),
            )
            .sort(newestFirst)}
          kind="prints"
          destination={destination!}
          locale={locale}
          international={international}
          empty={t.empty}
          sold={t.sold}
          externalProducts={international.products.filter(
            (product) =>
              !local &&
              !settings.animationMerchProductIds.includes(product.id) &&
              !settings.printProducts.some(
                (localProduct) =>
                  localProduct.fourthwallProductId === product.id ||
                  localProduct.fourthwallVariants?.some(
                    (variant) => variant.fourthwallProductId === product.id,
                  ),
              ),
          )}
        />
      )}
      {category === "originals" && (
        <ProductCatalogue
          products={settings.originalProducts
            .filter(isPubliclyVisible)
            .sort(newestFirst)}
          kind="originals"
          destination={destination!}
          locale={locale}
          international={international}
          empty={t.empty}
          sold={t.sold}
        />
      )}

      {category === "palettes" && (
        <div className="unified-shop__catalog">
          {customPaletteAvailable && (
            <section className="commerce-feature section-shell shop-palette-feature">
              <img
                src={settings.paletteSettings.coverImage}
                alt={
                  locale === "tr"
                    ? "El yapımı suluboya paleti"
                    : "Handmade watercolor palette"
                }
              />
              <div className="commerce-feature__panel">
                <p className="eyebrow">{t.paletteEye}</p>
                <h2>{t.paletteTitle}</h2>
                <p>{t.paletteBody}</p>
                <ProductPrice
                  regularPriceMinor={settings.paletteSettings.priceMinor}
                  currency="TRY"
                  sale={settings.paletteSettings.sale}
                />
                <Link
                  href="/shop/palettes/custom"
                  onClick={() =>
                    trackAnalytics("custom_palette_started", {
                      metadata: { locale, shippingCountry: "TR" },
                    })
                  }
                >
                  {t.customCta} →
                </Link>
              </div>
            </section>
          )}
          {readyPalettes.length > 0 && (
            <section className="section-shell shop-subcollection">
              <header>
                <p className="eyebrow">{t.readyEye}</p>
                <h3>{t.readyTitle}</h3>
              </header>
              <div className="shop-ready-grid">
                {readyPalettes.map((palette) => (
                  <article className="shop-ready-card" key={palette.id}>
                    <img
                      src={palette.imageUrl}
                      alt={palette.altText || palette.name}
                      loading="lazy"
                    />
                    <div className="shop-ready-card__title">
                      <h4>
                        {locale === "tr" && palette.nameTr
                          ? palette.nameTr
                          : palette.name}
                      </h4>
                      <ProductPrice
                        regularPriceMinor={palette.priceMinor}
                        currency="TRY"
                        sale={palette.sale}
                        compact
                      />
                    </div>
                    <p>
                      {palette.colors ||
                        (locale === "tr" && palette.descriptionTr
                          ? palette.descriptionTr
                          : palette.description)}
                    </p>
                    {palette.note && <p>{palette.note}</p>}
                    <button
                      type="button"
                      onClick={() =>
                        add(
                          {
                            id: `ready-palette-${palette.id}`,
                            productId: palette.id,
                            kind: "ready-palette",
                            title: palette.name,
                            imageUrl: palette.imageUrl,
                            priceUsdCents: palette.priceMinor,
                            canonicalCurrency: "TRY",
                            canonicalPriceMinor: palette.priceMinor,
                            quantity: 1,
                          },
                          palette.stock,
                        )
                      }
                    >
                      {t.add}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {category === "mail-club" && currentMail && (
        <section className="commerce-feature commerce-feature--mail section-shell unified-shop__mail">
          <img
            src={currentMail.coverImage}
            alt={
              locale === "tr" && currentMail.altTextTr
                ? currentMail.altTextTr
                : currentMail.altText
            }
          />
          <div className="commerce-feature__panel">
            <p className="eyebrow">{currentMail.monthYear}</p>
            <h2>
              {locale === "tr" && currentMail.titleTr
                ? currentMail.titleTr
                : currentMail.title}
            </h2>
            <p>
              {locale === "tr" && currentMail.descriptionTr
                ? currentMail.descriptionTr
                : currentMail.description}
            </p>
            <p>{t.mailOnce}</p>
            <MailCountdown
              end={currentMail.availabilityEnd}
              now={now}
              text={t}
            />
            <ProductPrice
              regularPriceMinor={currentMail.priceMinor}
              currency="TRY"
              sale={currentMail.sale}
            />
            <button
              type="button"
              onClick={() =>
                add(
                  {
                    id: `mail-club-${currentMail.id}`,
                    productId: currentMail.id,
                    kind: "mail-club",
                    title: currentMail.title,
                    imageUrl: currentMail.coverImage,
                    priceUsdCents: currentMail.priceMinor,
                    canonicalCurrency: "TRY",
                    canonicalPriceMinor: currentMail.priceMinor,
                    quantity: 1,
                    metadata: {
                      editionTitle: currentMail.title,
                      editionMonth: currentMail.monthYear,
                    },
                  },
                  currentMail.stock,
                )
              }
            >
              {t.mailAdd}
            </button>
          </div>
        </section>
      )}

      {category === "animation-merch" && (
        <section className="section-shell unified-shop__catalog">
          <div className="shop-merch-grid">
            {merch.map((product) => (
              <a
                key={product.id}
                href={`/shop/fourthwall/${product.slug}`}
                className="shop-merch-card"
                aria-label={`${product.name}, ${t.external}`}
                onClick={() =>
                  trackAnalytics("animation_merch_clicked", {
                    entityId: product.id,
                    metadata: {
                      locale,
                      shippingCountry: destination?.countryCode || "unknown",
                    },
                  })
                }
              >
                <img
                  src={product.primaryImage?.url}
                  alt={product.primaryImage?.alt || product.name}
                  loading="lazy"
                />
                <div>
                  <h3>{product.name}</h3>
                  <span>{product.price.formatted}</span>
                </div>
                <p>
                  {t.labels["animation-merch"]} · {t.external} →
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ProductCatalogue({
  products,
  kind,
  destination,
  locale,
  international,
  empty,
  sold,
  externalProducts = [],
}: {
  products: ManagedProduct[];
  kind: "prints" | "originals";
  destination: ShippingDestination;
  locale: "en" | "tr";
  international: ReturnType<typeof useInternationalProducts>;
  empty: string;
  sold: string;
  externalProducts?: ReturnType<typeof useInternationalProducts>["products"];
}) {
  const local = destination.countryCode === "TR";
  const visible =
    kind === "originals"
      ? products.filter((product) => product.availableInTurkiye !== false)
      : products.filter(
          (product) =>
            (local && product.availableInTurkiye !== false) ||
            product.fourthwallProductId ||
            product.fourthwallProductUrl ||
            product.fourthwallVariants?.some((variant) => variant.enabled),
        );
  return (
    <section className="section-shell unified-shop__catalog">
      {visible.length || externalProducts.length ? (
        <div className="unified-product-grid">
          {visible.map((product) => {
            const linked = international.products.find(
              (item) => item.id === product.fourthwallProductId,
            );
            const fallback =
              product.fourthwallProductUrl &&
              isSafeFourthwallUrl(
                product.fourthwallProductUrl,
                international.shopUrl,
              )
                ? product.fourthwallProductUrl
                : "";
            const variants = getFourthwallVariants(
              product,
              international.products,
              international.shopUrl,
            );
            const cardVariant = getLowestFourthwallVariant(variants);
            const presentation = resolveProductPresentation(
              product,
              destination,
              cardVariant?.product || linked,
              cardVariant?.href || fallback,
            );
            const href = `/shop/${kind === "originals" ? "originals" : "prints"}/${product.slug || product.id}`;
            const price =
              presentation.amountMinor !== null && presentation.currency ? (
                local ? (
                  <ProductPrice
                    regularPriceMinor={presentation.amountMinor}
                    currency={presentation.currency}
                    sale={product.sale}
                    compact
                  />
                ) : (
                  <Money
                    baseAmountUsdCents={presentation.amountMinor}
                    canonicalCurrency={presentation.currency}
                  />
                )
              ) : (
                presentation.externalPrice || undefined
              );
            return (
              <EditorialProductCard
                key={product.id}
                href={href}
                image={product.imageUrl}
                alt={product.altText || product.name}
                title={product.name}
                price={price}
                metadata={`${kind === "originals" ? (locale === "tr" ? "ORİJİNAL" : "ORIGINAL") : locale === "tr" ? "BASKI" : "PRINT"} · ${isSoldOut(product) ? sold : locale === "tr" ? "MEVCUT" : "AVAILABLE"}`}
                status={isSoldOut(product) ? "sold" : presentation.availability}
                onNavigate={() =>
                  trackAnalytics("product_view", {
                    entityId: product.id,
                    entityName: product.name,
                  })
                }
              />
            );
          })}
          {externalProducts.map((product) => (
            <InternationalProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="unified-shop__empty">{empty}</p>
      )}
    </section>
  );
}

function MailCountdown({
  end,
  now,
  text,
}: {
  end?: string;
  now: number;
  text: typeof copy.en | typeof copy.tr;
}) {
  if (!end) return null;
  const remaining = Math.max(0, Date.parse(end) - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return (
    <div className="mail-club-countdown">
      <span>{text.availableFor}</span>
      <strong>
        {String(days).padStart(2, "0")} {text.days} ·{" "}
        {String(hours).padStart(2, "0")} {text.hours} ·{" "}
        {String(minutes).padStart(2, "0")} {text.minutes}
      </strong>
    </div>
  );
}
