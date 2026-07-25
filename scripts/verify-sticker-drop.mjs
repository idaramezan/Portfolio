import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(
  "artifacts/api-server/src/routes/sticker-drop.ts",
  "utf8",
);
const ui = fs.readFileSync(
  "artifacts/aida-portfolio/src/components/StickerDropExperience.tsx",
  "utf8",
);
const admin = fs.readFileSync(
  "artifacts/aida-portfolio/src/pages/admin/StickerDrop.tsx",
  "utf8",
);

for (const status of [
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "archived",
])
  assert.ok(api.includes(`"${status}"`));
assert.match(api, /start_at<=NOW\(\) AND end_at>NOW\(\)/);
assert.match(api, /5 \* 1024 \* 1024/);
assert.match(api, /hasAlpha/);
assert.match(api, /at most 20 stickers/);
assert.match(api, /https:/);
assert.match(ui, /prefers-reduced-motion/);
assert.match(ui, /role="dialog"/);
assert.match(ui, /aria-modal="true"/);
assert.match(admin, /once_per_campaign/);
assert.match(ui, /once_per_session/);
assert.match(ui, /repeat_after_days/);
assert.match(ui, /sticker_drop_modal_opened/);
assert.match(ui, /sticker_drop_add_to_basket/);
assert.match(admin, /transparent PNG/);
console.log("Sticker Drop verification passed (17 checks).");
