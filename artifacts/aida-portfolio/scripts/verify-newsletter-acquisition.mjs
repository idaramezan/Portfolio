import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "../src/lib/newsletter.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const signup = read("../src/components/StudioLetterSignup.tsx");
const home = read("../src/pages/Home.tsx");
const regional = read("../src/pages/RegionalLanding.tsx");
const mystery = read("../src/pages/MysteryMail.tsx");
const footer = read("../src/components/layout/Newsletter.tsx");
const shell = read("../src/components/layout/Shell.tsx");
const backend = read("../../api-server/src/routes/newsletter.ts");

const checks = [
  [
    "homepage story-preview section",
    home.includes('variant="story-preview" context="home"'),
  ],
  [
    "Türkiye shop editorial source",
    regional.includes('context={tr ? "turkiye" : "international"}'),
  ],
  [
    "International shop editorial source",
    regional.includes('context={tr ? "turkiye" : "international"}'),
  ],
  [
    "footer form remains",
    footer.includes('variant="footer" context="footer"') &&
      shell.includes("<Newsletter />"),
  ],
  [
    "valid email normalization",
    normalizeNewsletterEmail("  ART@Example.COM ") === "art@example.com" &&
      isValidNewsletterEmail("art@example.com") &&
      !isValidNewsletterEmail("not-an-email"),
  ],
  [
    "invalid email inline alert",
    signup.includes('role="alert"') && signup.includes("copy.invalid"),
  ],
  [
    "loading blocks duplicate submits",
    signup.includes("submitting.current") &&
      signup.includes('disabled={status === "loading"}'),
  ],
  [
    "duplicate success state",
    signup.includes("result.alreadySubscribed") &&
      signup.includes("copy.duplicate"),
  ],
  [
    "backend duplicate response",
    backend.includes("already_subscribed") &&
      backend.includes("alreadySubscribed"),
  ],
  [
    "available Mystery Mail purchase CTA",
    mystery.includes("Add Mystery Mail to basket"),
  ],
  [
    "available Mystery Mail secondary signup",
    mystery.includes("mystery-next-edition-heading"),
  ],
  [
    "coming-soon signup state",
    mystery.includes("THE NEXT MYSTERY IS FORMING") &&
      mystery.includes("Notify me through the Studio Letter"),
  ],
  [
    "closed signup state",
    mystery.includes("THIS EDITION HAS CLOSED") &&
      mystery.includes("Be first to know"),
  ],
  [
    "unavailable state exits before product price",
    mystery.indexOf("if (betweenEditions)") < mystery.indexOf("Edition price"),
  ],
  [
    "countdown only renders for active edition",
    mystery.includes("{active && <CompactCountdown"),
  ],
  [
    "English and Turkish copy",
    signup.includes("Every painting begins somewhere.") &&
      signup.includes("Her resim bir yerde başlar."),
  ],
  [
    "responsive story-preview layout",
    signup.includes("lg:grid-cols-[.88fr_1.12fr]") &&
      signup.includes("sm:min-h-[680px]") &&
      signup.includes("motion-reduce:transition-none"),
  ],
  [
    "exact story assets and non-cropping painting",
    signup.includes("memories-of-summer-reference-photo.png") &&
      signup.includes("memories-of-summer-painting.JPG") &&
      signup.includes("object-contain"),
  ],
  [
    "accessible image viewer",
    signup.includes('role="dialog"') &&
      signup.includes('aria-modal="true"') &&
      signup.includes('event.key === "Escape"') &&
      signup.includes("image.trigger.focus()") &&
      signup.includes("closeLabel={copy.closeImage}"),
  ],
  [
    "Mystery unavailable state stays compact and subscriber focused",
    mystery.includes("bg-ochre/10") &&
      mystery.includes('context="mystery-mail"') &&
      mystery.includes("Yeni Mystery Mail açıldığında ilk öğrenenlerden ol."),
  ],
  ["unique form IDs", signup.includes("useId()")],
  [
    "source and locale metadata",
    signup.includes("source: NEWSLETTER_SOURCE[context]") &&
      signup.includes("locale,"),
  ],
];

for (const [name, passed] of checks)
  assert.ok(passed, `Newsletter verification failed: ${name}`);
console.log(
  `Newsletter acquisition verification passed (${checks.length} checks).`,
);
