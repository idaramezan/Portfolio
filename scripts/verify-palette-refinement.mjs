import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../artifacts/aida-portfolio/src/playful-studio-editorial.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../artifacts/aida-portfolio/src/pages/Home.tsx", import.meta.url), "utf8");
const event = readFileSync(new URL("../artifacts/aida-portfolio/src/components/IstanbulPaintingEventBanner.tsx", import.meta.url), "utf8");
const consent = readFileSync(new URL("../artifacts/aida-portfolio/src/components/AnalyticsConsent.tsx", import.meta.url), "utf8");
const video = readFileSync(new URL("../artifacts/aida-portfolio/src/components/OriginalCollectorExperience.tsx", import.meta.url), "utf8");

for (const [token, value] of [["--page-bg", "#fbf6ec"], ["--surface", "#fff9f2"], ["--surface-secondary", "#f1e7da"], ["--ink", "#3b2935"], ["--pink-light", "#f4cfda"], ["--pink", "#c15a83"], ["--pink-dark", "#8e3d60"], ["--blue-light", "#dcebf3"], ["--blue-dark", "#58798b"]]) assert.ok(css.includes(`${token}: ${value}`), `missing revised token ${token}`);
assert.ok(event.includes("home-event-announcement__places") && event.includes("event-ticket") && !event.includes('home-event-announcement border-b border-white/10 bg-[#171713]'), "event surfaces must use the ticket identity rather than black");
assert.ok(consent.includes("analytics-sheet__accept") && consent.includes("analytics-sheet__decline") && consent.includes("Manage preferences") && !consent.includes('className="button-primary"'), "analytics must be a clean utility bottom sheet");
assert.ok(home.includes("Local shop") && home.includes("Worldwide") && home.includes("home-market-action__content") && home.includes("home-category-link__content") && home.includes("originalsCoverImage") && home.includes("printsCoverImage") && home.includes("studioMailCoverImage") && !home.includes("hasActiveShoppingRegionPreference"), "homepage must provide clear destination and image-led category navigation once");
assert.ok(home.includes('alt="Original artwork and packaging from Aida’s Istanbul studio"') && home.includes('alt="Aida’s prints prepared for collectors worldwide"'), "shop destination cards must use real contextual images");
assert.ok(css.includes("background: var(--blue-light) !important") && css.includes(".public-footer") && css.includes("background: var(--blue-light) !important"), "Studio Letter and footer must use the light-blue identity");
assert.ok(css.includes("-webkit-line-clamp: initial") && css.includes("max-height: none") && css.includes("overflow: visible"), "event banner must be content-driven and untruncated");
assert.ok(!css.includes(".home-event-announcement {\n  position: relative;\n  overflow: hidden") && !css.includes("home-category-link--paper > span:not") && event.includes("home-event-announcement__photo") && event.includes("bannerTitle"), "event CTA, image, and short title must remain visible");
assert.ok(home.includes("home-market-action__arrow") && css.includes("border-left-color: var(--blue-dark)") && !css.includes(".home-market-action:nth-child(2) {\n  border-color: color-mix"), "destination postcards must use restrained pink and blue accents");
assert.ok(home.includes('title: "Originals"') && home.includes("<p>{item.copy}</p>") && home.includes("home-category-link__label"), "category navigation must provide image-led editorial context");
assert.ok(css.includes(".managed-product-card__title") && css.includes(".international-product-card") && css.includes("margin-top: auto"), "product cards must have defined equal-height surfaces and bottom-aligned actions");
assert.ok(video.includes("video.pause()") && video.includes("mediaInView"), "native packaging video must pause off-screen");
assert.ok(css.includes('[id^="smartlook-feedback"]'), "public Smartlook feedback handle must be hidden without removing analytics");
console.log("Palette and UX refinement verification passed.");
