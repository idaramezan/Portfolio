import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../artifacts/aida-portfolio/src/playful-studio-editorial.css", import.meta.url), "utf8");
const components = readFileSync(new URL("../artifacts/aida-portfolio/src/components/ui/playful-studio.tsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../artifacts/aida-portfolio/src/index.css", import.meta.url), "utf8");
const admin = readFileSync(new URL("../artifacts/aida-portfolio/src/components/admin/AdminLayout.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../artifacts/aida-portfolio/src/components/layout/Shell.tsx", import.meta.url), "utf8");
const email = readFileSync(new URL("../artifacts/api-server/src/lib/email.ts", import.meta.url), "utf8");
const newsletter = readFileSync(new URL("../artifacts/api-server/src/routes/newsletter.ts", import.meta.url), "utf8");
const main = readFileSync(new URL("../artifacts/aida-portfolio/src/main.tsx", import.meta.url), "utf8");

for (const token of ["--color-paper-soft", "--color-white-warm", "--color-muted-light", "--color-candy-pink", "--color-butter", "--color-sky", "--color-mint", "--color-lilac", "--rough-paper"]) assert.ok(css.includes(token), `missing design token ${token}`);
assert.ok(index.includes("Lilita+One") && index.includes("--font-play"), "playful display face must be shared through the typography system");
assert.ok(main.indexOf('import "./playful-studio-editorial.css"') > main.indexOf('import "./index.css"'), "design system must load after legacy component CSS");
assert.ok(css.includes(".button-primary") && css.includes("clip-path: var(--rough-paper)") && css.includes("font-family: var(--font-play)"), "paper CTAs must be scalable CSS rather than bitmap buttons");
assert.ok(css.includes(".managed-product-card") && css.includes("border: 0") && css.includes(".shop-category-tabs"), "catalogue cards and category paper strips need distinct personalities");
assert.ok(components.includes("StudioWordmark") && components.includes("PaperTag") && components.includes("UtilityMessage"), "reusable design-system primitives must exist");
assert.ok(shell.includes("<StudioWordmark compact") && admin.includes("<StudioWordmark compact") && admin.includes("<PaperTag"), "public and admin shells must consume shared primitives");
assert.ok(email.includes("#efcad8") && newsletter.includes("font-family:Arial Black") && newsletter.includes("@media only screen and (max-width:620px)"), "transactional and Studio Letter email rendering must share the playful system responsively");
assert.ok(!shell.includes("Group 8340.png") && !css.includes("Group 8340.png"), "reference bitmap must not be used as a UI control");
console.log("Playful Studio Editorial verification passed.");
