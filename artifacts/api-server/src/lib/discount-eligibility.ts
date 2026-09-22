export type DiscountItemIdentity = {
  kind: string;
  productId: string;
};

export const normalizeDiscountItemType = (kind: string) =>
  (kind === "product" ? "print" : kind)
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");

export const discountProductRef = (kind: string, productId: string) =>
  `${normalizeDiscountItemType(kind)}:${productId}`;

export function selectedDiscountProduct(
  selectedRefs: ReadonlySet<string>,
  item: DiscountItemIdentity,
) {
  return (
    selectedRefs.has(discountProductRef(item.kind, item.productId)) ||
    // Existing codes stored raw IDs before typed identities were introduced.
    selectedRefs.has(item.productId)
  );
}

export function discountCodeAppliesToItem(input: {
  scope: string;
  selectedRefs: ReadonlySet<string>;
  item: DiscountItemIdentity;
  automaticSaleAllowsCodes: boolean;
}) {
  if (input.scope === "products")
    return selectedDiscountProduct(input.selectedRefs, input.item);
  return input.automaticSaleAllowsCodes;
}
