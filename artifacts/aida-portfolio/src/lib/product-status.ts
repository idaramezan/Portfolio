export type ProductStatus = "draft" | "published" | "sold_out" | "archived";
export type OriginalStatus = "available" | "sold" | "draft" | "archived";

type ProductState = {
  status?: string | null;
  available?: boolean;
  inventory?: number;
};

export function normalizeProductStatus(
  status: string | null | undefined,
  available = false,
): ProductStatus {
  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (["published", "active", "available"].includes(value)) return "published";
  if (
    [
      "sold",
      "sold-out",
      "sold_out",
      "soldout",
      "reserved",
      "unavailable",
      "expired",
    ].includes(value)
  )
    return "sold_out";
  if (["archived", "hidden", "inactive"].includes(value)) return "archived";
  if (value === "draft") return "draft";
  return available ? "published" : "draft";
}

export function normalizeOriginalStatus(
  status: string | null | undefined,
  legacyAvailable = false,
): OriginalStatus {
  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (["available", "published", "active"].includes(value)) return "available";
  if (
    [
      "sold",
      "sold-out",
      "sold_out",
      "soldout",
      "reserved",
      "unavailable",
    ].includes(value)
  )
    return "sold";
  if (value === "archived") return "archived";
  if (value === "draft") return "draft";
  return legacyAvailable ? "available" : "draft";
}

export function isPubliclyVisible(product: ProductState) {
  const status = normalizeProductStatus(product.status, product.available);
  return status === "published" || status === "sold_out";
}

export function isSoldOut(product: ProductState) {
  return (
    normalizeProductStatus(product.status, product.available) === "sold_out" ||
    product.inventory === 0
  );
}

export function isPurchasable(product: ProductState) {
  return (
    normalizeProductStatus(product.status, product.available) === "published" &&
    product.inventory !== 0
  );
}
