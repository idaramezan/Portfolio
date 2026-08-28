import assert from "node:assert/strict";
import {
  calculatePercentageDiscount,
  isDiscountCodeFormatValid,
  normalizeDiscountCode,
} from "../src/lib/discounts.ts";

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

console.log("Discount normalization and pricing tests passed.");
