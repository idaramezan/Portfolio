import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";
import { emailShell, escapeHtml, OWNER_EMAIL, sendEmail } from "../lib/email";

const router = Router();
const reviewAttempts = new Map<string, { count: number; reset: number }>();
const EVENT_STATUSES = new Set([
  "draft",
  "scheduled",
  "booking_open",
  "fully_booked",
  "booking_closed",
  "completed",
  "cancelled",
  "archived",
  "active",
  "paused",
  "expired",
]);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || req.header("x-admin-password") !== expected)
    return res.status(401).json({ error: "Admin authentication required" });
  return next();
}
const clean = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, max);
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const csrfFor = (token: string) =>
  createHmac(
    "sha256",
    process.env.REVIEW_TOKEN_SECRET ||
      process.env.ADMIN_PASSWORD ||
      "development-review-secret",
  )
    .update(`${token}:csrf`)
    .digest("hex");
const siteUrl = () =>
  (process.env.PUBLIC_SITE_URL || "https://www.aedaart.com").replace(/\/$/, "");

async function ensureSchema() {
  await pool.query(
    `ALTER TABLE event_banner_config DROP CONSTRAINT IF EXISTS event_banner_config_status_check`,
  );
  await pool.query(
    `ALTER TABLE event_banner_config ADD CONSTRAINT event_banner_config_status_check CHECK (status IN ('draft','scheduled','booking_open','fully_booked','booking_closed','active','paused','expired','completed','cancelled','archived'))`,
  );
  await pool.query(`ALTER TABLE event_banner_config
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS short_description_en TEXT,
    ADD COLUMN IF NOT EXISTS short_description_tr TEXT,
    ADD COLUMN IF NOT EXISTS full_description_en TEXT,
    ADD COLUMN IF NOT EXISTS full_description_tr TEXT,
    ADD COLUMN IF NOT EXISTS booking_open_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS booking_close_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
    ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'in_person',
    ADD COLUMN IF NOT EXISTS private_location TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Istanbul',
    ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Türkiye',
    ADD COLUMN IF NOT EXISTS recap_text_en TEXT,
    ADD COLUMN IF NOT EXISTS recap_text_tr TEXT,
    ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS public_archive BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_attendee_count BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS photo_consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS seo_title TEXT,
    ADD COLUMN IF NOT EXISTS seo_description TEXT`);
  await pool.query(
    `UPDATE event_banner_config SET slug=COALESCE(NULLIF(slug,''),id), short_description_en=COALESCE(short_description_en,description_en), short_description_tr=COALESCE(short_description_tr,description_tr), full_description_en=COALESCE(full_description_en,secondary_details_en,description_en), full_description_tr=COALESCE(full_description_tr,secondary_details_tr,description_tr), booking_close_at=COALESCE(booking_close_at,display_end_at,event_start_at) WHERE slug IS NULL OR short_description_en IS NULL`,
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS event_banner_slug_unique ON event_banner_config(slug)`,
  );
  await pool.query(`ALTER TABLE event_applications
    ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ`);
  await pool.query(
    `UPDATE event_applications SET registration_status=CASE WHEN status='accepted' OR status='attended' THEN 'approved' WHEN status IN ('pending','waitlisted','rejected','cancelled') THEN status ELSE 'pending' END, attendance_status=CASE WHEN status='attended' THEN 'attended' ELSE attendance_status END WHERE registration_status='pending' AND status<>'pending'`,
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS event_gallery_images (
    id UUID PRIMARY KEY, event_id TEXT NOT NULL REFERENCES event_banner_config(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, alt_text TEXT NOT NULL, caption TEXT, orientation TEXT NOT NULL DEFAULT 'landscape',
    display_order INTEGER NOT NULL DEFAULT 1, is_cover BOOLEAN NOT NULL DEFAULT FALSE, is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS event_review_invitations (
    id UUID PRIMARY KEY, event_id TEXT NOT NULL REFERENCES event_banner_config(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES event_applications(id) ON DELETE CASCADE, token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id,attendee_id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY, event_id TEXT NOT NULL REFERENCES event_banner_config(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES event_applications(id) ON DELETE CASCADE,
    invitation_id UUID UNIQUE NOT NULL REFERENCES event_review_invitations(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL,
    original_display_name TEXT NOT NULL, original_comment TEXT NOT NULL, public_display_consent BOOLEAN NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', moderation_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS homepage_event_feature (
    id TEXT PRIMARY KEY DEFAULT 'primary', enabled BOOLEAN NOT NULL DEFAULT FALSE,
    event_id TEXT REFERENCES event_banner_config(id) ON DELETE SET NULL,
    show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE, show_on_turkiye_shop BOOLEAN NOT NULL DEFAULT FALSE,
    title_override TEXT, desktop_object_position TEXT, mobile_object_position TEXT,
    hide_after_event BOOLEAN NOT NULL DEFAULT TRUE, show_remaining_places BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`INSERT INTO homepage_event_feature(id,enabled,event_id,show_on_homepage,show_on_turkiye_shop,desktop_object_position,hide_after_event,show_remaining_places)
    SELECT 'primary',enabled,id,show_on_homepage,show_on_turkiye_shop,image_object_position,TRUE,TRUE FROM event_banner_config
    WHERE id='istanbul-painting-day-2026-08-04' ON CONFLICT(id) DO NOTHING`);
  await pool.query(`UPDATE event_banner_config SET status='completed',completed_at=COALESCE(completed_at,event_end_at,event_start_at),slug=COALESCE(NULLIF(slug,''),'istanbul-summer-painting-day')
    WHERE (id='istanbul-painting-day-2026-08-04' OR internal_name ILIKE '%Istanbul%painting%day%') AND event_start_at<NOW() AND status IN ('active','scheduled','expired','paused','booking_closed','fully_booked')`);
}

async function reservedSeats(eventId: string) {
  const [applications, legacy] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int count FROM event_applications WHERE event_id=$1 AND (registration_status='approved' OR status IN ('accepted','attended'))`,
      [eventId],
    ),
    pool.query(
      `SELECT COALESCE(SUM(seat_count),0)::int count FROM newsletter_event_interests WHERE campaign_id=$1 AND reservation_status IN ('confirmed','attended')`,
      [eventId],
    ),
  ]);
  return (
    Number(applications.rows[0]?.count || 0) +
    Number(legacy.rows[0]?.count || 0)
  );
}
async function publicEvent(row: any, includePrivate = false) {
  const reserved = await reservedSeats(row.id);
  const remainingSeats = Math.max(0, Number(row.total_capacity) - reserved);
  const now = Date.now(),
    start = Date.parse(row.event_start_at),
    open = row.booking_open_at ? Date.parse(row.booking_open_at) : -Infinity,
    close = Date.parse(
      row.booking_close_at || row.display_end_at || row.event_start_at,
    );
  const status =
    remainingSeats <= 0 &&
    ["scheduled", "booking_open", "active"].includes(row.status)
      ? "fully_booked"
      : row.status === "scheduled" && now >= open && now < close && now < start
        ? "booking_open"
        : row.status;
  const bookable =
    Boolean(row.enabled) &&
    ["scheduled", "booking_open", "active"].includes(row.status) &&
    now >= open &&
    now < start &&
    now < close &&
    remainingSeats > 0;
  const bookingState = bookable
    ? "open"
    : remainingSeats <= 0
      ? "fully_booked"
      : now < open
        ? "not_open"
        : now >= close || now >= start
          ? "closed"
          : "unavailable";
  const gallery = (
    await pool.query(
      `SELECT id,image_url,alt_text,caption,orientation,display_order,is_cover${includePrivate ? ",is_private" : ""} FROM event_gallery_images WHERE event_id=$1 ${includePrivate ? "" : "AND is_private=FALSE"} ORDER BY display_order`,
      [row.id],
    )
  ).rows;
  const reviews = (
    await pool.query(
      `SELECT id,display_name,rating,comment,created_at FROM event_reviews WHERE event_id=$1 AND status='approved' AND public_display_consent=TRUE ORDER BY created_at DESC`,
      [row.id],
    )
  ).rows;
  return {
    ...row,
    private_location: includePrivate ? row.private_location : undefined,
    status,
    remainingSeats,
    reservedSeats: reserved,
    bookable,
    bookingState,
    gallery,
    reviews,
    ratingSummary: reviews.length
      ? {
          average:
            reviews.reduce((sum: any, r: any) => sum + Number(r.rating), 0) /
            reviews.length,
          count: reviews.length,
        }
      : null,
  };
}

router.get("/", async (_req, res) => {
  try {
    await ensureSchema();
    const rows = (
      await pool.query(
        `SELECT * FROM event_banner_config WHERE enabled=TRUE AND status IN ('scheduled','booking_open','active','fully_booked','booking_closed','completed') ORDER BY event_start_at ASC`,
      )
    ).rows;
    const events = await Promise.all(rows.map((row) => publicEvent(row)));
    return res.json({
      current: events.filter((event) => event.bookable),
      upcoming: events.filter(
        (event) =>
          !event.bookable &&
          ["scheduled", "fully_booked", "booking_closed"].includes(
            event.status,
          ) &&
          Date.parse(event.event_start_at) > Date.now(),
      ),
      finished: events
        .filter((event) => event.status === "completed" && event.public_archive)
        .sort(
          (a, b) => Date.parse(b.event_start_at) - Date.parse(a.event_start_at),
        ),
    });
  } catch (error) {
    return res.status(500).json({ error: "Events could not be loaded" });
  }
});

router.get("/feature", async (req, res) => {
  try {
    await ensureSchema();
    const feature = (
      await pool.query(
        "SELECT * FROM homepage_event_feature WHERE id='primary'",
      )
    ).rows[0];
    if (!feature?.enabled || !feature.event_id)
      return res
        .status(404)
        .json({ error: "Homepage event feature is disabled" });
    const placement = String(req.query.placement || "home");
    if (
      (placement === "home" && !feature.show_on_homepage) ||
      (placement === "turkiye-shop" && !feature.show_on_turkiye_shop) ||
      !["home", "turkiye-shop"].includes(placement)
    )
      return res.status(404).json({ error: "Event feature is not shown here" });
    const row = (
      await pool.query(
        "SELECT * FROM event_banner_config WHERE id=$1 AND enabled=TRUE",
        [feature.event_id],
      )
    ).rows[0];
    if (
      !row ||
      ["draft", "archived", "cancelled"].includes(row.status) ||
      (feature.hide_after_event && Date.parse(row.event_start_at) < Date.now())
    )
      return res.status(404).json({ error: "Featured event is unavailable" });
    return res.json({
      config: {
        ...row,
        banner_short_title_en: feature.title_override,
        banner_short_title_tr: feature.title_override,
        image_object_position:
          feature.desktop_object_position || row.image_object_position,
        mobile_object_position: feature.mobile_object_position,
        show_remaining_places: feature.show_remaining_places,
      },
      remainingSeats: await reservedSeats(row.id).then((n) =>
        Math.max(0, Number(row.total_capacity) - n),
      ),
      campaignId: row.id,
    });
  } catch {
    return res.status(500).json({ error: "Event feature could not be loaded" });
  }
});

router.get("/review/:token", async (req, res) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  try {
    await ensureSchema();
    const hash = tokenHash(req.params.token);
    const row = (
      await pool.query(
        `SELECT i.*,a.full_name,a.customer_language,a.registration_status,a.attendance_status,e.slug,e.title_en,e.title_tr FROM event_review_invitations i JOIN event_applications a ON a.id=i.attendee_id JOIN event_banner_config e ON e.id=i.event_id WHERE i.token_hash=$1`,
        [hash],
      )
    ).rows[0];
    if (
      !row ||
      row.revoked_at ||
      row.used_at ||
      Date.parse(row.expires_at) <= Date.now() ||
      row.registration_status !== "approved" ||
      row.attendance_status !== "attended"
    )
      return res
        .status(410)
        .json({ error: "This private review link is no longer active." });
    return res.json({
      eventSlug: row.slug,
      eventTitle: row.customer_language === "tr" ? row.title_tr : row.title_en,
      displayName: row.full_name,
      locale: row.customer_language,
      expiresAt: row.expires_at,
      csrfToken: csrfFor(req.params.token),
    });
  } catch {
    return res
      .status(410)
      .json({ error: "This private review link is no longer active." });
  }
});

router.post("/review/:token", async (req, res) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const key = `${req.ip}:${tokenHash(req.params.token)}`,
    now = Date.now(),
    attempt = reviewAttempts.get(key);
  if (attempt && attempt.reset > now && attempt.count >= 8)
    return res.status(429).json({ error: "Please wait before trying again." });
  reviewAttempts.set(
    key,
    !attempt || attempt.reset <= now
      ? { count: 1, reset: now + 15 * 60_000 }
      : { ...attempt, count: attempt.count + 1 },
  );
  const client = await pool.connect();
  try {
    await ensureSchema();
    if (req.body?.csrfToken !== csrfFor(req.params.token))
      return res.status(403).json({ error: "Review session is invalid." });
    const name = clean(req.body?.displayName, 60),
      comment = clean(req.body?.comment, 1000),
      rating = Number(req.body?.rating);
    if (
      name.length < 2 ||
      comment.length < 10 ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      !req.body?.consent ||
      /<[^>]*>|https?:\/\//i.test(comment)
    )
      return res.status(400).json({
        error:
          "Complete the review with a name, rating, comment and public-display consent.",
      });
    await client.query("BEGIN");
    const invitation = (
      await client.query(
        `SELECT i.*,a.email,a.full_name,a.customer_language,a.registration_status,a.attendance_status,e.title_en,e.title_tr FROM event_review_invitations i JOIN event_applications a ON a.id=i.attendee_id JOIN event_banner_config e ON e.id=i.event_id WHERE i.token_hash=$1 FOR UPDATE`,
        [tokenHash(req.params.token)],
      )
    ).rows[0];
    if (
      !invitation ||
      invitation.used_at ||
      invitation.revoked_at ||
      Date.parse(invitation.expires_at) <= Date.now() ||
      invitation.registration_status !== "approved" ||
      invitation.attendance_status !== "attended"
    ) {
      await client.query("ROLLBACK");
      return res
        .status(410)
        .json({ error: "This private review link is no longer active." });
    }
    await client.query(
      `INSERT INTO event_reviews(id,event_id,attendee_id,invitation_id,display_name,rating,comment,original_display_name,original_comment,public_display_consent,status) VALUES($1,$2,$3,$4,$5,$6,$7,$5,$7,TRUE,'pending')`,
      [
        randomUUID(),
        invitation.event_id,
        invitation.attendee_id,
        invitation.id,
        name,
        rating,
        comment,
      ],
    );
    await client.query(
      "UPDATE event_review_invitations SET used_at=NOW() WHERE id=$1",
      [invitation.id],
    );
    await client.query("COMMIT");
    const title =
      invitation.customer_language === "tr"
        ? invitation.title_tr
        : invitation.title_en;
    void sendEmail({
      to: invitation.email,
      subject:
        invitation.customer_language === "tr"
          ? "Yorumun için teşekkürler"
          : `Thank you for reviewing ${title}`,
      html: emailShell(
        `<h1>${invitation.customer_language === "tr" ? "Bu anını paylaştığın için teşekkürler." : "Thank you for sharing this memory."}</h1><p>${invitation.customer_language === "tr" ? "Notun Aida’ya gönderildi ve incelendikten sonra etkinlik sayfasında görünecek." : "Your note has been sent to Aida and will appear on the event page after it is reviewed."}</p>`,
      ),
    }).catch(() => {});
    void sendEmail({
      to: process.env.EVENT_NOTIFICATION_EMAIL || OWNER_EMAIL,
      subject: `New event review — ${title}`,
      html: emailShell(
        `<h1>New pending event review</h1><p>Rating: ${rating}/5</p><p>Open Event Reviews in admin to moderate it.</p>`,
      ),
    }).catch(() => {});
    return res.status(201).json({ ok: true });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return res.status(400).json({ error: "Review could not be submitted." });
  } finally {
    client.release();
  }
});

router.use("/admin", requireAdmin);
router.get("/admin/feature/settings", async (_req, res) => {
  await ensureSchema();
  const feature = (
    await pool.query("SELECT * FROM homepage_event_feature WHERE id='primary'")
  ).rows[0];
  const rows = (
    await pool.query(
      "SELECT * FROM event_banner_config ORDER BY event_start_at DESC",
    )
  ).rows;
  return res.json({
    feature,
    events: await Promise.all(rows.map((row) => publicEvent(row, true))),
  });
});
router.put("/admin/feature/settings", async (req, res) => {
  await ensureSchema();
  const b = req.body || {};
  let selectedEvent: any = null;
  if (b.eventId) {
    selectedEvent = (
      await pool.query("SELECT * FROM event_banner_config WHERE id=$1", [
        b.eventId,
      ])
    ).rows[0];
    if (!selectedEvent)
      return res.status(400).json({ error: "Select a valid event" });
  }
  if (b.enabled && selectedEvent) {
    if (["archived", "cancelled"].includes(selectedEvent.status))
      return res.status(409).json({
        error:
          "Archived or cancelled events cannot be featured. Restore the event first.",
      });
    if (
      b.hideAfterEvent !== false &&
      Date.parse(selectedEvent.event_start_at) <= Date.now()
    )
      return res.status(409).json({
        error:
          "This event has already started. Turn off ‘Hide automatically after event date’ to feature its archive.",
      });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (b.enabled && selectedEvent)
      await client.query(
        `UPDATE event_banner_config SET enabled=TRUE,status=CASE WHEN status='draft' THEN 'scheduled' ELSE status END,show_on_homepage=$2,show_on_turkiye_shop=$3,updated_at=NOW() WHERE id=$1`,
        [
          selectedEvent.id,
          Boolean(b.showOnHomepage),
          Boolean(b.showOnTurkiyeShop),
        ],
      );
    const row = (
      await client.query(
        `INSERT INTO homepage_event_feature(id,enabled,event_id,show_on_homepage,show_on_turkiye_shop,title_override,desktop_object_position,mobile_object_position,hide_after_event,show_remaining_places,updated_at) VALUES('primary',$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT(id) DO UPDATE SET enabled=$1,event_id=$2,show_on_homepage=$3,show_on_turkiye_shop=$4,title_override=$5,desktop_object_position=$6,mobile_object_position=$7,hide_after_event=$8,show_remaining_places=$9,updated_at=NOW() RETURNING *`,
        [
          Boolean(b.enabled),
          b.eventId || null,
          Boolean(b.showOnHomepage),
          Boolean(b.showOnTurkiyeShop),
          clean(b.titleOverride, 200) || null,
          clean(b.desktopObjectPosition, 80) || null,
          clean(b.mobileObjectPosition, 80) || null,
          b.hideAfterEvent !== false,
          b.showRemainingPlaces !== false,
        ],
      )
    ).rows[0];
    await client.query("COMMIT");
    return res.json({
      feature: row,
      eventPublished:
        Boolean(b.enabled && selectedEvent) &&
        (!selectedEvent.enabled || selectedEvent.status === "draft"),
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
});
router.get("/admin", async (_req, res) => {
  await ensureSchema();
  const rows = (
    await pool.query(
      "SELECT * FROM event_banner_config ORDER BY event_start_at DESC",
    )
  ).rows;
  return res.json({
    events: await Promise.all(rows.map((row) => publicEvent(row, true))),
  });
});
router.post("/admin", async (req, res) => {
  await ensureSchema();
  const b = req.body || {},
    id = randomUUID(),
    slug = clean(b.slug || b.titleEn, 120)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  if (!slug || !clean(b.titleEn, 300) || !b.eventStartAt)
    return res
      .status(400)
      .json({ error: "Slug, English title and event start are required." });
  const row = (
    await pool.query(
      `INSERT INTO event_banner_config(id,slug,enabled,status,internal_name,event_start_at,event_end_at,total_capacity,participation_price_try,audience,image_alt_text,image_object_position,location_text_en,location_text_tr,eyebrow_en,eyebrow_tr,title_en,title_tr,description_en,description_tr,short_description_en,short_description_tr,timezone,city,country,booking_open_at,booking_close_at,show_on_homepage,show_on_turkiye_shop,show_on_international_shop) VALUES($1,$2,FALSE,'draft',$3,$4,$5,$6,$7,$8,'Event photograph','center',$9,$10,'EVENT','ETKİNLİK',$11,$12,$13,$14,$13,$14,$15,$16,$17,$18,$19,FALSE,FALSE,FALSE) RETURNING *`,
      [
        id,
        slug,
        clean(b.internalName || b.titleEn, 120),
        b.eventStartAt,
        b.eventEndAt || null,
        Number(b.totalCapacity) || 10,
        Number(b.participationPriceTry) || 0,
        b.audience || "everyone",
        clean(b.locationTextEn || "Istanbul", 300),
        clean(b.locationTextTr || "İstanbul", 300),
        clean(b.titleEn, 300),
        clean(b.titleTr || b.titleEn, 300),
        clean(b.descriptionEn || b.shortDescriptionEn, 2000),
        clean(b.descriptionTr || b.shortDescriptionTr || b.descriptionEn, 2000),
        b.timezone || "Europe/Istanbul",
        clean(b.city || "Istanbul", 100),
        clean(b.country || "Türkiye", 100),
        b.bookingOpenAt || null,
        b.bookingCloseAt || b.eventStartAt,
      ],
    )
  ).rows[0];
  return res.status(201).json({ event: row });
});
router.put("/admin/:id", async (req, res) => {
  await ensureSchema();
  const b = req.body || {};
  if (!EVENT_STATUSES.has(b.status))
    return res.status(400).json({ error: "Invalid event status" });
  if (
    (b.status === "completed" || b.publicArchive) &&
    Array.isArray(b.galleryImages) &&
    b.galleryImages.length &&
    !b.photoConsentConfirmed
  )
    return res
      .status(400)
      .json({ error: "Confirm permission to publish event photographs." });
  const row = (
    await pool.query(
      `UPDATE event_banner_config SET slug=$2,enabled=$3,status=$4,internal_name=$5,event_start_at=$6,event_end_at=$7,booking_open_at=$8,booking_close_at=$9,total_capacity=$10,participation_price_try=$11,currency=$12,audience=$13,image_url=$14,image_alt_text=$15,image_object_position=$16,location_text_en=$17,location_text_tr=$18,private_location=$19,city=$20,country=$21,title_en=$22,title_tr=$23,short_description_en=$24,short_description_tr=$25,full_description_en=$26,full_description_tr=$27,recap_text_en=$28,recap_text_tr=$29,featured=$30,public_archive=$31,show_attendee_count=$32,photo_consent_confirmed=$33,seo_title=$34,seo_description=$35,completed_at=CASE WHEN $4='completed' THEN COALESCE(completed_at,NOW()) ELSE completed_at END,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [
        req.params.id,
        clean(b.slug, 120),
        Boolean(b.enabled),
        b.status,
        clean(b.internalName, 120),
        b.eventStartAt,
        b.eventEndAt || null,
        b.bookingOpenAt || null,
        b.bookingCloseAt || null,
        Number(b.totalCapacity),
        Number(b.participationPriceTry),
        b.currency || "TRY",
        b.audience || "everyone",
        b.imageUrl || null,
        clean(b.imageAltText, 300),
        clean(b.imageObjectPosition || "center", 80),
        clean(b.locationTextEn, 300),
        clean(b.locationTextTr, 300),
        clean(b.privateLocation, 500) || null,
        clean(b.city, 100),
        clean(b.country, 100),
        clean(b.titleEn, 300),
        clean(b.titleTr, 300),
        clean(b.shortDescriptionEn, 1000),
        clean(b.shortDescriptionTr, 1000),
        clean(b.fullDescriptionEn, 5000),
        clean(b.fullDescriptionTr, 5000),
        clean(b.recapTextEn, 5000) || null,
        clean(b.recapTextTr, 5000) || null,
        Boolean(b.featured),
        Boolean(b.publicArchive),
        Boolean(b.showAttendeeCount),
        Boolean(b.photoConsentConfirmed),
        clean(b.seoTitle, 200) || null,
        clean(b.seoDescription, 300) || null,
      ],
    )
  ).rows[0];
  if (!row) return res.status(404).json({ error: "Event not found" });
  return res.json({ event: row });
});
router.put("/admin/:id/gallery", async (req, res) => {
  await ensureSchema();
  const images = Array.isArray(req.body?.images) ? req.body.images : [];
  if (
    images.some((x: any) => !clean(x.imageUrl, 1000) || !clean(x.altText, 300))
  )
    return res.status(400).json({
      error: "Every gallery image needs a permanent URL and alt text.",
    });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM event_gallery_images WHERE event_id=$1", [
      req.params.id,
    ]);
    for (let i = 0; i < images.length; i++) {
      const x = images[i];
      await client.query(
        `INSERT INTO event_gallery_images(id,event_id,image_url,alt_text,caption,orientation,display_order,is_cover,is_private) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          x.id || randomUUID(),
          req.params.id,
          clean(x.imageUrl, 1000),
          clean(x.altText, 300),
          clean(x.caption, 500) || null,
          x.orientation === "portrait" ? "portrait" : "landscape",
          i + 1,
          Boolean(x.isCover),
          Boolean(x.isPrivate),
        ],
      );
    }
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch {
    await client.query("ROLLBACK");
    return res.status(400).json({ error: "Gallery could not be saved" });
  } finally {
    client.release();
  }
});
router.get("/admin/:id/attendees", async (req, res) => {
  await ensureSchema();
  const attendees = (
    await pool.query(
      "SELECT * FROM event_applications WHERE event_id=$1 ORDER BY created_at DESC",
      [req.params.id],
    )
  ).rows;
  const invitations = (
    await pool.query(
      "SELECT id,attendee_id,expires_at,used_at,revoked_at,created_at FROM event_review_invitations WHERE event_id=$1",
      [req.params.id],
    )
  ).rows;
  return res.json({ attendees, invitations });
});
router.post("/admin/:id/attendees", async (req, res) => {
  await ensureSchema();
  const b = req.body || {},
    email = clean(b.email, 254).toLowerCase(),
    name = clean(b.fullName, 120);
  if (!name || !email.includes("@"))
    return res.status(400).json({ error: "Name and email are required" });
  const row = (
    await pool.query(
      `INSERT INTO event_applications(id,application_number,event_id,full_name,age,eligibility_response,email,phone,status,registration_status,attendance_status,customer_language,consent_version,consent_at) VALUES($1,$2,$3,$4,$5,'manual',$6,$7,'attended','approved','attended',$8,'admin-manual',NOW()) RETURNING *`,
      [
        randomUUID(),
        `MANUAL-${Date.now()}`,
        req.params.id,
        name,
        Number(b.age) || 18,
        email,
        clean(b.phone, 20) || "not-provided",
        b.language === "tr" ? "tr" : "en",
      ],
    )
  ).rows[0];
  return res.status(201).json({ attendee: row });
});
router.patch("/admin/attendees/:id", async (req, res) => {
  await ensureSchema();
  const registration = req.body?.registrationStatus,
    attendance = req.body?.attendanceStatus;
  if (
    !["pending", "approved", "waitlisted", "rejected", "cancelled"].includes(
      registration,
    ) ||
    !["unknown", "attended", "no_show"].includes(attendance)
  )
    return res.status(400).json({ error: "Invalid attendee status" });
  const row = (
    await pool.query(
      "UPDATE event_applications SET registration_status=$1,attendance_status=$2,status=CASE WHEN $2='attended' THEN 'attended' WHEN $1='approved' THEN 'accepted' ELSE $1 END,attended_at=CASE WHEN $2='attended' THEN NOW() ELSE attended_at END,updated_at=NOW() WHERE id=$3 RETURNING *",
      [registration, attendance, req.params.id],
    )
  ).rows[0];
  return res.json({ attendee: row });
});

async function createInvitation(
  attendeeId: string,
  eventId: string,
  resend: boolean,
) {
  const attendee = (
    await pool.query(
      `SELECT a.*,e.slug,e.title_en,e.title_tr FROM event_applications a JOIN event_banner_config e ON e.id=a.event_id WHERE a.id=$1 AND a.event_id=$2`,
      [attendeeId, eventId],
    )
  ).rows[0];
  if (
    !attendee ||
    attendee.registration_status !== "approved" ||
    attendee.attendance_status !== "attended"
  )
    throw new Error(
      "Only approved attendees marked attended can receive review invitations.",
    );
  const raw = randomBytes(32).toString("base64url"),
    hash = tokenHash(raw),
    expires = new Date(Date.now() + 60 * 86400000);
  const invitation = (
    await pool.query(
      `INSERT INTO event_review_invitations(id,event_id,attendee_id,token_hash,expires_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,attendee_id) DO UPDATE SET token_hash=$4,expires_at=$5,used_at=NULL,revoked_at=NULL,created_at=NOW() RETURNING *`,
      [randomUUID(), eventId, attendeeId, hash, expires],
    )
  ).rows[0];
  const url = `${siteUrl()}/events/${encodeURIComponent(attendee.slug)}/review/${raw}`;
  if (resend) {
    const tr = attendee.customer_language === "tr",
      title = tr ? attendee.title_tr : attendee.title_en,
      first = clean(attendee.full_name, 120).split(/\s+/)[0];
    await sendEmail({
      to: attendee.email,
      subject: tr
        ? `${title} etkinliği senin için nasıldı?`
        : `How was your time at ${title}?`,
      html: emailShell(
        `<p>${tr ? "Merhaba" : "Hi"} ${escapeHtml(first)},</p><p>${tr ? `${escapeHtml(title)} etkinliğine katıldığın için teşekkür ederiz. Aida, günün senin için nasıl geçtiğini duymayı çok ister.` : `Thank you for joining ${escapeHtml(title)}. Aida would love to hear how the day felt for you.`}</p><p style="text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;background:#c15a83;color:white;text-decoration:none">${tr ? "Deneyimini paylaş" : "Share your experience"}</a></p><p>${tr ? "Yorumun onaylandıktan sonra etkinlik sayfasında gösterilebilir." : "Your review may be shown on the event page after approval."}</p>`,
      ),
    });
  }
  return { invitation, url };
}
router.post("/admin/:id/invitations/bulk", async (req, res) => {
  await ensureSchema();
  const rows = (
    await pool.query(
      "SELECT id FROM event_applications WHERE event_id=$1 AND registration_status='approved' AND attendance_status='attended'",
      [req.params.id],
    )
  ).rows;
  let sent = 0;
  for (const row of rows) {
    try {
      await createInvitation(row.id, req.params.id, true);
      sent++;
    } catch {}
  }
  return res.json({ sent });
});
router.post("/admin/:id/invitations/:attendeeId", async (req, res) => {
  try {
    await ensureSchema();
    return res
      .status(201)
      .json(
        await createInvitation(
          req.params.attendeeId,
          req.params.id,
          Boolean(req.body?.sendEmail),
        ),
      );
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invitation failed",
    });
  }
});
router.patch("/admin/invitations/:id", async (req, res) => {
  await ensureSchema();
  const action = req.body?.action;
  if (action === "revoke")
    await pool.query(
      "UPDATE event_review_invitations SET revoked_at=NOW() WHERE id=$1",
      [req.params.id],
    );
  else if (action === "extend")
    await pool.query(
      "UPDATE event_review_invitations SET expires_at=NOW()+INTERVAL '60 days',revoked_at=NULL WHERE id=$1",
      [req.params.id],
    );
  else return res.status(400).json({ error: "Invalid action" });
  return res.json({ ok: true });
});
router.get("/admin/reviews/all", async (req, res) => {
  await ensureSchema();
  const values: any[] = [];
  let where = "WHERE 1=1";
  if (req.query.eventId) {
    values.push(req.query.eventId);
    where += ` AND r.event_id=$${values.length}`;
  }
  if (req.query.status) {
    values.push(req.query.status);
    where += ` AND r.status=$${values.length}`;
  }
  if (req.query.search) {
    values.push(`%${clean(req.query.search, 100)}%`);
    where += ` AND (r.display_name ILIKE $${values.length} OR a.full_name ILIKE $${values.length})`;
  }
  const reviews = (
    await pool.query(
      `SELECT r.*,a.full_name attendee_name,a.email attendee_email,e.title_en event_title FROM event_reviews r JOIN event_applications a ON a.id=r.attendee_id JOIN event_banner_config e ON e.id=r.event_id ${where} ORDER BY r.created_at DESC`,
      values,
    )
  ).rows;
  return res.json({ reviews });
});
router.patch("/admin/reviews/:id", async (req, res) => {
  await ensureSchema();
  const status = req.body?.status;
  if (!["pending", "approved", "rejected", "hidden"].includes(status))
    return res.status(400).json({ error: "Invalid review status" });
  const current = (
    await pool.query(
      "SELECT public_display_consent FROM event_reviews WHERE id=$1",
      [req.params.id],
    )
  ).rows[0];
  if (status === "approved" && !current?.public_display_consent)
    return res.status(409).json({
      error: "A review without public-display consent cannot be approved.",
    });
  const row = (
    await pool.query(
      "UPDATE event_reviews SET status=$1,display_name=COALESCE($2,display_name),comment=COALESCE($3,comment),moderation_note=$4,updated_at=NOW() WHERE id=$5 RETURNING *",
      [
        status,
        clean(req.body?.displayName, 60) || null,
        clean(req.body?.comment, 1000) || null,
        clean(req.body?.moderationNote, 1000) || null,
        req.params.id,
      ],
    )
  ).rows[0];
  return res.json({ review: row });
});
router.delete("/admin/reviews/:id", async (req, res) => {
  await ensureSchema();
  await pool.query("DELETE FROM event_reviews WHERE id=$1", [req.params.id]);
  return res.status(204).end();
});

router.get("/:slug", async (req, res) => {
  try {
    await ensureSchema();
    const row = (
      await pool.query(
        "SELECT * FROM event_banner_config WHERE slug=$1 AND enabled=TRUE",
        [req.params.slug],
      )
    ).rows[0];
    if (!row || ["draft", "archived"].includes(row.status))
      return res.status(404).json({ error: "Event not found" });
    return res.json({ event: await publicEvent(row) });
  } catch {
    return res.status(500).json({ error: "Event could not be loaded" });
  }
});

export default router;
