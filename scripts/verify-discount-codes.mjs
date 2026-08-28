import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../lib/db/migrations/0014_discount_codes.sql");
const server = read("../artifacts/api-server/src/routes/checkout.ts");
const cart = read("../artifacts/aida-portfolio/src/components/CartDrawer.tsx");
const checkout = read("../artifacts/aida-portfolio/src/pages/Checkout.tsx");
const admin = read(
  "../artifacts/aida-portfolio/src/pages/admin/DiscountCodes.tsx",
);
const orders = read("../artifacts/aida-portfolio/src/pages/admin/Orders.tsx");

for (const field of [
  "discount_percent",
  "is_active",
  "max_uses",
  "usage_count",
  "expires_at",
  "archived_at",
])
  assert.ok(migration.includes(field), `missing discount field ${field}`);
assert.ok(
  migration.includes("UPPER(code)"),
  "codes must be case-insensitively unique",
);
assert.ok(
  migration.includes("discount_amount_minor") &&
    migration.includes("total_before_discount_minor"),
);

assert.ok(server.includes('publicRouter.post("/discount/validate"'));
assert.ok(
  server.includes("calculatePercentageDiscount(totalBeforeDiscountMinor"),
);
assert.ok(
  server.includes("usage_count=usage_count+1") &&
    server.includes("usage_count<max_uses"),
);
assert.ok(
  server.includes("pg_advisory_xact_lock"),
  "order idempotency must be transaction locked",
);
assert.ok(
  server.includes('await client.query("COMMIT")'),
  "redemption and order must commit together",
);
assert.ok(
  server.includes("quote.discountCode") &&
    server.includes("quote.discountAmountMinor"),
);
assert.ok(
  server.includes("paymentBreakdown"),
  "both order emails must use saved pricing breakdown",
);
assert.ok(
  server.includes("previewQuote.grandTotalMinor > 0"),
  "zero-total orders must not require receipts",
);

assert.ok(cart.includes("/api/checkout/discount/validate"));
assert.ok(cart.includes("saveAppliedDiscountCode(null)"));
assert.ok(cart.includes("coupon.discountAmountMinor"));
assert.ok(cart.includes("Bu indirim kodunun kullanım sınırına ulaşıldı."));
assert.ok(checkout.includes("discountCode: discountCode || undefined"));
assert.ok(checkout.includes("result.discountInvalid"));
assert.ok(/quote\??\.grandTotalMinor === 0/.test(checkout));

assert.ok(admin.includes("Maximum uses") && admin.includes("No expiration"));
assert.ok(admin.includes("usageCount") && admin.includes("effectiveStatus"));
assert.ok(
  orders.includes("discount_code") && orders.includes("discount_amount_minor"),
);

console.log("Discount code end-to-end verification passed.");
