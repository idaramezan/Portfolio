import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const pricing = readFileSync(
  new URL(
    "../artifacts/api-server/src/lib/checkout-pricing.ts",
    import.meta.url,
  ),
  "utf8",
);
const server = readFileSync(
  new URL("../artifacts/api-server/src/routes/checkout.ts", import.meta.url),
  "utf8",
);
const checkout = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/pages/Checkout.tsx",
    import.meta.url,
  ),
  "utf8",
);
const cart = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/components/CartDrawer.tsx",
    import.meta.url,
  ),
  "utf8",
);
const orders = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/pages/admin/Orders.tsx",
    import.meta.url,
  ),
  "utf8",
);
assert.ok(
  pricing.includes(
    "input.printQuantity === 0 ? 0 : 20_000 + (input.printQuantity - 1) * 2_000",
  ),
);
assert.ok(
  pricing.includes('input.market === "international_original"') &&
    pricing.includes("10_000"),
);
assert.ok(
  server.includes('countryCode === "US"') &&
    checkout.includes("COUNTRY_CODES") &&
    !checkout.includes(
      " CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TH TJ TL TM TN TO TR TT TV TW TZ UA UG US",
    ),
);
assert.ok(
  server.includes("idempotency_key TEXT UNIQUE") &&
    server.includes("signatureOkay(file)") &&
    server.includes("PRIVATE_RECEIPTS_DIR"),
);
assert.ok(
  !server.includes("$27,$28,'checkout-v1'"),
  "order insert values must match its target columns",
);
assert.ok(
  /href=\{\s*region === "TR"\s*\? "\/checkout\/turkiye"\s*: "\/checkout\/international-originals"\s*\}/.test(
    cart,
  ) && !cart.includes("wa.me/"),
);
assert.ok(
  cart.includes("calculateTurkiyeProductShipping") &&
    cart.includes('["print", "product"].includes(item.kind)'),
);
assert.ok(
  checkout.includes("Upload your completed bank-transfer receipt") &&
    checkout.includes("Submit order for payment review"),
);
assert.ok(
  checkout.includes("useToast") && /variant:\s*"destructive"/.test(checkout),
  "checkout errors must appear in a visible toast",
);
for (const translatedCheckoutCopy of [
  "Siparişinizi tamamlayın",
  "İletişim bilgileri",
  "Teslimat adresi",
  "Ödeme dekontu",
  "Sipariş özeti",
  "Siparişiniz alındı",
]) {
  assert.ok(
    checkout.includes(translatedCheckoutCopy),
    `checkout must include Turkish copy: ${translatedCheckoutCopy}`,
  );
}
assert.ok(checkout.includes('CHECKOUT_COPY[locale === "tr" ? "tr" : "en"]'));
assert.ok(checkout.includes("document.title = copyText.documentTitle"));
assert.ok(checkout.includes("document.title = copyText.successDocumentTitle"));
for (const field of [
  "customer_full_name",
  "customer_email",
  "customer_phone",
  "customer_language",
  "country_code",
  "country_name",
  "province_or_region",
  "district",
  "city",
  "postal_code",
  "address_line",
  "delivery_notes",
  "consent_at",
  "consent_version",
]) {
  assert.ok(orders.includes(field), `admin order detail must display ${field}`);
}
assert.ok(
  orders.includes("View full order details") &&
    orders.includes("Complete delivery address"),
);
assert.ok(
  orders.includes("/api/admin/checkout/orders") &&
    orders.includes("x-admin-password"),
);
console.log("First-party checkout verification passed.");
