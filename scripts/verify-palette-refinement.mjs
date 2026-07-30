import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../artifacts/aida-portfolio/src/playful-studio-editorial.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../artifacts/aida-portfolio/src/pages/Home.tsx", import.meta.url), "utf8");
const event = readFileSync(new URL("../artifacts/aida-portfolio/src/components/IstanbulPaintingEventBanner.tsx", import.meta.url), "utf8");
const consent = readFileSync(new URL("../artifacts/aida-portfolio/src/components/AnalyticsConsent.tsx", import.meta.url), "utf8");
const video = readFileSync(new URL("../artifacts/aida-portfolio/src/components/OriginalCollectorExperience.tsx", import.meta.url), "utf8");

for (const [token, value] of [["--paper", "#fbf5ea"], ["--ink-plum", "#392a34"], ["--candy-pink", "#e8a9c2"], ["--raspberry", "#b84775"], ["--powder-blue", "#c9ddf0"], ["--soft-peach", "#f3c9b5"], ["--footer-plum", "#68495a"]]) assert.ok(css.includes(`${token}: ${value}`), `missing revised token ${token}`);
assert.ok(event.includes("home-event-announcement__places") && event.includes("event-ticket") && !event.includes('home-event-announcement border-b border-white/10 bg-[#171713]'), "event surfaces must use the ticket identity rather than black");
assert.ok(consent.includes("analytics-sheet__accept") && consent.includes("analytics-sheet__decline") && consent.includes("Manage preferences") && !consent.includes('className="button-primary"'), "analytics must be a clean utility bottom sheet");
assert.ok(home.includes("Local shop") && home.includes("Worldwide") && home.includes("home-category-link--paper") && !home.includes("hasActiveShoppingRegionPreference"), "homepage must use postcard markets and paper-strip categories once");
assert.ok(css.includes("background: var(--powder-blue) !important") && css.includes("background: var(--footer-plum) !important"), "Studio Letter and footer must use their new identities");
assert.ok(video.includes("video.pause()") && video.includes("mediaInView"), "native packaging video must pause off-screen");
assert.ok(css.includes('[id^="smartlook-feedback"]'), "public Smartlook feedback handle must be hidden without removing analytics");
console.log("Palette and UX refinement verification passed.");
