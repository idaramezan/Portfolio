import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const eventsRoute = read("../artifacts/api-server/src/routes/events.ts");
const newsletterRoute = read(
  "../artifacts/api-server/src/routes/newsletter.ts",
);
const banner = read(
  "../artifacts/aida-portfolio/src/components/IstanbulPaintingEventBanner.tsx",
);
const featureAdmin = read(
  "../artifacts/aida-portfolio/src/pages/admin/EventBanner.tsx",
);
const eventsAdmin = read(
  "../artifacts/aida-portfolio/src/pages/admin/Events.tsx",
);
const eventDetail = read(
  "../artifacts/aida-portfolio/src/pages/EventDetail.tsx",
);
const migration = read(
  "../lib/db/migrations/0010_consolidate_event_feature.sql",
);
if (
  !newsletterRoute.includes(
    "reservation_status IN ('confirmed', 'attended')",
  ) ||
  !eventsRoute.includes("reservedSeats")
)
  throw new Error("Existing registration capacity source was not preserved");
if (
  !migration.includes("homepage_event_feature") ||
  !migration.includes("istanbul-painting-day-2026-08-04") ||
  !migration.includes("status='completed'")
)
  throw new Error(
    "Legacy Istanbul event migration is missing or not idempotent",
  );
if (
  featureAdmin.includes("totalCapacity") ||
  featureAdmin.includes("descriptionEn") ||
  featureAdmin.includes("participationPriceTry")
)
  throw new Error("Homepage Event Feature duplicates canonical event content");
if (
  !featureAdmin.includes("Select event") ||
  !featureAdmin.includes("Edit selected event") ||
  !eventsRoute.includes("/admin/feature/settings")
)
  throw new Error("Event Feature selector is not wired end-to-end");
if (!banner.includes("/api/events/feature?placement="))
  throw new Error("Public banner does not read selected canonical event");
if (
  !eventsAdmin.includes("Upload cover image") ||
  !eventsAdmin.includes("Add event photos") ||
  !eventsAdmin.includes("Private review link copied")
)
  throw new Error("Event media or attendee review workflow is incomplete");
if (featureAdmin.includes('set("remainingSeats"'))
  throw new Error("Remaining places must not be editable");
if (
  !eventsRoute.includes("status=CASE WHEN status='draft' THEN 'scheduled'") ||
  !eventsRoute.includes("enabled=TRUE") ||
  !eventsRoute.includes('client.query("BEGIN")')
)
  throw new Error(
    "Enabling a selected draft feature must publish it atomically",
  );
if (
  !featureAdmin.includes("disabled draft") ||
  !featureAdmin.includes("eventPublished")
)
  throw new Error("Admin must explain when featuring publishes a draft event");
if (
  !eventsRoute.includes(
    '["scheduled", "booking_open", "active"].includes(row.status)',
  ) ||
  !eventsRoute.includes("now >= open")
)
  throw new Error(
    "Scheduled events must open automatically at their booking time",
  );
if (
  !eventsAdmin.includes("zonedInputToIso") ||
  !eventsAdmin.includes("zonedDateTimeInput")
)
  throw new Error(
    "Event admin must preserve the configured timezone for datetime-local values",
  );
if (
  eventDetail.includes("Fully booked or booking closed") ||
  !eventDetail.includes("Apply to join") ||
  !eventDetail.includes("event.bookingState")
)
  throw new Error(
    "Event details must expose registration and distinct booking states",
  );
console.log("Consolidated Events administration verification passed.");
