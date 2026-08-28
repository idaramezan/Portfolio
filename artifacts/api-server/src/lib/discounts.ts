export function normalizeDiscountCode(value: unknown) {
  return typeof value === "string"
    ? value.trim().slice(0, 40).toUpperCase()
    : "";
}

export function isDiscountCodeFormatValid(code: string) {
  return /^[A-Z0-9-]+$/.test(code);
}

export function calculatePercentageDiscount(
  totalBeforeDiscountMinor: number,
  discountPercent: number,
) {
  if (
    !Number.isInteger(totalBeforeDiscountMinor) ||
    totalBeforeDiscountMinor < 0
  )
    throw new Error("Invalid pre-discount total");
  if (
    !Number.isInteger(discountPercent) ||
    discountPercent < 1 ||
    discountPercent > 100
  )
    throw new Error("Invalid discount percentage");
  const discountAmountMinor = Math.min(
    totalBeforeDiscountMinor,
    Math.round((totalBeforeDiscountMinor * discountPercent) / 100),
  );
  return {
    discountAmountMinor,
    finalTotalMinor: Math.max(
      0,
      totalBeforeDiscountMinor - discountAmountMinor,
    ),
  };
}
