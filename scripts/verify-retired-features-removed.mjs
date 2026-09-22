import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../artifacts/aida-portfolio/src/App.tsx");
const admin = read("../artifacts/aida-portfolio/src/pages/Admin.tsx");
const nav = read(
  "../artifacts/aida-portfolio/src/components/admin/AdminLayout.tsx",
);
const api = read("../artifacts/api-server/src/routes/index.ts");
const checkout = read("../artifacts/api-server/src/routes/checkout.ts");
const homeCommerce = read(
  "../artifacts/aida-portfolio/src/components/HomeCommerce.tsx",
);

for (const path of [
  "../artifacts/aida-portfolio/src/pages/MysteryMail.tsx",
  "../artifacts/aida-portfolio/src/pages/VisualGallery.tsx",
  "../artifacts/aida-portfolio/src/pages/admin/VisualGallery.tsx",
  "../artifacts/aida-portfolio/src/pages/admin/CollectorExperience.tsx",
  "../artifacts/aida-portfolio/src/pages/admin/OriginalRequests.tsx",
  "../artifacts/api-server/src/routes/collector-experience.ts",
  "../artifacts/api-server/src/routes/visual-gallery.ts",
])
  assert.equal(existsSync(new URL(path, import.meta.url)), false, `${path} remains`);

assert.ok(!app.includes("GALLERY_PREVIEW_PATH"));
assert.ok(!admin.includes("OriginalRequests"));
assert.ok(!nav.includes("Mystery Mail") && !nav.includes("Visual Gallery"));
assert.ok(!api.includes("collectorExperienceRouter"));
assert.ok(!checkout.includes('/original-requests"'));
assert.ok(
  homeCommerce.includes("mailClubEditions"),
  "Mail Club must remain available",
);

console.log("Retired feature removal verification passed.");
