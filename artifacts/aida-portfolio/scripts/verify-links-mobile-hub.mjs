import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const page = readFileSync(
  new URL("../src/pages/Links.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const commission = readFileSync(
  new URL("../src/components/CommissionLinkCard.tsx", import.meta.url),
  "utf8",
);

assert.ok(
  page.includes('className="links-mobile"') &&
    page.includes('className="links-desktop"'),
  "mobile hub must be isolated from the existing desktop page",
);
assert.ok(
  css.includes(".links-mobile {\n  display: none") &&
    css.includes("@media (max-width: 767px)") &&
    css.includes(".links-desktop {\n    display: none"),
  "mobile redesign must only activate below the established breakpoint",
);
for (const copy of [
  "Explore the full website",
  "Oil pastel paintings, studio prints and daily stories",
  "Follow 100 Windows",
  "One window, one painting, every day.",
  "SHOP BY COLLECTION",
  "WATCH ME PAINT LIVE",
  "FOLLOW THE STUDIO",
  "THE STUDIO AFTER HOURS",
])
  assert.ok(page.includes(copy), `missing mobile hub copy: ${copy}`);
assert.ok(
  page.indexOf("<CommissionLinkCard") < page.indexOf("ref={letterRef}") &&
    page.indexOf("ref={letterRef}") < page.indexOf("links-mobile__collections"),
  "mobile hierarchy must place commission, Newsletter and collections in order",
);
assert.ok(
  page.includes("project?.currentDay") &&
    page.includes("currentProduct?.imageUrl") &&
    page.includes("project?.heroImageUrl") &&
    page.includes("printsGoodsImage"),
  "100 Windows must use dynamic data with an image fallback",
);
assert.ok(
  page.includes("validExternalUrl") &&
    page.includes("settings.siteLinks.discordUrl") &&
    page.includes("settings.siteLinks.twitchUrl"),
  "missing social URLs must be hidden and configured URLs reused",
);
assert.ok(
  page.includes("IntersectionObserver") &&
    css.includes("links-letter-arrive") &&
    css.includes("prefers-reduced-motion"),
  "Newsletter arrival motion must run once and respect reduced motion",
);
assert.ok(
  css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") &&
    css.includes("@media (max-width: 359px)") &&
    css.includes("grid-template-columns: 1fr"),
  "collection cards must adapt at narrow mobile widths",
);
assert.ok(
  commission.includes("compactMobile") && page.includes("compactMobile"),
  "commission card must use its links-specific compact mobile variant",
);
assert.ok(
  !page.includes("Mystery Mail") && !page.includes("collectible mail"),
  "mobile links copy must not reintroduce removed products",
);

console.log("Mobile /links artist hub verification passed.");
