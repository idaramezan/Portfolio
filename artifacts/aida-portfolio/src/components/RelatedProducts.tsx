import Money from "@/components/Money";
import { useInternationalProducts } from "@/hooks/use-international";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { getArtworkImage } from "@/lib/assets";
import { useLocale } from "@/lib/locale";
import { isPurchasable, isSoldOut } from "@/lib/product-status";
import { useShippingDestination } from "@/lib/shipping-destination";
import type { ManagedProduct } from "@/lib/store";
import { getPrintStartingPrice, isAceoProduct } from "@/lib/turkiye-products";
import {
  getFourthwallVariants,
  getLowestFourthwallVariant,
} from "@/lib/fourthwall-variants";
import EditorialProductCard from "@/components/EditorialProductCard";

function productType(product: ManagedProduct) {
  if (product.kind === "original") return "original";
  return product.category || product.printType?.toLowerCase() || "print";
}

function typeLabel(product: ManagedProduct, locale: "en" | "tr") {
  if (product.kind === "original")
    return locale === "tr" ? "ORİJİNAL ESER" : "ORIGINAL ART";
  const labels = {
    aceo: locale === "tr" ? "ACEO ORİJİNAL" : "ACEO ORIGINAL",
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
  if (currentProduct.kind === "original" && destination && !isTürkiye)
    return null;
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
          <h2 id="related-products-title">
            {locale === "tr" ? "DAHA FAZLASINI GÖR" : "MORE TO SEE"}
          </h2>
        </header>
        <div className="related-products__grid">
          {related.map((product, index) => {
            const linked = product.fourthwallProductId
              ? international.products.find(
                  (item) => item.id === product.fourthwallProductId,
                )
              : undefined;
            const variants = getFourthwallVariants(
              product,
              international.products,
              international.shopUrl,
            );
            const cardVariant = getLowestFourthwallVariant(variants);
            const localPrice =
              product.category === "print"
                ? getPrintStartingPrice(
                    product.priceUsdCents,
                    product.printOptions,
                  )
                : (product.priceMinor ?? product.priceUsdCents);
            const internationalPrice =
              cardVariant?.product?.price?.formatted ||
              linked?.price?.formatted;
            const price = !destination ? undefined : isTürkiye ? (
              <Money
                baseAmountUsdCents={localPrice}
                canonicalCurrency={product.kind === "original" ? "USD" : "TRY"}
              />
            ) : cardVariant?.available && internationalPrice ? (
              internationalPrice
            ) : undefined;
            return (
              <EditorialProductCard
                key={product.id}
                href={
                  product.kind === "original"
                    ? `/shop/originals/${product.slug || product.id}`
                    : isAceoProduct(product)
                      ? `/shop/aceos/${product.slug || product.id}`
                      : `/shop/prints/${product.slug || product.id}`
                }
                image={getArtworkImage(product, index)}
                alt={product.altText || product.name}
                title={product.name}
                price={price}
                pricePrefix={
                  !isTürkiye &&
                  variants.filter((variant) => variant.available).length > 1
                    ? locale === "tr"
                      ? "BAŞLANGIÇ"
                      : "FROM"
                    : undefined
                }
                metadata={`${typeLabel(product, locale)} · ${isSoldOut(product) ? (locale === "tr" ? "SATILDI" : "SOLD") : locale === "tr" ? "MEVCUT" : "AVAILABLE"}`}
                status={isSoldOut(product) ? "sold" : "available"}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
