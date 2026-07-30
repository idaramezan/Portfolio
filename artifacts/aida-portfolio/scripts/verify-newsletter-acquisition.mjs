import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "../src/lib/newsletter.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const signup = read("../src/components/StudioLetterSignup.tsx");
const storefrontCss = read("../src/index.css");
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
const eventBanner = read("../src/components/IstanbulPaintingEventBanner.tsx");
const eventAdmin = read("../src/pages/admin/EventRegistrations.tsx");
const adminLayout = read("../src/components/admin/AdminLayout.tsx");

const checks = [
  [
    "homepage story-preview section",
    home.includes('variant="story-preview"') && home.includes('context="home"'),
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
    links.includes('href="/studio-letter"') &&
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
      signup.includes('disabled={status === "loading"'),
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
    signup.includes("Send me the full story") &&
      signup.includes("Hikâyenin tamamını gönder"),
  ],
  [
    "responsive story-preview layout",
    storefrontCss.includes(".studio-letter-preview__layout") &&
      storefrontCss.includes("grid-template-columns: minmax(0, 0.44fr) minmax(0, 0.56fr)") &&
      storefrontCss.includes("@media (max-width: 767px)"),
  ],
  [
    "story preview remains server-controlled and safely obscured",
    signup.includes("featured.mobileExcerpt || featured.excerpt") &&
      signup.includes("featured.desktopExcerpt || featured.excerpt") &&
      signup.includes('aria-hidden="true"') &&
      signup.includes("blur-[4px]") &&
      signup.includes("pointer-events-none") &&
      signup.includes("select-none"),
  ],
  [
    "localized story invitation and CTA",
    signup.includes("copy.continue") &&
      signup.includes("copy.transition") &&
      signup.includes("copy.storySubmit"),
  ],
  [
    "admin-selected story assets and non-cropping primary image",
    signup.includes("featured.images.map") &&
      signup.includes("image.url") &&
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
  [
    "reusable template library",
    backend.includes('router.get("/templates", requireAdmin') &&
      backend.includes('router.post("/templates", requireAdmin') &&
      backend.includes('router.put("/templates/:id", requireAdmin') &&
      backend.includes('router.delete("/templates/:id", requireAdmin') &&
      backend.includes("starterTemplates") &&
      composer.includes("Template library") &&
      composer.includes("Save customized copy"),
  ],
  [
    "all or selected recipient sending",
    backend.includes("requestedIds") &&
      backend.includes("id = ANY($1::int[])") &&
      composer.includes('recipientMode === "selected"') &&
      composer.includes("Select shown") &&
      composer.includes("selectedRecipients"),
  ],
  [
    "painting event banner placement",
    home.indexOf('<IstanbulPaintingEventBanner placement="home" compact />') <
      home.indexOf('<section className="home-market-hero">') &&
      regional.includes('placement="turkiye-shop"') &&
      regional.indexOf('placement="turkiye-shop"') <
        regional.indexOf("regional-shop-hero"),
  ],
  [
    "event-specific newsletter metadata",
    eventBanner.includes('source: "istanbul-painting-day-august-2026"') &&
      eventBanner.includes("campaignId: config.id") &&
      eventBanner.includes("eventInterest: true") &&
      eventBanner.includes("consentToStudioLetter: true"),
  ],
  [
    "duplicate-safe private event registration",
    backend.includes("pg_advisory_xact_lock") &&
      backend.includes("newsletter_event_interests") &&
      backend.includes("UNIQUE (campaign_id, email)") &&
      backend.includes("VALUES ($1, $2, $3, $4)"),
  ],
  [
    "event expectations and WhatsApp continuation",
    eventBanner.includes("reserved only after personal confirmation") &&
      eventBanner.includes("continues personally on WhatsApp") &&
      eventBanner.includes("settings.whatsapp.number") &&
      eventBanner.includes("encodeURIComponent(WHATSAPP_MESSAGE)"),
  ],
  [
    "event campaign expiry is database-driven",
    backend.includes("config.display_end_at") &&
      backend.includes("now < new Date(config.display_end_at)"),
  ],
  [
    "compact image-led event notice",
    eventBanner.includes("home-event-announcement__photo") &&
      eventBanner.includes("remainingSeats") &&
      eventBanner.includes("bannerTitle") &&
      !eventBanner.includes("Sparkles") &&
      !eventBanner.includes("Availability"),
  ],
  [
    "private event-specific HTML and plain-text email",
    backend.includes("sendPaintingEventInterestEmail") &&
      backend.includes("buildPaintingEventInterestEmail") &&
      backend.includes(
        "Your attendance is confirmed personally by Aida on WhatsApp",
      ) &&
      backend.includes("config.secondary_details_en || config.description_en") &&
      backend.includes("text,") &&
      emailBackend.includes("text: input.text"),
  ],
  [
    "structured event registration response",
    backend.includes("subscriberStatus") &&
      backend.includes("eventRegistrationStatus") &&
      backend.includes("emailDeliveryStatus") &&
      backend.includes("whatsappUrl") &&
      !backend.includes("registrationTier:") &&
      !backend.includes("participationFeeTry:"),
  ],
  [
    "event participation fee remains database-driven",
    eventBanner.includes("participation_price_try") &&
      backend.includes("seat_count * $2 END AS participation_fee_try") &&
      backend.includes("config.participation_price_try"),
  ],
  [
    "confirmed seat capacity drives public availability",
    backend.includes("eventRemainingSeats(config.total_capacity)") &&
      backend.includes("SUM(seat_count)") &&
      backend.includes("reservation_status IN ('confirmed', 'attended')") &&
      backend.includes("remainingSeats") &&
      eventBanner.includes("setRemainingSeats") &&
      !eventBanner.includes("11 places"),
  ],
  [
    "admin seat quantity and free-or-paid costing",
    backend.includes("seat_count = $4, is_free = $5") &&
      backend.includes("Not enough places remain for this reservation") &&
      eventAdmin.includes("Seat count") &&
      eventAdmin.includes('value={registration.is_free ? "free" : "paid"}') &&
      eventAdmin.includes("registration.seat_count * price"),
  ],
  [
    "complimentary eligibility is never public",
    !eventBanner.includes("freePlacesRemaining") &&
      !eventBanner.includes("registrationTier") &&
      !eventBanner.includes("isFree") &&
      !backend.includes("freePlacesRemaining") &&
      !backend.includes("interestCount,") &&
      !backend.includes("eventRegistration.is_free") &&
      !backend.includes("input.isFree"),
  ],
  [
    "confirmed seven-second success toast",
    eventBanner.includes("Spam or Junk folder") &&
      eventBanner.includes("setTimeout(() => setShowToast(false), 7_000)") &&
      eventBanner.includes('aria-label="Close notification"') &&
      eventBanner.includes('setEmail("")') &&
      eventBanner.indexOf("showSuccessToast()") >
        eventBanner.indexOf("if (!response.ok)"),
  ],
  [
    "event email failure preserves registration",
    backend.includes("email_delivery_status = 'failed'") &&
      backend.includes("Delivery failed and is pending retry") &&
      eventBanner.includes(
        "We couldn’t send the event details. Please try again.",
      ),
  ],
  [
    "protected event operations and safe previews",
    backend.includes('router.get("/event-interests", requireAdmin') &&
      backend.includes('router.patch("/event-interests/:id", requireAdmin') &&
      backend.includes('router.get("/event-email-preview", requireAdmin') &&
      admin.includes('location === "/admin/events/painting-day"') &&
      adminLayout.includes("Event registrations") &&
      eventAdmin.includes("email_delivery_status") &&
      eventAdmin.includes("Event email preview") &&
      eventAdmin.includes("Wednesday, 5 August 2026") &&
      !eventAdmin.includes("Complimentary"),
  ],
];

for (const [name, passed] of checks)
  assert.ok(passed, `Newsletter verification failed: ${name}`);
console.log(
  `Newsletter acquisition verification passed (${checks.length} checks).`,
);
