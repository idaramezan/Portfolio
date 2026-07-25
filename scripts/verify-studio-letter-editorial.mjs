import assert from "node:assert/strict";
import fs from "node:fs";

const composer = fs.readFileSync(
  "artifacts/aida-portfolio/src/pages/admin/CampaignComposer.tsx",
  "utf8",
);
const renderer = fs.readFileSync(
  "artifacts/api-server/src/routes/newsletter.ts",
  "utf8",
);
const media = fs.readFileSync(
  "artifacts/api-server/src/routes/product-media.ts",
  "utf8",
);

for (const block of ["photo-row", "product-card", "product-row"])
  assert.ok(composer.includes(block));
for (const style of ["studio-photograph", "clean", "borderless"])
  assert.ok(composer.includes(style));
for (const layout of ["featured", "vertical", "horizontal"])
  assert.ok(composer.includes(layout));
assert.match(composer, /Displayed width:/);
assert.match(composer, /Duplicate block/);
assert.match(composer, /version: 2/);
assert.match(composer, /blocks,/);
assert.doesNotMatch(composer, /blocks\.map\(\(\{ id:/);
assert.match(renderer, /role=\"presentation\"/);
assert.match(renderer, /email-column/);
assert.match(renderer, /utm_source/);
assert.match(renderer, /studio_letter/);
assert.match(renderer, /A linked product no longer exists/);
assert.match(renderer, /is not published/);
assert.match(renderer, /Photograph from Aida’s studio/);
assert.match(renderer, /document_version/);
assert.match(renderer, /function publicUrl/);
assert.match(media, /8 \* 1024 \* 1024/);
assert.match(media, /jpeg/);
assert.match(media, /source_data/);
assert.doesNotMatch(renderer, /add-to-basket/i);
console.log("Studio Letter editorial verification passed (22 checks).");
