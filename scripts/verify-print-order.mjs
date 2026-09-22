import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const admin = read("../artifacts/aida-portfolio/src/pages/admin/Catalog.tsx");
const home = read(
  "../artifacts/aida-portfolio/src/components/HomeCommerce.tsx",
);
const shop = read("../artifacts/aida-portfolio/src/pages/UnifiedShop.tsx");

assert.ok(
  admin.includes("movePrint") && admin.includes("Storefront print order saved"),
);
assert.ok(admin.includes("saveShopSettingsAndWait(next)"));
assert.ok(home.includes(".sort(compareProductDisplayOrder)"));
assert.ok(shop.includes(".sort(compareProductDisplayOrder)"));

console.log("Print storefront ordering verification passed.");
