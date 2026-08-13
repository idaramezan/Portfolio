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

type Filter = "all" | "originals" | "prints" | "100-windows";
const copy = {
  en: {
    eyebrow: "FROM AIDA'S ISTANBUL STUDIO",
    title: "Shop the studio.",
    body: "Original paintings, prints and small studio editions made by Aida in Istanbul.",
    all: "All",
    originals: "Original Art",
    prints: "Prints & Goods",
    windows: "100 Windows",
    sold: "Sold",
    view: "View piece",
    local: "Prepared in Aida's studio",
    fourthwall: "Fulfilled through Aida's print partner",
    request: "Delivery available by request",
    us: "Unavailable for US delivery",
    noImage: "Image coming soon",
    empty: "No pieces are available in this category right now.",
  },
  tr: {
    eyebrow: "AIDA'NIN İSTANBUL ATÖLYESİNDEN",
    title: "Atölyeyi keşfet.",
    body: "Aida'nın İstanbul'da ürettiği orijinal resimler, baskılar ve küçük atölye edisyonları.",
    all: "Tümü",
    originals: "Orijinal Eserler",
    prints: "Baskılar ve Ürünler",
    windows: "100 Windows",
    sold: "Satıldı",
    view: "Eseri görüntüle",
    local: "Aida'nın atölyesinde hazırlanır",
    fourthwall: "Fourthwall üzerinden uluslararası baskı",
    request: "Uluslararası teslimat talebi",
    us: "ABD'ye gönderilemiyor",
    noImage: "Görsel yakında",
    empty: "Bu kategoride şu anda erişilebilir eser yok.",
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
  const { destination } = useShippingDestination();
  const [, navigate] = useLocation();
  const search = useSearch();
  const requested = new URLSearchParams(search).get(
    "category",
  ) as Filter | null;
  const filter: Filter = ["originals", "prints", "100-windows"].includes(
    requested || "",
  )
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
    const originals = settings.originalProducts.filter(isPubliclyVisible);
    const prints = settings.printProducts.filter(isPubliclyVisible);
    if (filter === "originals") return originals;
    if (filter === "prints") return prints;
    if (filter === "100-windows")
      return prints.filter((product) => product.isHundredWindowsProduct);
    return [...originals, ...prints].sort(
      (a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""),
    );
  }, [settings.originalProducts, settings.printProducts, filter]);

  const filters: Array<[Filter, string]> = [
    ["all", c.all],
    ["originals", c.originals],
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
      <section className="section-shell unified-shop__catalog">
        {products.length ? (
          <div className="unified-product-grid">
            {products.map((product) => {
              const original = product.kind === "original";
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
              const href = `/shop/${original ? "originals" : "prints"}/${product.slug || product.id}`;
              return (
                <article className="unified-product-card" key={product.id}>
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
                        {original ? c.originals : product.category || c.prints}
                      </p>
                      <h2>{product.name}</h2>
                      <p className="unified-product-card__fulfillment">
                        {presentation.shippingMessage}
                      </p>
                      {presentation.amountMinor !== null &&
                        presentation.currency && (
                          <Money
                            baseAmountUsdCents={presentation.amountMinor}
                            canonicalCurrency={presentation.currency}
                            className="unified-product-card__price"
                          />
                        )}
                      {presentation.externalPrice && (
                        <strong className="unified-product-card__price">
                          {presentation.externalPrice}
                        </strong>
                      )}
                      {presentation.availability === "loading" && (
                        <span
                          className="price-skeleton unified-product-card__price"
                          aria-label={
                            locale === "tr"
                              ? "Fiyat yükleniyor"
                              : "Price loading"
                          }
                        />
                      )}
                      <span>{c.view} →</span>
                    </div>
                  </Link>
                </article>
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
