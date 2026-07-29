import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const shell = readFileSync(
  new URL("../src/components/layout/Shell.tsx", import.meta.url),
  "utf8",
);
const home = readFileSync(
  new URL("../src/pages/Home.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);
const eventBanner = readFileSync(
  new URL("../src/components/IstanbulPaintingEventBanner.tsx", import.meta.url),
  "utf8",
);
const regionalShop = readFileSync(
  new URL("../src/components/RegionalShop.tsx", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

const headerClose = shell.indexOf("</header>");
const overlay = shell.indexOf("{isMobileMenuOpen && (");
assert.ok(
  headerClose >= 0 && overlay > headerClose,
  "mobile overlay must be outside the backdrop-filtered header",
);
assert.ok(
  shell.includes("ref={menuButtonRef}"),
  "menu trigger must own the focus-return ref",
);
assert.ok(
  shell.includes('document.body.style.overflow = "hidden"'),
  "open mobile menu must lock background scrolling",
);
assert.ok(
  shell.includes("h-dvh overscroll-contain"),
  "mobile overlay must use the dynamic viewport and contain overscroll",
);
assert.ok(
  shell.includes("disabled={isMobileMenuOpen}"),
  "header controls behind the mobile overlay must be disabled",
);
assert.ok(
  !shell.includes("items-center font-serif text-3xl font-bold"),
  "mobile navigation must not render every destination as an oversized heading",
);
assert.ok(
  shell.includes('locale === "tr" ? "Baskılar ve Ürünler"'),
  "mobile commerce navigation must have first-party Turkish labels",
);
assert.ok(
  shell.includes("setActiveEvent(Boolean(result?.config))") &&
    shell.includes('activeEvent\n                ? [["/event"'),
  "mobile navigation must expose Event only while an active config exists",
);
assert.ok(
  home.includes("Shop in Türkiye") &&
    home.includes("Shop internationally") &&
    home.includes("hasActiveShoppingRegionPreference") &&
    home.includes("homepage_market_selected"),
  "homepage hero must offer and persist both market paths",
);
assert.ok(
  home.includes("What are you looking for?") &&
    home.includes("/shop/international/prints") &&
    home.includes("categoryItems"),
  "homepage categories must adapt to Türkiye and international markets",
);
assert.ok(
  home.includes("isPubliclyVisible(product)") &&
    home.includes("international.products.slice(0, 2)") &&
    home.includes("latestLocal") &&
    home.includes("Recently from the studio"),
  "homepage products must be status-filtered, market-aware, and limited",
);
assert.ok(
  !home.includes("Choose where we deliver") &&
    !home.includes("How Turkey Orders Work") &&
    !home.includes("Follow the Studio"),
  "homepage must not repeat the removed routing and oversized information sections",
);
assert.ok(
  styles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") &&
    styles.includes("padding-block: 3rem"),
  "mobile product previews and section rhythm must be compact",
);
assert.ok(
  eventBanner.includes("home-event-announcement") &&
    eventBanner.includes('href="/event"') &&
    eventBanner.includes("Event details") &&
    eventBanner.includes("lg:hidden") &&
    eventBanner.includes("hidden rotate-[.35deg]") &&
    eventBanner.includes("mobileFormOpen"),
  "Event Banner must provide a compact homepage announcement and full detail treatment",
);
assert.ok(
  app.includes('lazy(() => import("@/pages/Admin"))'),
  "mobile storefront must not eagerly download the admin application",
);
assert.ok(
  app.includes('<Route path="/event">') &&
    app.includes('<IstanbulPaintingEventBanner placement="home" />'),
  "compact event announcement must lead to the existing full registration component",
);
assert.ok(
  styles.includes(".home-live-section__piece:nth-child(n + 3)") &&
    styles.includes(".studio-letter-preview__blur") &&
    styles.includes(".footer-mobile-links") &&
    !home.includes("How Turkey Orders Work"),
  "long homepage and footer modules must have compact mobile treatments",
);
assert.ok(
  regionalShop.includes("availableFilterValues.includes") &&
    regionalShop.includes("Another way to collect") &&
    regionalShop.includes("Explore prints"),
  "shops must hide empty filters and offer a useful alternative collection",
);

console.log("Mobile navigation verification passed.");
