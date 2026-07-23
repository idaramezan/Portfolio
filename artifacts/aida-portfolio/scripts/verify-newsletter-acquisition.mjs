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
    "homepage editorial section",
    home.includes('variant="editorial" context="home"'),
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
    mystery.includes("THE NEXT MYSTERY IS BEING PREPARED") &&
      mystery.includes("Tell me when it opens"),
  ],
  [
    "closed signup state",
    mystery.includes("THIS EDITION HAS CLOSED") &&
      mystery.includes("Be first to know"),
  ],
  [
    "unavailable state exits before product price",
    mystery.indexOf("if (betweenEditions || closed || soldOut)") <
      mystery.indexOf("Edition price"),
  ],
  [
    "countdown only renders for active edition",
    mystery.includes("{active && <CompactCountdown"),
  ],
  [
    "English and Turkish copy",
    signup.includes("Stories from the studio, sent to you.") &&
      signup.includes("Atölyeden hikâyeler, doğrudan sana."),
  ],
  [
    "responsive editorial layout",
    signup.includes("lg:grid-cols-[1.1fr_.9fr]") &&
      signup.includes("px-6 py-12"),
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
