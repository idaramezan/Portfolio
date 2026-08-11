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
const editorialStyles = readFileSync(
  new URL("../src/playful-studio-editorial.css", import.meta.url),
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
const collectorExperience = readFileSync(
  new URL("../src/components/OriginalCollectorExperience.tsx", import.meta.url),
  "utf8",
);
const originalDetail = readFileSync(
  new URL("../src/pages/OriginalDetail.tsx", import.meta.url),
  "utf8",
);

const headerClose = shell.indexOf("</header>");
const overlay = shell.indexOf('className="mobile-menu-overlay md:hidden"');
assert.ok(
  headerClose >= 0 && overlay > headerClose,
  "mobile overlay must be outside the backdrop-filtered header",
);
assert.ok(
  shell.includes("ref={menuButtonRef}"),
  "menu trigger must own the focus-return ref",
);
assert.ok(
  shell.includes("h-20 max-w-7xl") && shell.includes("whitespace-nowrap"),
  "mobile header must remain an 80px non-wrapping bar",
);
assert.ok(
  shell.includes('document.body.style.overflow = "hidden"'),
  "open mobile menu must lock background scrolling",
);
assert.ok(
  shell.includes('className="mobile-menu md:hidden"') &&
    editorialStyles.includes("height: 100dvh") &&
    editorialStyles.includes("overscroll-behavior: contain"),
  "mobile overlay must use the dynamic viewport and contain overscroll",
);
assert.ok(
  shell.includes("mobile-menu__close") &&
    shell.includes("mobile-menu__chevron") &&
    shell.includes("mobile-menu__languages") &&
    shell.includes("Privacy choices") &&
    shell.includes("aria-expanded={isOpen}") &&
    shell.includes("aria-controls={submenuId}"),
  "mobile overlay must provide a clear close action, expandable groups, language, and privacy controls",
);
assert.ok(
  shell.includes("Explore the studio") &&
    shell.includes("Originals, prints, goods and Mystery Mail") &&
    shell.includes("mobile-menu__event-badge") &&
    !shell.includes("mobile-menu__letter-card"),
  "mobile navigation must be a compact studio index without a duplicate Studio Letter card",
);
assert.ok(
  editorialStyles.includes("transform: translateX(100%)") &&
    editorialStyles.includes('.mobile-menu[data-open="true"]') &&
    editorialStyles.includes("max-width: 359px") &&
    editorialStyles.includes("border-radius: 999px"),
  "mobile drawer must animate safely and use compact responsive language controls",
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
    shell.includes("{activeEvent && (") &&
    shell.includes("mobile-menu__event-badge"),
  "mobile navigation must expose Event only while an active config exists",
);
assert.ok(
  home.includes('href="/shop"') &&
    home.includes('href="/100-windows"') &&
    !home.includes("homepage_market_selected"),
  "homepage hero must offer one shop and a 100 Windows project path",
);
assert.ok(
  home.includes("What are you looking for?") &&
    home.includes("/shop?category=prints") &&
    home.includes("home-category-link--paper") &&
    !home.includes("hasActiveShoppingRegionPreference"),
  "homepage categories must lead to the unified catalog without a duplicated selector",
);
assert.ok(
  home.includes("isPubliclyVisible(product)") &&
    home.includes("latestLocal") &&
    home.includes("Recently from the studio"),
  "homepage products must be status-filtered and limited",
);
assert.ok(
  !home.includes("Choose where we deliver") &&
    !home.includes("How Turkey Orders Work") &&
    !home.includes("Ordering in Türkiye") &&
    !home.includes("Follow the Studio") &&
    !home.includes("home-social-strip"),
  "homepage must not repeat the removed routing and oversized information sections",
);
assert.ok(
  home.includes("home-market-hero__image--mobile") &&
    home.indexOf("home-market-hero__image--mobile") <
      home.indexOf("home-market-actions"),
  "mobile hero photograph must connect the introduction to the market actions",
);
assert.ok(
  styles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") &&
    styles.includes("padding-block: 3rem"),
  "mobile product previews and section rhythm must be compact",
);
assert.ok(
  eventBanner.includes("home-event-announcement") &&
    eventBanner.includes("href={`/events/${config.slug}`}") &&
    eventBanner.includes("View event details") &&
    eventBanner.includes("compactAnnouncement") &&
    eventBanner.includes("/apply`}") &&
    eventBanner.includes("Apply for the event"),
  "Event Banner must provide a compact homepage announcement and full detail treatment",
);
assert.ok(
  app.includes('lazy(() => import("@/pages/Admin"))'),
  "mobile storefront must not eagerly download the admin application",
);
assert.ok(
  app.includes('<Route path="/events/:slug">') &&
    home.includes('<IstanbulPaintingEventBanner placement="home" compact />'),
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
assert.ok(
  home.indexOf("<OriginalCollectorExperience") >
    home.indexOf("Recently from the studio") &&
    home.indexOf("<OriginalCollectorExperience") <
      home.indexOf('className="home-studio-letter"'),
  "collector film must sit between recent products and the Featured Studio Letter",
);
assert.ok(
  collectorExperience.includes("IntersectionObserver") &&
    collectorExperience.includes("prefers-reduced-motion: reduce") &&
    collectorExperience.includes("youtube-nocookie.com/embed") &&
    collectorExperience.includes("autoplay=1&mute=1&playsinline=1") &&
    collectorExperience.includes("setPlayerActivated(true)") &&
    collectorExperience.includes("observer.disconnect()") &&
    collectorExperience.includes('videoConfig.videoSource === "uploaded"') &&
    collectorExperience.includes("playsInline") &&
    collectorExperience.includes("gAJYgEfwpQg"),
  "collector film must activate once near view, support native video, and respect reduced motion",
);
assert.ok(
  styles.includes("aspect-ratio: 9 / 16") &&
    styles.includes("pointer-events: none") &&
    styles.includes("position: absolute") &&
    !styles.includes("padding-bottom: 56.25%"),
  "collector film must use a stable portrait frame that cannot capture mobile scrolling",
);
assert.ok(
  originalDetail.includes("<OriginalCollectorExperience") &&
    !regionalShop.includes("OriginalCollectorExperience"),
  "the compact collector film must appear only on original detail pages, not product grids",
);

console.log("Mobile navigation verification passed.");
