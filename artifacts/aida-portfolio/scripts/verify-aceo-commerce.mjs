import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const types = read("../src/lib/turkiye-products.ts");
const store = read("../src/lib/store.ts");
const editor = read("../src/pages/admin/ProductEditor.tsx");
const catalog = read("../src/pages/admin/Catalog.tsx");
const shop = read("../src/pages/UnifiedShop.tsx");
const detail = read("../src/pages/AceoDetail.tsx");
const app = read("../src/App.tsx");
const related = read("../src/components/RelatedProducts.tsx");
const drawer = read("../src/components/CartDrawer.tsx");
const destination = read("../src/lib/shipping-destination.tsx");
const settingsRoute = read("../../api-server/src/routes/shop-settings.ts");
const checkout = read("../../api-server/src/routes/checkout.ts");

assert.ok(
  types.includes('| "aceo"') &&
    types.includes("ACEO_DEFAULT_PRICE_MINOR = 48_500") &&
    types.includes('ACEO_DIMENSION = "6.4 × 8.9 cm · 2.5 × 3.5 in"'),
  "ACEO must extend the existing Türkiye product model with canonical defaults",
);
assert.ok(
  editor.includes('<option value="aceo">ACEO</option>') &&
    editor.includes("ACEO_DEFAULT_PRICE_MINOR") &&
    editor.includes("inventory: 1") &&
    editor.includes("availableInternationally: false") &&
    editor.includes(
      "!isAceoProduct(draft) && (\n            <FourthwallProductConnection",
    ),
  "Prints & Goods editor must configure ACEOs and omit Fourthwall",
);
assert.ok(
  catalog.includes('<option value="aceo">ACEOs</option>') &&
    catalog.includes('`ACEO · ${x.inventory > 0 ? "1 available" : "SOLD"}`'),
  "admin catalog must identify and filter ACEOs",
);
assert.ok(
  shop.includes('["aceos", c.aceos]') &&
    shop.includes('filter === "aceos"') &&
    shop.includes(".filter(isAceoProduct)") &&
    shop.includes("!isAceoProduct(product)") &&
    shop.includes("ACEOs are currently available in Türkiye only."),
  "unified shop must expose a distinct browsable ACEO category",
);
assert.ok(
  app.includes('<Route path="/shop/aceos/:slug" component={AceoDetail}') &&
    detail.includes("<ProductImageLightbox") &&
    detail.includes('kind: "aceo"') &&
    detail.includes("<RelatedProducts currentProduct={product}"),
  "ACEO detail must reuse the lightbox, basket and recommendation systems",
);
assert.ok(
  related.includes('"MORE TINY ORIGINALS"') &&
    related.includes("`/shop/aceos/${product.slug || product.id}`") &&
    related.includes("productType(product) === productType(currentProduct)"),
  "ACEO recommendations must stay within the ACEO product type",
);
assert.ok(
  store.includes('item.kind === "original" || item.kind === "aceo"') &&
    store.includes('region === "TR" &&') &&
    drawer.includes('item.kind === "aceo"') &&
    destination.includes('filter((item) => item.kind === "aceo")'),
  "basket must enforce one-of-one quantity and preserve ACEOs across destinations",
);
assert.ok(
  settingsRoute.includes("function normalizeAceos") &&
    settingsRoute.includes("ACEO inventory must be zero or one.") &&
    settingsRoute.includes("availableInternationally: false") &&
    settingsRoute.includes("delete product.fourthwallProductId"),
  "server-side catalog persistence must normalize and validate ACEO rules",
);
assert.ok(
  checkout.includes('input.kind === "aceo"') &&
    checkout.includes('market !== "turkiye"') &&
    checkout.includes(
      "SELECT payload FROM shop_settings WHERE id='primary' FOR UPDATE",
    ) &&
    checkout.includes("inventory: 0") &&
    checkout.includes('status: "sold_out"') &&
    checkout.includes("seenAceos.has(product.id)") &&
    checkout.includes('if (kind === "print") printQuantity += quantity'),
  "checkout must reject international ACEOs, exclude them from shipping and lock inventory",
);

console.log("ACEO commerce verification passed.");
