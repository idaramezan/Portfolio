import { Link } from "wouter";
import Money from "@/components/Money";
import { useInternationalProducts } from "@/hooks/use-international";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { getArtworkImage } from "@/lib/assets";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { useLocale } from "@/lib/locale";
import { isPurchasable } from "@/lib/product-status";
import { useShippingDestination } from "@/lib/shipping-destination";
import type { ManagedProduct } from "@/lib/store";
import { getPrintStartingPrice } from "@/lib/turkiye-products";

function productType(product: ManagedProduct) {
  if (product.kind === "original") return "original";
  return product.category || product.printType?.toLowerCase() || "print";
}

function typeLabel(product: ManagedProduct, locale: "en" | "tr") {
  if (product.kind === "original")
    return locale === "tr" ? "ORİJİNAL ESER" : "ORIGINAL ART";
  const labels = {
    sticker: locale === "tr" ? "STICKER" : "STICKER",
    tshirt: locale === "tr" ? "TİŞÖRT" : "T-SHIRT",
    mug: locale === "tr" ? "KUPA" : "MUG",
  } as const;
  return (
    labels[product.category as keyof typeof labels] ||
    (locale === "tr" ? "SANAT BASKISI" : "ART PRINT")
  );
}

function newestFirst(a: ManagedProduct, b: ManagedProduct) {
  const date = (product: ManagedProduct) =>
    Date.parse(product.updatedAt || product.createdAt || "") || 0;
  return date(b) - date(a) || b.id.localeCompare(a.id);
}

export default function RelatedProducts({
  currentProduct,
}: {
  currentProduct: ManagedProduct;
}) {
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, isTürkiye } = useShippingDestination();
  const { locale } = useLocale();
  const source =
    currentProduct.kind === "original"
      ? settings.originalProducts
      : settings.printProducts;
  const related = source
    .filter(
      (product) =>
        product.id !== currentProduct.id &&
        productType(product) === productType(currentProduct) &&
        isPurchasable(product) &&
        Boolean(product.name?.trim()),
    )
    .sort(newestFirst)
    .slice(0, 3);

  if (!related.length) return null;

  return (
    <section
      className="related-products"
      aria-labelledby="related-products-title"
    >
      <div className="section-shell related-products__inner">
        <header className="related-products__header">
          <p className="eyebrow">
            {locale === "tr"
              ? "ATÖLYEDEN DAHA FAZLASI"
              : "MORE FROM THE STUDIO"}
          </p>
          <h2 id="related-products-title">
            {locale === "tr"
              ? "Bunlar da ilgini çekebilir"
              : "You might also like"}
          </h2>
        </header>
        <div className="related-products__grid">
          {related.map((product, index) => {
            const linked = product.fourthwallProductId
              ? international.products.find(
                  (item) => item.id === product.fourthwallProductId,
                )
              : undefined;
            const fallback =
              product.fourthwallProductUrl &&
              isSafeFourthwallUrl(
                product.fourthwallProductUrl,
                international.shopUrl,
              )
                ? product.fourthwallProductUrl
                : "";
            const hasInternationalEdition = Boolean(
              (linked?.externalUrl || fallback) && linked?.available !== false,
            );
            const localPrice =
              product.category === "print"
                ? getPrintStartingPrice(
                    product.priceUsdCents,
                    product.printOptions,
                  )
                : (product.priceMinor ?? product.priceUsdCents);
            return (
              <Link
                key={product.id}
                href={
                  product.kind === "original"
                    ? `/shop/originals/${product.slug || product.id}`
                    : `/shop/prints/${product.slug || product.id}`
                }
                className="related-product-card"
              >
                <span className="related-product-card__media">
                  <img
                    src={getArtworkImage(product, index)}
                    alt={product.altText || product.name}
                    width="640"
                    height="640"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getArtworkImage(
                        { ...product, imageUrl: "" },
                        index,
                      );
                    }}
                  />
                </span>
                <span className="related-product-card__body">
                  <small>{typeLabel(product, locale)}</small>
                  <strong>{product.name}</strong>
                  <span className="related-product-card__price">
                    {!destination ? (
                      locale === "tr" ? (
                        "Fiyatı görmek için ülke seç"
                      ) : (
                        "Choose a country to see price"
                      )
                    ) : isTürkiye ? (
                      <Money
                        baseAmountUsdCents={localPrice}
                        canonicalCurrency={
                          product.kind === "original" ? "USD" : "TRY"
                        }
                      />
                    ) : product.kind === "original" ? (
                      <Money baseAmountUsdCents={product.priceUsdCents} />
                    ) : hasInternationalEdition && linked?.price?.formatted ? (
                      linked.price.formatted
                    ) : locale === "tr" ? (
                      "Uluslararası edisyonu görüntüle"
                    ) : (
                      "View international availability"
                    )}
                  </span>
                  <b>
                    {locale === "tr" ? "Detayları gör →" : "View details →"}
                  </b>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
