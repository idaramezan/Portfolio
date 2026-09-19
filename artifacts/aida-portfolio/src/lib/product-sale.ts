import type { ProductSale } from "@/lib/store";

export type SaleStatus = "inactive" | "scheduled" | "active" | "expired";
export function getSaleStatus(
  sale?: ProductSale,
  now = Date.now(),
): SaleStatus {
  if (
    !sale?.enabled ||
    !Number.isFinite(sale.percentage) ||
    sale.percentage <= 0 ||
    sale.percentage > 100
  )
    return "inactive";
  if (sale.startsAt && now < Date.parse(sale.startsAt)) return "scheduled";
  if (sale.endsAt && now >= Date.parse(sale.endsAt)) return "expired";
  return "active";
}
export function calculateProductSale(
  regularPriceMinor: number,
  sale?: ProductSale,
  now = Date.now(),
) {
  const status = getSaleStatus(sale, now);
  const percentage = status === "active" ? sale!.percentage : 0;
  const discountAmountMinor = Math.round(
    (regularPriceMinor * percentage) / 100,
  );
  return {
    status,
    percentage,
    regularPriceMinor,
    discountAmountMinor,
    finalPriceMinor: regularPriceMinor - discountAmountMinor,
    allowDiscountCodes: sale?.allowDiscountCodes !== false,
  };
}
