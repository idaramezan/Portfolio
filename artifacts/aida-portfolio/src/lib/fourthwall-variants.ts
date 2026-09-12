import type { InternationalProduct } from "@/lib/fourthwall";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import type { ManagedProduct, ProductFourthwallVariant } from "@/lib/store";

export type ResolvedFourthwallVariant = ProductFourthwallVariant & {
  product?: InternationalProduct;
  href: string;
  available: boolean;
};

export function getFourthwallVariants(
  product: ManagedProduct,
  catalogue: InternationalProduct[],
  shopUrl: string | null,
): ResolvedFourthwallVariant[] {
  const configured = product.fourthwallVariantGroupEnabled
    ? (product.fourthwallVariants || [])
        .filter((variant) => variant.enabled && variant.fourthwallProductId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : product.fourthwallProductId || product.fourthwallProductUrl
      ? [
          {
            id: `legacy-${product.id}`,
            fourthwallProductId: product.fourthwallProductId || "",
            fourthwallProductUrl: product.fourthwallProductUrl,
            variantType: "poster",
            label: "Poster",
            sortOrder: 0,
            isDefault: true,
            enabled: true,
          },
        ]
      : [];

  return configured.map((variant) => {
    const linked = catalogue.find(
      (item) => item.id === variant.fourthwallProductId,
    );
    const fallback =
      variant.fourthwallProductUrl &&
      isSafeFourthwallUrl(variant.fourthwallProductUrl, shopUrl)
        ? variant.fourthwallProductUrl
        : "";
    const href = linked?.externalUrl || fallback;
    return {
      ...variant,
      product: linked,
      href,
      available: Boolean(href && (linked ? linked.available : true)),
    };
  });
}

export function getDefaultFourthwallVariant(
  variants: ResolvedFourthwallVariant[],
) {
  return variants.find((variant) => variant.isDefault) || variants[0];
}

export function getLowestFourthwallVariant(
  variants: ResolvedFourthwallVariant[],
) {
  const priced = variants
    .filter((variant) => variant.available && variant.product?.price)
    .sort(
      (a, b) => (a.product?.price.amount || 0) - (b.product?.price.amount || 0),
    );
  return priced[0] || variants.find((variant) => variant.available);
}
