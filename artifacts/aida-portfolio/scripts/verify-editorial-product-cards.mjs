import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const card = read("../src/components/EditorialProductCard.tsx");
const home = read("../src/pages/Home.tsx");
const shop = read("../src/pages/UnifiedShop.tsx");
const related = read("../src/components/RelatedProducts.tsx");
const legacy = read("../src/components/ProductCard.tsx");
const managed = read("../src/components/ManagedProductCard.tsx");
const international = read("../src/components/InternationalProductCard.tsx");
const styles = read("../src/styles/editorial-theme.css");

for (const [name, source] of [
  ["homepage", home],
  ["shop", shop],
  ["recommendations", related],
  ["legacy product card", legacy],
  ["managed product card", managed],
  ["international product card", international],
])
  assert.ok(
    source.includes("EditorialProductCard"),
    `${name} must use the shared editorial product card`,
  );

assert.ok(
  card.includes("editorial-product-card__headline") &&
    card.includes("editorial-product-card__metadata") &&
    card.includes("onError={() => setImageFailed(true)}") &&
    card.includes('loading="lazy"'),
  "shared cards must provide title/price hierarchy, metadata, lazy images and a safe placeholder",
);
assert.ok(
  styles.includes("aspect-ratio: 4 / 5") &&
    styles.includes("object-fit: cover") &&
    styles.includes("repeat(3, minmax(0, 1fr))") &&
    styles.includes("-webkit-line-clamp: 2"),
  "shared cards must use consistent cover media, a three-column desktop grid and bounded titles",
);
assert.ok(
  !card.includes("box-shadow") &&
    !card.includes("rounded") &&
    !card.includes("description") &&
    !card.includes("shippingMessage"),
  "shared product cards must remain free of ecommerce chrome and descriptive copy",
);
assert.ok(
  home.includes('type HomeFilter = "originals" | "prints"') &&
    shop.includes('type Filter = "originals" | "prints"'),
  "the card redesign must preserve the simplified regional storefront tabs",
);

console.log("Editorial product card system verification passed.");
