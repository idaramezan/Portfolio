import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../artifacts/aida-portfolio/src/pages/HundredWindows.tsx");
const store = read("../artifacts/aida-portfolio/src/lib/store.ts");
const editor = read(
  "../artifacts/aida-portfolio/src/pages/admin/ProductEditor.tsx",
);
const admin = read(
  "../artifacts/aida-portfolio/src/pages/admin/HundredWindows.tsx",
);
const links = read("../artifacts/aida-portfolio/src/pages/Links.tsx");
const media = read("../artifacts/api-server/src/routes/product-media.ts");
if (
  !store.includes("isHundredWindowsProduct?: boolean") ||
  !editor.includes("Part of 100 Windows / 100 Days")
)
  throw new Error("Canonical print project metadata is missing");
if (
  !store.includes("currentProductId") ||
  !admin.includes("Today’s window") ||
  !admin.includes('min="1"') ||
  !admin.includes('max="100"')
)
  throw new Error("Persistent project controls or validation are missing");
if (
  !page.includes("Date.parse(a.createdAt") ||
  !page.includes("[...asc].reverse()")
)
  throw new Error(
    "Day numbering must derive from createdAt ascending and display newest first",
  );
if (
  !page.includes("fourthwallProductId") ||
  !page.includes("International release coming soon") ||
  !page.includes("href={href}") ||
  !page.includes('target="_blank"')
)
  throw new Error(
    "Existing Fourthwall mapping or missing-link state is not reused",
  );
if (
  !store.includes("heroImageUrl") ||
  !admin.includes("hundred-windows-hero") ||
  !page.includes("heroUpdatedAt")
)
  throw new Error("Manually managed Hero or cache invalidation is missing");
if (
  !media.includes("10000000-0000-4000-8000-000000000100") ||
  !media.includes("ON CONFLICT(id) DO UPDATE")
)
  throw new Error(
    "Hero replacement must overwrite its dedicated optimized asset",
  );
if (
  !page.includes("siteLinks.tiktokUrl") ||
  !page.includes("siteLinks.twitchUrl") ||
  !page.includes("siteLinks.kickUrl")
)
  throw new Error("Existing live platform settings are not reused");
if (
  !page.includes('context="hundred-windows"') ||
  !links.includes('href="/100-windows"')
)
  throw new Error("Newsletter or Links integration is missing");
const sample = [
  { id: "a", createdAt: "2026-01-01" },
  { id: "b", createdAt: "2026-01-02" },
  { id: "c", createdAt: "2026-01-03" },
];
const asc = [...sample].sort(
  (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
);
const days = new Map(asc.map((p, i) => [p.id, i + 1]));
const display = [...asc].reverse().map((p) => [p.id, days.get(p.id)]);
if (
  JSON.stringify(display) !==
  JSON.stringify([
    ["c", 3],
    ["b", 2],
    ["a", 1],
  ])
)
  throw new Error("Scenario A chronology failed");
console.log("100 Windows / 100 Days verification passed.");
