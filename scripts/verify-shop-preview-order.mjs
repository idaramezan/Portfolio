import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const landing = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/pages/RegionalLanding.tsx",
    import.meta.url,
  ),
  "utf8",
);
const international = readFileSync(
  new URL(
    "../artifacts/api-server/src/routes/international.ts",
    import.meta.url,
  ),
  "utf8",
);

assert.ok(
  landing.indexOf('eyebrow">Prints & goods') <
    landing.indexOf('tr ? "New from the studio" : "Original art"'),
  "prints must render before originals on regional landing pages",
);
assert.ok(
  landing.includes("products.slice(0, 6).map") &&
    landing.includes("international.products.slice(0, 6).map"),
  "both managed and international previews must contain six products",
);
assert.ok(
  landing.includes("prints.length > 6") &&
    landing.includes("originals.length > 6") &&
    landing.includes("international.products.length > 6"),
  "See more links must only appear when additional products exist",
);
assert.ok(
  international.includes("raw.updatedAt") &&
    international.includes("Date.parse(b.updatedAt"),
  "Fourthwall products must be newest-first when provider dates are available",
);

console.log("Regional shop preview ordering verification passed.");
