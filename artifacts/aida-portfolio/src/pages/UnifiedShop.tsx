import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Image as ImageIcon } from "lucide-react";
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

type Filter = "all" | "originals" | "aceos" | "prints" | "100-windows";

const newestFirst = (a: ManagedProduct, b: ManagedProduct) =>
  (Date.parse(b.createdAt || "") || 0) -
  (Date.parse(a.createdAt || "") || 0);

const copy = {
  en: {
    eyebrow: "FROM AIDA'S ISTANBUL STUDIO",
    title: "Shop the studio.",
    body: "Original paintings, prints and small studio editions made by Aida in Istanbul.",
    all: "All",
    originals: "Original Art",
    prints: "Prints & Goods",
    aceos: "ACEOs",
    windows: "100 Windows",
    sold: "Sold",
    view: "View piece",
    local: "Prepared in Aida's studio",
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
    eyebrow: "AIDA'NIN İSTANBUL ATÖLYESİNDEN",
    title: "Atölyeyi keşfet.",
    body: "Aida'nın İstanbul'da ürettiği orijinal resimler, baskılar ve küçük atölye edisyonları.",
    all: "Tümü",
    originals: "Orijinal Eserler",
    prints: "Baskılar ve Ürünler",
    aceos: "ACEO'lar",
    windows: "100 Windows",
    sold: "Satıldı",
    view: "Eseri görüntüle",
    local: "Aida'nın atölyesinde hazırlanır",
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

function ProductImage({
  product,
  noImage,
}: {
  product: ManagedProduct;
  noImage: string;
}) {
  const [failed, setFailed] = useState(!product.imageUrl);
  return (
    <div className="unified-product-card__media">
      {failed ? (
        <span>
          <ImageIcon aria-hidden="true" />
          {noImage}
        </span>
      ) : (
        <img
          src={product.imageUrl}
          alt={product.altText || product.name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function UnifiedShop() {
  const { locale } = useLocale();
  const c = copy[locale];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, openDestination } = useShippingDestination();
  const [, navigate] = useLocation();
  const search = useSearch();
  const requested = new URLSearchParams(search).get(
    "category",
  ) as Filter | null;
  const filter: Filter = [
    "originals",
    "aceos",
    "prints",
    "100-windows",
  ].includes(requested || "")
    ? requested!
    : "all";
  usePageMeta(
    locale === "tr"
      ? "Atölyeyi keşfet | Aida Ramezani"
      : "Shop the Studio | Aida Ramezani",
    c.body,
  );
  useEffect(() => {
    trackAnalytics("shop_view", {
      metadata: { countryCode: destination?.countryCode || "unknown" },
    });
  }, []);

  const products = useMemo(() => {
    const originals = settings.originalProducts
      .filter(isPubliclyVisible)
      .sort(newestFirst);
    const prints = settings.printProducts
      .filter(isPubliclyVisible)
      .sort(newestFirst);
    if (filter === "originals") return originals;
    if (filter === "aceos")
      return prints.filter(isAceoProduct);
    if (filter === "prints")
      return prints.filter((product) => !isAceoProduct(product));
    if (filter === "100-windows")
      return prints.filter((product) => product.isHundredWindowsProduct);
    return [...originals, ...prints].sort(newestFirst);
  }, [settings.originalProducts, settings.printProducts, filter]);

  const filters: Array<[Filter, string]> = [
    ["all", c.all],
    ["originals", c.originals],
    ["aceos", c.aceos],
    ["prints", c.prints],
    ["100-windows", c.windows],
  ];
  return (
    <main className="unified-shop">
      <header className="section-shell unified-shop__header">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <p>{c.body}</p>
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
            onClick={() =>
              navigate(value === "all" ? "/shop" : `/shop?category=${value}`)
            }
            aria-current={filter === value ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      {filter === "aceos" && (
        <section className="section-shell aceo-intro">
          <p className="eyebrow">{c.aceoEyebrow}</p>
          <h2>{c.aceoTitle}</h2>
          <p>{c.aceoBody}</p>
          <strong>{c.aceoMeta}</strong>
          {destination && destination.countryCode !== "TR" && (
            <div className="aceo-availability-note">
              <h3>{c.aceoOnlyTitle}</h3>
              <p>{c.aceoOnlyBody}</p>
              <button
                type="button"
                className="button-link"
                onClick={() => openDestination()}
              >
                {locale === "tr"
                  ? "Gönderim ülkesini değiştir"
                  : "Change shipping country"}
              </button>
            </div>
          )}
          {products.length > 0 && products.every(isSoldOut) && (
            <div className="aceo-collected-note">
              <h3>{c.collectedTitle}</h3>
              <p>{c.collectedBody}</p>
            </div>
          )}
        </section>
      )}
      <section className="section-shell unified-shop__catalog">
        {products.length ? (
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
              const presentation = resolveProductPresentation(
                product,
                destination,
                linked,
                fallback,
              );
              const href = `/shop/${original ? "originals" : aceo ? "aceos" : "prints"}/${product.slug || product.id}`;
              return (
                <article
                  className={`unified-product-card ${aceo ? "unified-product-card--aceo" : ""}`}
                  key={product.id}
                >
                  <Link
                    href={href}
                    onClick={() =>
                      trackAnalytics("product_view", {
                        entityId: product.id,
                        entityName: product.name,
                      })
                    }
                  >
                    <ProductImage product={product} noImage={c.noImage} />
                    <div className="unified-product-card__body">
                      <p className="eyebrow">
                        {original
                          ? c.originals
                          : aceo
                            ? "ACEO ORIGINAL"
                            : product.category || c.prints}
                      </p>
                      <h2>{product.name}</h2>
                      {aceo && (
                        <p className="aceo-card__metadata">
                          {locale === "tr"
                            ? "Canlı yayında boyandı · Tek ve özgün"
                            : "Painted live · One of one"}
                          <br />
                          6.4 × 8.9 cm
                        </p>
                      )}
                      <p className="unified-product-card__fulfillment">
                        {aceo
                          ? destination?.countryCode === "TR"
                            ? locale === "tr"
                              ? "Türkiye'de ücretsiz teslimat"
                              : "Free shipping in Türkiye"
                            : locale === "tr"
                              ? "Yalnızca Türkiye"
                              : "Türkiye only"
                          : presentation.shippingMessage}
                      </p>
                      {aceo && destination?.countryCode === "TR" ? (
                        <Money
                          baseAmountUsdCents={
                            product.priceMinor ?? product.priceUsdCents
                          }
                          canonicalCurrency="TRY"
                          className="unified-product-card__price"
                        />
                      ) : (
                        !aceo &&
                        presentation.amountMinor !== null &&
                        presentation.currency && (
                          <Money
                            baseAmountUsdCents={presentation.amountMinor}
                            canonicalCurrency={presentation.currency}
                            className="unified-product-card__price"
                          />
                        )
                      )}
                      {!aceo && presentation.externalPrice && (
                        <strong className="unified-product-card__price">
                          {presentation.externalPrice}
                        </strong>
                      )}
                      {!aceo && presentation.availability === "loading" && (
                        <span
                          className="price-skeleton unified-product-card__price"
                          aria-label={
                            locale === "tr"
                              ? "Fiyat yükleniyor"
                              : "Price loading"
                          }
                        />
                      )}
                      <span>
                        {aceo
                          ? locale === "tr"
                            ? "Detayları gör"
                            : "View details"
                          : c.view}{" "}
                        →
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : filter === "aceos" ? (
          <div className="unified-shop__empty aceo-empty-state">
            <p className="eyebrow">{c.emptyEyebrow}</p>
            <h2>{c.emptyAceo}</h2>
            <p>{c.emptyAceoBody}</p>
            <div>
              {[
                settings.siteLinks.twitchUrl,
                settings.siteLinks.tiktokUrl,
                settings.siteLinks.kickUrl,
              ].find(Boolean) && (
                <a
                  className="button-secondary"
                  href={[
                    settings.siteLinks.twitchUrl,
                    settings.siteLinks.tiktokUrl,
                    settings.siteLinks.kickUrl,
                  ].find(Boolean)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "tr"
                    ? "Aida'yı canlı izle"
                    : "Watch Aida paint live"}
                </a>
              )}
              <Link
                href="/newsletter"
                className="paper-button paper-button--pink paper-button--md"
              >
                {locale === "tr" ? "Newsletter'a katıl" : "Join the Newsletter"}
              </Link>
            </div>
          </div>
        ) : (
          <p className="unified-shop__empty">{c.empty}</p>
        )}
      </section>
    </main>
  );
}
