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
const app = read("../src/App.tsx");
const links = read("../src/pages/Links.tsx");
const newsletterPage = read("../src/pages/Newsletter.tsx");
const newsletterLib = read("../src/lib/newsletter.ts");
const backend = read("../../api-server/src/routes/newsletter.ts");
const emailBackend = read("../../api-server/src/lib/email.ts");
const composer = read("../src/pages/admin/CampaignComposer.tsx");
const admin = read("../src/pages/Admin.tsx");

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
    "dedicated newsletter page and route",
    app.includes('path="/newsletter" component={Newsletter}') &&
      newsletterPage.includes('variant="story-preview" context="newsletter"') &&
      newsletterLib.includes('newsletter: "newsletter-page"'),
  ],
  [
    "Links page newsletter option",
    links.includes('href="/newsletter"') &&
      links.includes("Join the Studio Letter"),
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
    signup.includes(
      "Some paintings begin with a plan. This one began with a feeling.",
    ) &&
      signup.includes(
        "Bazı resimler bir planla başlar. Bu ise bir hisle başladı.",
      ),
  ],
  [
    "responsive story-preview layout",
    signup.includes("md:grid-cols-[.44fr_.56fr]") &&
      signup.includes("md:h-[540px]") &&
      signup.includes("motion-reduce:transition-none"),
  ],
  [
    "story locks immediately after childhood",
    signup.includes("brought back a childhood") &&
      signup.includes("memory. I remembered sitting in the back seat") &&
      signup.includes('aria-hidden="true"') &&
      signup.includes("blur-[6px]") &&
      signup.includes("pointer-events-none") &&
      signup.includes("select-none"),
  ],
  [
    "exact story invitation and CTA",
    signup.includes(
      "Continue reading the full story in the free Studio Letter.",
    ) && signup.includes("Read the rest in the Studio Letter"),
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
  [
    "regional Mystery Mail prioritizes Studio Letter",
    regional.includes('href="#studio-letter"') &&
      regional.includes(
        "Be the first to hear when the next sealed edition is revealed.",
      ) &&
      regional.includes("Join the Studio Letter"),
  ],
  ["unique form IDs", signup.includes("useId()")],
  [
    "source and locale metadata",
    signup.includes("source: NEWSLETTER_SOURCE[context]") &&
      signup.includes("locale,"),
  ],
  [
    "protected bulk campaign endpoints",
    backend.includes('router.post("/campaigns/test", requireAdmin') &&
      backend.includes('router.post("/campaigns/send", requireAdmin') &&
      backend.includes('req.body?.confirmation !== "SEND"'),
  ],
  [
    "private Resend batches",
    emailBackend.includes("RESEND_BATCH_ENDPOINT") &&
      emailBackend.includes("messages.length > 100") &&
      backend.includes("index += 100") &&
      backend.includes("to: subscriber.email"),
  ],
  [
    "bulk unsubscribe support",
    backend.includes("unsubscribed_at IS NULL") &&
      backend.includes('router.post("/unsubscribe", unsubscribe)') &&
      backend.includes(
        '"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"',
      ) &&
      emailBackend.includes("Unsubscribe from the Studio Letter"),
  ],
  [
    "safe block email formatter",
    backend.includes("renderCampaignBlocks") &&
      backend.includes("escapeHtml(block.text)") &&
      composer.includes("Font size") &&
      composer.includes("Optional image link") &&
      composer.includes("Send test") &&
      composer.includes("Send to all active subscribers"),
  ],
  [
    "admin composer route",
    admin.includes('location === "/admin/subscribers/compose"') &&
      admin.includes("<CampaignComposer />"),
  ],
];

for (const [name, passed] of checks)
  assert.ok(passed, `Newsletter verification failed: ${name}`);
console.log(
  `Newsletter acquisition verification passed (${checks.length} checks).`,
);
