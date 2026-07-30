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
      `Missing Featured Newsletter placement mapping: ${value}`,
    );
  }
}

if (
  !component.includes('context === "turkiye"') ||
  !component.includes('context === "international"')
) {
  throw new Error(
    "Storefront Newsletter contexts are not mapped to API placements",
  );
}

if (!route.includes("$12::timestamp AT TIME ZONE $14")) {
  throw new Error(
    "Featured Newsletter schedules must apply their configured timezone",
  );
}

if (
  !route.includes('block.type === "text"') ||
  !route.includes('block.size !== "heading"') ||
  !route.includes('block.size !== "large"') ||
  !route.includes("Math.min(55, row.preview_word_count)") ||
  !route.includes("Math.min(34, desktopWordCount)") ||
  !route.includes("desktopExcerpt") ||
  !route.includes("mobileExcerpt")
) {
  throw new Error(
    "Homepage preview must expose exactly 55 story-body words without headings",
  );
}

if (
  !component.includes("featured.mobileExcerpt") ||
  !component.includes("featured.desktopExcerpt") ||
  !component.includes('presentation?: "compact" | "standard" | "page-feature"')
) {
  throw new Error(
    "Featured Letter must select safe responsive excerpts through one controlled component",
  );
}

if (
  !component.includes("studio-letter-preview__blur") ||
  component.includes("Continue reading this Newsletter after joining")
) {
  throw new Error(
    "Featured Letter continuation must be decorative and contain no hidden story text",
  );
}

console.log("Featured Newsletter placement verification passed.");
