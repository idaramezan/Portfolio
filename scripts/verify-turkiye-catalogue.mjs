import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const landing = readFileSync(new URL("../artifacts/aida-portfolio/src/pages/RegionalLanding.tsx", import.meta.url), "utf8");
const event = readFileSync(new URL("../artifacts/aida-portfolio/src/components/IstanbulPaintingEventBanner.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../artifacts/aida-portfolio/src/index.css", import.meta.url), "utf8");

assert.ok(landing.includes('if (tr) return <TurkiyeCatalogue />'), "Türkiye must use its focused catalogue while preserving the international landing");
assert.ok(landing.includes("Art available in Türkiye") && landing.includes("with free delivery across Türkiye"), "compact shop introduction must use the requested copy");
assert.ok(landing.includes('type TurkiyeCategory = "all"') && landing.includes('"mystery-mail"') && landing.includes('URLSearchParams(window.location.search)'), "categories and sorting must use direct URL state");
assert.ok(landing.includes("availableCategories") && landing.includes("product.category === \"sticker\"") && landing.includes("product.category === \"tshirt\" || product.category === \"mug\""), "catalogue controls must reflect actual available normalized categories");
assert.ok(landing.includes("activeMystery(settings, now)") && landing.includes("<CompactMysteryFeature"), "only the active configured Mystery Mail should receive a compact feature");
assert.ok(landing.includes("<ManagedProductCard") && landing.includes("<TurkeyProductDialog") && landing.includes("Secure checkout"), "catalogue must reuse product and option flows and direct customers to first-party checkout");
assert.ok(event.includes('compact && placement === "turkiye-shop"') && event.includes("remainingSeats"), "shop event strip must reuse the existing remaining-seat source of truth");
assert.ok(styles.includes(".turkiye-catalogue__controls") && styles.includes("position: sticky") && styles.includes("font-size: clamp(2.65rem, 12vw, 3rem)"), "mobile category navigation and compact heading must appear quickly");
assert.ok(landing.indexOf("function TurkiyeCatalogue") < landing.indexOf("<StudioLetterSignup"), "Türkiye catalogue branch must not render the landing-page Newsletter or promotional tail");
console.log("Türkiye catalogue verification passed.");
