import { readFileSync } from "node:fs";

const route = readFileSync(
  new URL("../artifacts/api-server/src/routes/newsletter.ts", import.meta.url),
  "utf8",
);
const banner = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/components/IstanbulPaintingEventBanner.tsx",
    import.meta.url,
  ),
  "utf8",
);
const admin = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/pages/admin/EventBanner.tsx",
    import.meta.url,
  ),
  "utf8",
);
const migration = readFileSync(
  new URL("../lib/db/migrations/0007_event_banner_short_title.sql", import.meta.url),
  "utf8",
);

const attendanceSource = "reservation_status IN ('confirmed', 'attended')";
if (
  !route.includes(attendanceSource) ||
  !route.includes("COALESCE(SUM(seat_count), 0)")
)
  throw new Error(
    "Existing confirmed/attended remaining-seat calculation was not preserved",
  );
if (
  !migration.includes("banner_short_title_en") ||
  !route.includes("banner_short_title_en=$30") ||
  !admin.includes("bannerShortTitleEn") ||
  !banner.includes("config.banner_short_title_en || config.title_en")
)
  throw new Error("Optional event banner short titles are not wired end-to-end");
if (!route.includes("pg_advisory_xact_lock(hashtext($1))"))
  throw new Error("Existing event reservation capacity lock was not preserved");
if (
  !banner.includes("/api/newsletter/event-banner?placement=") ||
  !admin.includes("/api/newsletter/event-banner/admin")
)
  throw new Error("Event Banner public/admin configuration is not connected");
if (admin.includes('set("remainingSeats"'))
  throw new Error("Admin must not manually override remaining places");
if (
  !admin.includes('body.append("image", file)') ||
  !admin.includes('fetch("/api/admin/product-media"')
)
  throw new Error(
    "Event Banner must upload images through the existing media library",
  );

console.log("Event Banner admin verification passed.");
