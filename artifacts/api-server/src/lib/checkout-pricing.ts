export function calculateCheckoutShipping(input: { market: "turkiye" | "international_original"; printQuantity: number }) {
  if (!Number.isInteger(input.printQuantity) || input.printQuantity < 0) throw new Error("Invalid print quantity");
  if (input.market === "international_original") return 10_000;
  return input.printQuantity === 0 ? 0 : 20_000 + (input.printQuantity - 1) * 2_000;
}
