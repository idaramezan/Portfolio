import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const lightbox = read("../src/components/ProductImageLightbox.tsx");
const original = read("../src/pages/OriginalDetail.tsx");
const print = read("../src/pages/PrintDetail.tsx");
const links = read("../src/pages/Links.tsx");
const commission = read("../src/components/CommissionLinkCard.tsx");
const styles = read("../src/index.css");
const analytics = read("../src/lib/analytics.ts");

assert.ok(
  original.includes("<ProductImageLightbox") &&
    print.includes("<ProductImageLightbox"),
  "all active product detail templates must share the lightbox",
);
assert.ok(
  original.includes("galleryImages") && print.includes("galleryImages"),
  "product galleries must be passed to the viewer",
);
assert.ok(
  lightbox.includes('role="dialog"') &&
    lightbox.includes('aria-modal="true"') &&
    lightbox.includes('event.key === "Escape"'),
  "lightbox must expose accessible dialog and Escape behavior",
);
assert.ok(
  lightbox.includes('event.key === "ArrowLeft"') &&
    lightbox.includes("onTouchEnd") &&
    lightbox.includes("multiple &&"),
  "multi-image navigation must support keyboard and swipe without fake single-image controls",
);
assert.ok(
  lightbox.includes('document.body.style.position = "fixed"') &&
    lightbox.includes("window.scrollTo(0, scrollY)") &&
    lightbox.includes("triggerRef.current?.focus()"),
  "scroll and focus must restore after closing",
);
assert.ok(
  styles.includes("cursor: zoom-in") &&
    styles.includes("object-fit: contain") &&
    styles.includes("env(safe-area-inset-top)") &&
    styles.includes("touch-action: pinch-zoom"),
  "responsive viewer affordance, containment, safe areas and native pinch zoom must be styled",
);
assert.ok(
  links.lastIndexOf("<CommissionLinkCard") >
    links.lastIndexOf('href="/newsletter"') &&
    links.lastIndexOf("<CommissionLinkCard") < links.indexOf("tiles.map"),
  "commission card must sit after Newsletter and before category cards",
);
assert.ok(
  commission.includes("4546787742/custom-oil-pastel-portrait-from-photo") &&
    commission.includes('target="_blank"') &&
    commission.includes('rel="noopener noreferrer"'),
  "Etsy CTA must use the exact secure external URL",
);
assert.ok(
  commission.includes("Have something in mind?") &&
    commission.includes("Aklında bir fikir mi var?") &&
    commission.includes("high-resolution digital") === false,
  "commission invitation must include complete localized copy without false shipping claims",
);
assert.ok(
  analytics.includes('"commission_etsy_click"') &&
    commission.includes('source: "links_page"'),
  "commission click must use existing analytics",
);
assert.ok(
  !commission.includes("iframe") && !commission.includes("etsy.com/api"),
  "Etsy must not be embedded or scraped",
);
assert.ok(
  commission.includes("oil-pastel-commission-card.jpg") &&
    commission.includes('width="1090"') &&
    styles.includes(".commission-link-card__visual img") &&
    styles.includes("object-fit: contain"),
  "commission card must use the supplied uncropped local artwork image",
);

console.log("Product lightbox and Etsy commission verification passed.");
