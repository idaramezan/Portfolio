import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import {
  useShippingDestination,
  DestinationControl,
} from "@/lib/shipping-destination";
import { useLocale } from "@/lib/locale";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import type { ManagedProduct } from "@/lib/store";
import Money from "@/components/Money";
import { usePageMeta } from "@/hooks/use-page-meta";
import { trackAnalytics } from "@/lib/analytics";
import { resolveProductPresentation } from "@/lib/product-presentation";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { isAceoProduct } from "@/lib/turkiye-products";
import {
  getFourthwallVariants,
  getLowestFourthwallVariant,
} from "@/lib/fourthwall-variants";
import EditorialProductCard from "@/components/EditorialProductCard";

type Filter = "originals" | "prints";

const newestFirst = (a: ManagedProduct, b: ManagedProduct) =>
  (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0);

const copy = {
  en: {
    eyebrow: "FROM AIDA'S STUDIO",
    title: "Shop the studio.",
    body: "Original paintings, prints and small studio editions made by Aida.",
    all: "All",
    originals: "Originals",
    prints: "Prints",
    aceos: "ACEOs",
    sold: "Sold",
    view: "View piece",
    fourthwall: "Fulfilled through Aida's print partner",
    request: "Delivery available by request",
    us: "Unavailable for US delivery",
    noImage: "Image coming soon",
    empty: "No pieces are available in this category right now.",
    aceoEyebrow: "TINY ORIGINALS · PAINTED LIVE",
    aceoTitle: "Little artworks. Only one of each.",
    aceoBody:
      "Each ACEO is a tiny original painting created live in Aida's studio. At just 2.5 × 3.5 inches, they're made for collectors who want a one-of-one piece in a smaller format and at a more accessible starting price.",
    aceoMeta:
      "One original · Painted live · 6.4 × 8.9 cm · Free delivery in Türkiye",
    aceoOnlyTitle: "ACEOs are currently available in Türkiye only.",
    aceoOnlyBody:
      "You can still explore the collection from anywhere. Checkout for these one-of-one originals is currently limited to delivery addresses in Türkiye.",
    collectedTitle: "All current ACEOs have been collected.",
    collectedBody:
      "New tiny originals are painted live. Follow the studio to see the next ones first.",
    emptyEyebrow: "THE TINY COLLECTION IS FORMING",
    emptyAceo: "No ACEOs are available right now.",
    emptyAceoBody:
      "Aida paints these one-of-one miniatures live. Follow the streams or join the Newsletter to catch the next drop.",
  },
  tr: {
    eyebrow: "AIDA'NIN ATÖLYESİNDEN",
    title: "Atölyeyi keşfet.",
    body: "Aida'nın ürettiği orijinal resimler, baskılar ve küçük atölye edisyonları.",
    all: "Tümü",
    originals: "Orijinal Eserler",
    prints: "Baskılar",
    aceos: "ACEO'lar",
    sold: "Satıldı",
    view: "Eseri görüntüle",
    fourthwall: "Fourthwall üzerinden uluslararası baskı",
    request: "Uluslararası teslimat talebi",
    us: "ABD'ye gönderilemiyor",
    noImage: "Görsel yakında",
    empty: "Bu kategoride şu anda erişilebilir eser yok.",
    aceoEyebrow: "MİNİK ORİJİNALLER · CANLI YAYINDA BOYANDI",
    aceoTitle: "Küçücük eserler. Her birinden yalnızca bir tane.",
    aceoBody:
      "Her ACEO, Aida'nın atölyesinde canlı yayında boyadığı minik ve tamamen orijinal bir eserdir. Yalnızca 6,4 × 8,9 cm boyutundaki bu çalışmalar, koleksiyonuna daha küçük bir format ve daha ulaşılabilir bir başlangıç fiyatıyla özgün bir eser eklemek isteyenler için.",
    aceoMeta:
      "Tek ve özgün · Canlı yayında boyandı · 6,4 × 8,9 cm · Türkiye'de ücretsiz teslimat",
    aceoOnlyTitle: "ACEO'lar şu anda yalnızca Türkiye'de satışta.",
    aceoOnlyBody:
      "Koleksiyonu dünyanın her yerinden inceleyebilirsin. Bu tek ve özgün eserler için satın alma şu anda yalnızca Türkiye teslimat adreslerinde kullanılabilir.",
    collectedTitle: "Mevcut ACEO'ların tamamı koleksiyonlara katıldı.",
    collectedBody:
      "Yeni minik orijinaller canlı yayında boyanıyor. Sıradakileri ilk görmek için atölyeyi takip edebilirsin.",
    emptyEyebrow: "MİNİK KOLEKSİYON HAZIRLANIYOR",
    emptyAceo: "Şu anda satışta ACEO bulunmuyor.",
    emptyAceoBody:
      "Aida bu tek ve özgün minyatürleri canlı yayında boyuyor. Sıradaki eser için yayınları takip edebilir veya Newsletter'a katılabilirsin.",
  },
} as const;

export default function UnifiedShop() {
  const { locale } = useLocale();
  const c = copy[locale];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, loading: destinationLoading } = useShippingDestination();
  const [, navigate] = useLocation();
  const search = useSearch();
  const requested = new URLSearchParams(search).get(
    "category",
  ) as Filter | null;
  const filter: Filter =
    requested === "originals" && destination?.countryCode === "TR"
      ? "originals"
      : "prints";
  usePageMeta(
    locale === "tr"
      ? "Atölyeyi keşfet | Aeda Art"
      : "Shop the Studio | Aeda Art",
    c.body,
  );
  useEffect(() => {
    trackAnalytics("shop_view", {
      metadata: { countryCode: destination?.countryCode || "unknown" },
    });
  }, []);

  const products = useMemo(() => {
    if (!destination) return [];
    const originals = settings.originalProducts
      .filter(isPubliclyVisible)
      .sort(newestFirst);
    const prints = settings.printProducts
      .filter(isPubliclyVisible)
      .sort(newestFirst);
    if (filter === "originals") return originals;
    if (filter === "originals" && destination.countryCode === "TR")
      return originals;
    return prints.filter((product) => !isAceoProduct(product));
  }, [settings.originalProducts, settings.printProducts, filter, destination]);

  const filters: Array<[Filter, string]> = [["prints", c.prints]];
  if (destination?.countryCode === "TR")
    filters.push(["originals", c.originals]);
  return (
    <main className="unified-shop">
      <header className="section-shell unified-shop__header">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <p>
          {destination?.countryCode === "TR"
            ? c.body
            : locale === "tr"
              ? "Aida'nın eserlerinden hazırlanan sanat baskıları."
              : "Art prints made from Aida's original work."}
        </p>
        <DestinationControl compact />
      </header>
      <nav
        className="section-shell unified-shop__filters"
        aria-label={locale === "tr" ? "Mağaza kategorileri" : "Shop categories"}
      >
        {filters.map(([value, label]) => (
          <button
            type="button"
            key={value}
            onClick={() => navigate(`/shop?category=${value}`)}
            aria-current={filter === value ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      <section className="section-shell unified-shop__catalog">
        {destinationLoading && !destination ? (
          <div
            className="storefront-catalog-skeleton"
            aria-label="Loading shop"
          />
        ) : products.length ? (
          <div className="unified-product-grid">
            {products.map((product) => {
              const original = product.kind === "original";
              const aceo = isAceoProduct(product);
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
              const href = `/shop/${original ? "originals" : aceo ? "aceos" : "prints"}/${product.slug || product.id}`;
              const price =
                aceo && destination?.countryCode === "TR" ? (
                  <Money
                    baseAmountUsdCents={
                      product.priceMinor ?? product.priceUsdCents
                    }
                    canonicalCurrency="TRY"
                  />
                ) : !aceo &&
                  presentation.amountMinor !== null &&
                  presentation.currency ? (
                  <Money
                    baseAmountUsdCents={presentation.amountMinor}
                    canonicalCurrency={presentation.currency}
                  />
                ) : !aceo && presentation.externalPrice ? (
                  presentation.externalPrice
                ) : !aceo && presentation.availability === "loading" ? (
                  <span
                    className="price-skeleton"
                    aria-label={
                      locale === "tr" ? "Fiyat yükleniyor" : "Price loading"
                    }
                  />
                ) : undefined;
              return (
                <EditorialProductCard
                  key={product.id}
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
                  metadata={`${original ? c.originals : aceo ? "ACEO · ORIGINAL" : "PRINT"} · ${isSoldOut(product) ? c.sold : locale === "tr" ? "MEVCUT" : "AVAILABLE"}`}
                  status={
                    isSoldOut(product) ? "sold" : presentation.availability
                  }
                  onNavigate={() =>
                    trackAnalytics("product_view", {
                      entityId: product.id,
                      entityName: product.name,
                    })
                  }
                />
              );
            })}
          </div>
        ) : (
          <p className="unified-shop__empty">{c.empty}</p>
        )}
      </section>
    </main>
  );
}
