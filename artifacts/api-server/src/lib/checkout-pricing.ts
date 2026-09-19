export function calculateCheckoutShipping(input: {
  market: "turkiye" | "international_original";
  printQuantity: number;
  framedQuantity?: number;
  subtotalMinor: number;
}) {
  const framedQuantity = input.framedQuantity || 0;
  if (!Number.isInteger(input.printQuantity) || input.printQuantity < 0)
    throw new Error("Invalid print quantity");
  if (!Number.isInteger(framedQuantity) || framedQuantity < 0 || framedQuantity > input.printQuantity)
    throw new Error("Invalid framed quantity");
  if (!Number.isInteger(input.subtotalMinor) || input.subtotalMinor < 0)
    throw new Error("Invalid order subtotal");
  if (input.market === "international_original") return 10_000;
  if (input.subtotalMinor === 0) return 0;
  return input.subtotalMinor >= 150_000 ? 0 : 5_000;
}
