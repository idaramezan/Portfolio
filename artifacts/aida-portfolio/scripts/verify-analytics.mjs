import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const client = read("../src/lib/analytics.ts");
const consent = read("../src/components/AnalyticsConsent.tsx");
const server = read("../../api-server/src/routes/analytics.ts");
const dashboard = read("../src/pages/admin/Analytics.tsx");
const newsletter = read("../../api-server/src/routes/newsletter.ts");
const html = read("../index.html");
const checks = [
  [
    "no identifiers before consent",
    client.includes("if (!analyticsConsent()) return null"),
  ],
  [
    "visitor UUID cookie",
    client.includes("crypto.randomUUID()") &&
      client.includes("aida_analytics_visitor"),
  ],
  ["thirty minute sessions", client.includes("30 * 60 * 1000")],
  [
    "withdrawal deletes identifiers",
    client.includes("Max-Age=0") && client.includes("removeItem(SESSION_KEY)"),
  ],
  [
    "consent choices",
    consent.includes("Accept analytics") &&
      consent.includes("Decline analytics") &&
      consent.includes("Manage analytics"),
  ],
  [
    "typed event allowlist",
    server.includes("const EVENTS = new Set") &&
      server.includes("painting_event_signup_success"),
  ],
  [
    "raw IP not stored",
    !server.includes("req.ip") && !server.includes("x-forwarded-for"),
  ],
  ["unknown geography fallback", server.includes('|| "Unknown"')],
  [
    "UTM attribution",
    client.includes('query.get("utm_source")') && server.includes("sourceName"),
  ],
  [
    "source normalisation",
    server.includes('return "instagram"') &&
      server.includes('return "tiktok"') &&
      server.includes('return "youtube"'),
  ],
  [
    "first touch preserved",
    server.includes("ON CONFLICT (anonymous_visitor_id) DO UPDATE") &&
      !server.includes("first_source=$2"),
  ],
  [
    "admin reporting protected",
    server.includes('router.get("/dashboard", requireAdmin') &&
      server.includes('router.get("/subscribers", requireAdmin'),
  ],
  [
    "subscriber conversion attribution",
    newsletter.includes("attributeSubscriber") &&
      server.includes("analytics_subscriber_attribution"),
  ],
  ["duplicate subscriber excluded", server.includes("if (!input.isNew")],
  [
    "dashboard and tracked links",
    dashboard.includes("Tracked visitors") &&
      dashboard.includes("Tracked Links") &&
      dashboard.includes("utm_campaign"),
  ],
  [
    "retention cleanup",
    server.includes('router.post("/cleanup", requireAdmin'),
  ],
  [
    "Smartlook EU tracker installed",
    html.includes("https://web-sdk.smartlook.com/recorder.js") &&
      html.includes('region: "eu"'),
  ],
];
for (const [name, pass] of checks)
  assert.ok(pass, `Analytics verification failed: ${name}`);
console.log(`Analytics verification passed (${checks.length} checks).`);
