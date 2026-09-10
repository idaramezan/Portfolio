import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../artifacts/aida-portfolio/src/App.tsx");
const admin = read("../artifacts/aida-portfolio/src/pages/Admin.tsx");
const nav = read(
  "../artifacts/aida-portfolio/src/components/admin/AdminLayout.tsx",
);
const page = read("../artifacts/aida-portfolio/src/pages/VisualGallery.tsx");
const editor = read(
  "../artifacts/aida-portfolio/src/pages/admin/VisualGallery.tsx",
);
const api = read("../artifacts/api-server/src/routes/visual-gallery.ts");
const migration = read("../lib/db/migrations/0015_visual_gallery.sql");
const shell = read(
  "../artifacts/aida-portfolio/src/components/layout/Shell.tsx",
);

assert.ok(
  app.includes("GALLERY_PREVIEW_PATH") && app.includes("VisualGallery"),
);
assert.ok(
  !shell.includes("gallery-preview-7v4m2k9"),
  "preview must not enter public navigation",
);
assert.ok(admin.includes('location === "/admin/marketing/visual-gallery"'));
assert.ok(nav.includes('"Visual Gallery"'));
assert.ok(
  api.includes("galleryVisibilityAllowsAccess") &&
    api.includes('visibility === "private_preview" ? authenticated : true'),
);
assert.ok(api.includes('res.status(404).json({ error: "Not found" })'));
for (const table of [
  "gallery_settings",
  "gallery_scenes",
  "gallery_elements",
  "gallery_assets",
])
  assert.ok(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
assert.ok(
  editor.includes("onPointerDown") && editor.includes("gallery-resize-handle"),
);
assert.ok(
  editor.includes("Undo2") &&
    editor.includes("Redo2") &&
    editor.includes("beforeunload"),
);
assert.ok(
  editor.includes("/api/admin/product-media") &&
    editor.includes("products.originalProducts"),
);
assert.ok(
  editor.includes('save("draft")') && editor.includes('save("published")'),
);
assert.ok(
  page.includes('role="dialog"') && page.includes('event.key === "Escape"'),
);
assert.ok(
  page.includes("Previous room") &&
    page.includes("Next room") &&
    page.includes("isSoldOut"),
);
assert.ok(
  page.includes("Resimler için küçük bir galeri") &&
    page.includes("A little gallery for the art"),
);

console.log("Visual Gallery architecture verification passed.");
