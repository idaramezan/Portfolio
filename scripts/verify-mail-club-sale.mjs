import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const admin = read(
  "../artifacts/aida-portfolio/src/pages/admin/MailClubAdmin.tsx",
);
const home = read(
  "../artifacts/aida-portfolio/src/components/HomeCommerce.tsx",
);
const shop = read("../artifacts/aida-portfolio/src/pages/UnifiedShop.tsx");
const store = read("../artifacts/aida-portfolio/src/lib/store.ts");
const checkout = read("../artifacts/api-server/src/routes/checkout.ts");
const settings = read("../artifacts/api-server/src/routes/shop-settings.ts");

assert.ok(admin.includes("<SaleEditor"));
assert.ok(admin.includes("sale={edition.sale}"));
assert.ok(admin.includes("onChange={(sale) => patch({ sale })}"));

for (const storefront of [home, shop]) {
  assert.ok(
    storefront.includes("regularPriceMinor={currentMail.priceMinor}") ||
      storefront.includes("regularPriceMinor={edition.priceMinor}"),
  );
  assert.ok(
    storefront.includes("sale={currentMail.sale}") ||
      storefront.includes("sale={edition.sale}"),
  );
}

assert.ok(
  store.includes(
    "settings.mailClubEditions.find((entry) => entry.id === item.productId)?.sale",
  ),
);
assert.ok(checkout.includes("product.sale"));
assert.ok(
  settings.includes(
    "...(settings.mailClubEditions || []).map((item: any) => item.sale)",
  ),
);

console.log("Mail Club sale verification passed.");
