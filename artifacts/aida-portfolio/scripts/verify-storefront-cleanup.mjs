import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const destination = read("../src/lib/shipping-destination.tsx");
const currency = read("../src/lib/currency.tsx");
const money = read("../src/components/Money.tsx");
const presentation = read("../src/lib/product-presentation.ts");
const shop = read("../src/pages/UnifiedShop.tsx");
const home = read("../src/pages/Home.tsx");
const shell = read("../src/components/layout/Shell.tsx");
const links = read("../src/pages/Links.tsx");
const app = read("../src/App.tsx");
const sitemap = read("../public/sitemap.xml");

assert.ok(
  destination.includes(" UM US UY "),
  "ISO country list must contain the United States",
);
assert.ok(
  destination.includes('US: "united states usa america"') &&
    destination.includes('TR: "türkiye turkey turkiye"'),
  "country search aliases must support US and Türkiye terms",
);
assert.ok(
  currency.includes("useShippingDestination()") &&
    money.includes("destinationLoading") &&
    money.includes("price-skeleton"),
  "currency must derive from hydrated destination without a wrong-price flash",
);
assert.ok(
  presentation.includes("resolveProductPresentation") &&
    home.includes("resolveProductPresentation") &&
    shop.includes("resolveProductPresentation"),
  "cards must share the centralized product presentation resolver",
);
assert.ok(
  shop.includes("const [location, navigate] = useLocation()") &&
    shop.includes("<button") &&
    shop.includes("navigate(value ==="),
  "shop filters must be semantic and router-reactive",
);
assert.ok(
  !shop.includes('"mystery-mail"') &&
    !home.includes("Mystery Mail") &&
    !shell.includes("mystery-mail"),
  "Mystery Mail must be absent from active public discovery UI",
);
assert.ok(
  app.includes('<RedirectTo to="/shop" />') &&
    !sitemap.includes("mystery-mail"),
  "old Mystery Mail URLs must redirect and leave the sitemap",
);
assert.ok(
  home.includes("b.createdAt") &&
    !home.includes("b.updatedAt") &&
    home.includes("originals.length"),
  "recent products must use creation chronology and fallback logic",
);
assert.ok(
  !links.includes("DestinationControl") && links.includes('href="/shop"'),
  "Links must keep one shop CTA without a visible country selector",
);
assert.ok(
  shell.includes("<DestinationControl utility") &&
    shell.includes("header-language") &&
    shell.includes("header-basket"),
  "desktop header must use compact editorial utilities",
);
assert.ok(
  shop.includes("Get this print") || presentation.includes("Get this print"),
  "print CTA must use product-focused language",
);

console.log(
  "Storefront destination, pricing and header cleanup verification passed.",
);
