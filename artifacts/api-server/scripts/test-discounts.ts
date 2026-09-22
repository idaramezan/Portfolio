import assert from "node:assert/strict";
import {
  calculatePercentageDiscount,
  isDiscountCodeFormatValid,
  normalizeDiscountCode,
} from "../src/lib/discounts.ts";
import {
  discountCodeAppliesToItem,
  discountProductRef,
  selectedDiscountProduct,
} from "../src/lib/discount-eligibility.ts";
import { calculateCheckoutShipping } from "../src/lib/checkout-pricing.ts";

assert.equal(normalizeDiscountCode(" aida10 "), "AIDA10");
assert.equal(normalizeDiscountCode("Live-10"), "LIVE-10");
assert.equal(isDiscountCodeFormatValid("LIVE-10"), true);
assert.equal(isDiscountCodeFormatValid("BAD CODE!"), false);

assert.deepEqual(calculatePercentageDiscount(120_000, 10), {
  discountAmountMinor: 12_000,
  finalTotalMinor: 108_000,
});
assert.deepEqual(calculatePercentageDiscount(700_000, 10), {
  discountAmountMinor: 70_000,
  finalTotalMinor: 630_000,
});
assert.deepEqual(calculatePercentageDiscount(98_500, 10), {
  discountAmountMinor: 9_850,
  finalTotalMinor: 88_650,
});
assert.deepEqual(calculatePercentageDiscount(48_500, 100), {
  discountAmountMinor: 48_500,
  finalTotalMinor: 0,
});
assert.throws(() => calculatePercentageDiscount(10_000, 0));
assert.throws(() => calculatePercentageDiscount(10_000, 101));

const mailClub = { kind: "mail-club", productId: "mail-club-october" };
const octoberOnly = new Set([
  discountProductRef("mail-club", "mail-club-october"),
]);
assert.equal(
  selectedDiscountProduct(octoberOnly, mailClub),
  true,
  "typed Mail Club identity should match its edition",
);
assert.equal(
  selectedDiscountProduct(new Set(["mail-club-october"]), mailClub),
  true,
  "legacy raw product IDs remain valid",
);
assert.equal(
  selectedDiscountProduct(octoberOnly, {
    kind: "mail-club",
    productId: "mail-club-november",
  }),
  false,
  "an edition-specific code must not follow later Mail Club editions",
);
assert.equal(
  discountCodeAppliesToItem({
    scope: "products",
    selectedRefs: octoberOnly,
    item: mailClub,
    automaticSaleAllowsCodes: false,
  }),
  true,
  "explicit Admin product assignment authorizes the selected item",
);
assert.equal(
  discountCodeAppliesToItem({
    scope: "order",
    selectedRefs: new Set(),
    item: mailClub,
    automaticSaleAllowsCodes: false,
  }),
  false,
  "order-wide codes continue to respect automatic-sale stacking rules",
);

for (const [subtotalMinor, expectedShippingMinor] of [
  [49_000, 5_000],
  [39_690, 5_000],
  [149_900, 5_000],
  [150_000, 0],
  [150_100, 0],
] as const)
  assert.equal(
    calculateCheckoutShipping({
      market: "turkiye",
      printQuantity: 0,
      subtotalMinor,
    }),
    expectedShippingMinor,
  );

console.log("Discount normalization and pricing tests passed.");
