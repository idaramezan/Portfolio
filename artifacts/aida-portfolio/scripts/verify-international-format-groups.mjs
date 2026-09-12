import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const store = read("../src/lib/store.ts");
const resolver = read("../src/lib/fourthwall-variants.ts");
const selector = read("../src/components/InternationalFormatSelector.tsx");
const editor = read("../src/components/admin/FourthwallProductConnection.tsx");
const shop = read("../src/pages/UnifiedShop.tsx");
const home = read("../src/pages/Home.tsx");
const original = read("../src/pages/OriginalDetail.tsx");
const shell = read("../src/components/layout/Shell.tsx");
const server = read("../../api-server/src/routes/shop-settings.ts");

assert.ok(
  store.includes("ProductFourthwallVariant") &&
    store.includes("fourthwallVariantGroupEnabled") &&
    store.includes("fourthwallVariants"),
  "website products must persist grouped Fourthwall formats",
);
assert.ok(
  resolver.includes("getFourthwallVariants") &&
    resolver.includes("getDefaultFourthwallVariant") &&
    resolver.includes("getLowestFourthwallVariant") &&
    resolver.includes("legacy-${product.id}"),
  "group resolver must support defaults, lowest pricing and legacy links",
);
assert.ok(
  selector.includes('role="radiogroup"') &&
    selector.includes('role="radio"') &&
    selector.includes("format_selected") &&
    selector.includes("external_purchase_click") &&
    selector.includes("GET THIS PRINT") &&
    selector.includes("QUALITY GUARANTEE & RETURNS") &&
    selector.includes("selected.product?.variants") &&
    selector.includes("selected.product?.description"),
  "international format controls must be accessible and analytics-aware",
);
assert.ok(
  editor.includes("Use multiple Fourthwall products as formats") &&
    editor.includes("Add format") &&
    editor.includes("isDefault: variant.id === id") &&
    editor.includes("already assigned to another format"),
  "admin must edit grouped formats and prevent duplicate/default conflicts",
);
assert.ok(
  server.includes("fourthwallVariants") &&
    server.includes("new Set(ids).size") &&
    server.includes("new Set(types).size"),
  "server persistence must validate grouped format associations",
);
assert.ok(
  shop.includes('type Filter = "originals" | "prints"') &&
    home.includes('type HomeFilter = "originals" | "prints"') &&
    shop.includes('destination?.countryCode === "TR"') &&
    home.includes('destination?.countryCode === "TR"'),
  "shop and homepage must expose only region-appropriate Prints and Originals tabs",
);
assert.ok(
  original.includes("available only for delivery within Türkiye") &&
    original.includes('href="/shop?category=prints"') &&
    shell.includes("{isTürkiye && ("),
  "international visitors must not be offered original commerce or navigation",
);

console.log("International Fourthwall format grouping verification passed.");
