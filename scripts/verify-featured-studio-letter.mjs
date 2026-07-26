import { readFileSync } from "node:fs";

const component = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/components/StudioLetterSignup.tsx",
    import.meta.url,
  ),
  "utf8",
);
const route = readFileSync(
  new URL("../artifacts/api-server/src/routes/newsletter.ts", import.meta.url),
  "utf8",
);

for (const value of [
  "turkiye",
  "turkiye-shop",
  "international",
  "international-shop",
  "home",
]) {
  if (!component.includes(value) && !route.includes(value)) {
    throw new Error(
      `Missing Featured Studio Letter placement mapping: ${value}`,
    );
  }
}

if (
  !component.includes('context === "turkiye"') ||
  !component.includes('context === "international"')
) {
  throw new Error(
    "Storefront Studio Letter contexts are not mapped to API placements",
  );
}

console.log("Featured Studio Letter placement verification passed.");
