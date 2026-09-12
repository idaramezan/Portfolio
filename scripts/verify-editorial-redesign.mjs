import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const theme = read(
  "../artifacts/aida-portfolio/src/styles/editorial-theme.css",
);
const index = read("../artifacts/aida-portfolio/src/index.css");
const shell = read(
  "../artifacts/aida-portfolio/src/components/layout/Shell.tsx",
);
const home = read("../artifacts/aida-portfolio/src/pages/Home.tsx");
const shop = read("../artifacts/aida-portfolio/src/pages/UnifiedShop.tsx");
const links = read("../artifacts/aida-portfolio/src/pages/Links.tsx");
const toast = read("../artifacts/aida-portfolio/src/components/ui/toast.tsx");

for (const token of [
  "--forest-950",
  "--ivory-50",
  "--amber-500",
  "--bg-page",
  "--bg-card",
  "--text-primary",
  "--text-secondary",
  "--border-soft",
  "--accent-primary",
])
  assert.ok(index.includes(token), `Missing design token ${token}`);

for (const surface of [
  ".site-header",
  ".mobile-menu",
  ".site-footer",
  ".button-primary",
  ".checkout-panel",
  ".unified-product-card",
  ".events-card",
  ".links-page",
])
  assert.ok(theme.includes(surface), `Missing public treatment for ${surface}`);

assert.ok(shell.includes("data-public-site"));
assert.ok(links.includes("data-public-site"));
assert.ok(!shell.includes("/100-windows"));
assert.ok(!home.includes("STUDIO LETTER"));
assert.ok(!shop.includes('"100-windows"'));
assert.ok(toast.includes("#f7f4ec") && toast.includes("#985846"));
assert.ok(theme.includes("prefers-reduced-motion"));
assert.ok(theme.includes("@media (max-width: 767px)"));
assert.ok(home.includes('HERO_IMAGE = "/assets/aida-green-gallery-hero.png"'));
assert.ok(
  home.includes('id="collection"') && home.includes("home-collection-grid"),
);
assert.ok(
  home.includes('id="commissions"') && home.includes("home-green-newsletter"),
);
assert.ok(
  existsSync(
    new URL(
      "../artifacts/aida-portfolio/public/assets/aida-green-gallery-hero.png",
      import.meta.url,
    ),
  ),
  "Supplied homepage hero must be present",
);

console.log("Editorial public-site redesign verification passed.");
