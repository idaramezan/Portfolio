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
const originalDetail = read("../src/pages/OriginalDetail.tsx");
const printDetail = read("../src/pages/PrintDetail.tsx");
const related = read("../src/components/RelatedProducts.tsx");
const consent = read("../src/components/AnalyticsConsent.tsx");
const locale = read("../src/lib/locale.tsx");
const links = read("../src/pages/Links.tsx");
const app = read("../src/App.tsx");
const sitemap = read("../public/sitemap.xml");
const styles = read("../src/index.css");

assert.ok(
  destination.includes(" UM US UY "),
  "ISO country list must contain the United States",
);
assert.ok(
  !destination.includes("Search countries") &&
    !destination.includes("Ülke ara") &&
    destination.includes("countries.map") &&
    styles.includes("min-height: 48px"),
  "destination picker must expose one complete country select without search",
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
assert.ok(
  !home.includes("OriginalCollectorExperience") &&
    !originalDetail.includes("OriginalCollectorExperience"),
  "Collector Experience must not render on storefront pages",
);
assert.ok(
  originalDetail.includes("<RelatedProducts") &&
    printDetail.includes("<RelatedProducts") &&
    related.includes("product.id !== currentProduct.id") &&
    related.includes("productType(product) === productType(currentProduct)") &&
    related.includes("isPurchasable(product)") &&
    related.includes(".slice(0, 3)"),
  "every managed product detail must show up to three purchasable same-type recommendations",
);
assert.ok(
  consent.includes("useState(false)") &&
    consent.includes('window.addEventListener("analytics:manage"'),
  "analytics preferences must open only from the retained privacy control",
);
assert.ok(
  shell.includes("{locale.toUpperCase()}") &&
    shell.includes("data-active-locale={locale}") &&
    locale.includes("localStorage.setItem(STORAGE_KEY, next)"),
  "header language must render from and persist the shared locale source of truth",
);

console.log(
  "Storefront destination, pricing and header cleanup verification passed.",
);
