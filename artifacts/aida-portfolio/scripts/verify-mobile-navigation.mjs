import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const shell = readFileSync(
  new URL("../src/components/layout/Shell.tsx", import.meta.url),
  "utf8",
);

const headerClose = shell.indexOf("</header>");
const overlay = shell.indexOf("{isMobileMenuOpen && (");
assert.ok(
  headerClose >= 0 && overlay > headerClose,
  "mobile overlay must be outside the backdrop-filtered header",
);
assert.ok(
  shell.includes("ref={menuButtonRef}"),
  "menu trigger must own the focus-return ref",
);
assert.ok(
  shell.includes('document.body.style.overflow = "hidden"'),
  "open mobile menu must lock background scrolling",
);
assert.ok(
  shell.includes("h-dvh overscroll-contain"),
  "mobile overlay must use the dynamic viewport and contain overscroll",
);
assert.ok(
  shell.includes("disabled={isMobileMenuOpen}"),
  "header controls behind the mobile overlay must be disabled",
);

console.log("Mobile navigation verification passed.");
