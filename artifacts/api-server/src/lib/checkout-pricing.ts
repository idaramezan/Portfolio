export function calculateCheckoutShipping(input: {
  market: "turkiye" | "international_original";
  printQuantity: number;
  framedQuantity?: number;
}) {
  const framedQuantity = input.framedQuantity || 0;
  if (!Number.isInteger(input.printQuantity) || input.printQuantity < 0)
    throw new Error("Invalid print quantity");
  if (!Number.isInteger(framedQuantity) || framedQuantity < 0 || framedQuantity > input.printQuantity)
    throw new Error("Invalid framed quantity");
  if (input.market === "international_original") return 10_000;
  if (input.printQuantity === 0) return 0;
  const unframedQuantity = input.printQuantity - framedQuantity;
  return framedQuantity > 0
    ? 35_000 + (framedQuantity - 1) * 15_000 + unframedQuantity * 5_000
    : 20_000 + (unframedQuantity - 1) * 5_000;
}
