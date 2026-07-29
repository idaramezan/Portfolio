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
  home.includes('className="hidden border-y border-ink/10 bg-card md:block"') &&
    home.includes("Choose where we deliver") &&
    home.includes("/shop/international/prints"),
  "mobile homepage discovery must distinguish Türkiye and international shops",
);
assert.ok(
  home.includes("grid w-full max-w-xl grid-cols-2") &&
    home.includes("w-full justify-center"),
  "mobile hero actions must fill one balanced row",
);
assert.ok(
  styles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") &&
    styles.includes("padding-block: 3rem"),
  "mobile product previews and section rhythm must be compact",
);
assert.ok(
  eventBanner.includes("Event details") &&
    eventBanner.includes("lg:hidden") &&
    eventBanner.includes("hidden rotate-[.35deg]") &&
    eventBanner.includes("mobileFormOpen"),
  "Event Banner must use its compact mobile image/details treatment",
);
assert.ok(
  app.includes('lazy(() => import("@/pages/Admin"))'),
  "mobile storefront must not eagerly download the admin application",
);
assert.ok(
  styles.includes(".home-live-section__piece:nth-child(n + 3)") &&
    styles.includes(".studio-letter-preview__blur") &&
    styles.includes(".footer-mobile-links"),
  "long homepage and footer modules must have compact mobile treatments",
);
assert.ok(
  regionalShop.includes("availableFilterValues.includes") &&
    regionalShop.includes("Another way to collect") &&
    regionalShop.includes("Explore prints"),
  "shops must hide empty filters and offer a useful alternative collection",
);

console.log("Mobile navigation verification passed.");
