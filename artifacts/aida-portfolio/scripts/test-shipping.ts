import assert from "node:assert/strict";
import { calculateTurkiyeShippingSummary } from "../src/lib/turkiye-products.ts";

for (const [merchandiseTotalMinor, shippingMinor, remainingMinor] of [
  [49_000, 5_000, 101_000],
  [39_690, 5_000, 110_310],
  [149_900, 5_000, 100],
  [150_000, 0, 0],
  [150_100, 0, 0],
] as const) {
  const summary = calculateTurkiyeShippingSummary(merchandiseTotalMinor);
  assert.equal(summary.shippingMinor, shippingMinor);
  assert.equal(summary.remainingMinor, remainingMinor);
  assert.equal(summary.totalMinor, merchandiseTotalMinor + shippingMinor);
}

assert.equal(calculateTurkiyeShippingSummary(150_100).shippingMinor, 0);
assert.equal(calculateTurkiyeShippingSummary(149_900).shippingMinor, 5_000);
assert.equal(calculateTurkiyeShippingSummary(39_690).totalMinor, 44_690);

console.log("Türkiye post-discount shipping tests passed.");
