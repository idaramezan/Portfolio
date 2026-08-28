import type { CartItem } from "@/lib/store";

export const TURKIYE_DISCOUNT_STORAGE_KEY = "checkout-discount:turkiye";

export function checkoutItems(cart: CartItem[]) {
  return cart.map((item) => ({
    productId:
      item.productId ||
      item.id
        .split(":")[0]
        .replace(/^original-/, "")
        .replace(/^aceo-/, "")
        .replace(/^print-product-/, "")
        .replace(/^product-/, ""),
    kind:
      item.kind === "original"
        ? "original"
        : item.kind === "aceo"
          ? "aceo"
          : item.kind === "print" || item.kind === "product"
            ? "print"
            : item.kind,
    quantity: item.quantity,
    selectedOptions: item.printConfiguration
      ? {
          sizeId: item.printConfiguration.sizeId,
          framing: item.printConfiguration.framing,
          color: item.selectedColor,
        }
      : { color: item.selectedColor },
  }));
}

export const loadAppliedDiscountCode = () =>
  sessionStorage.getItem(TURKIYE_DISCOUNT_STORAGE_KEY) || "";

export function saveAppliedDiscountCode(code: string | null) {
  if (code) sessionStorage.setItem(TURKIYE_DISCOUNT_STORAGE_KEY, code);
  else sessionStorage.removeItem(TURKIYE_DISCOUNT_STORAGE_KEY);
}
