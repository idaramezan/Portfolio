import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";

const router = Router();
const VISITOR_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_PATH = /^\/(?!admin(?:\/|$)|api(?:\/|$))[^?#]{0,500}$/;
const EVENTS = new Set([
  "session_start",
  "page_view",
  "outbound_link_click",
  "product_view",
  "product_options_opened",
  "add_to_basket",
  "remove_from_basket",
  "basket_opened",
  "whatsapp_checkout_started",
  "checkout_started",
  "bank_instructions_viewed",
  "receipt_upload_started",
  "receipt_upload_completed",
  "order_submitted",
  "event_application_started",
  "event_application_submitted",
  "fourthwall_product_clicked",
  "newsletter_section_viewed",
  "newsletter_form_started",
  "newsletter_signup_success",
  "newsletter_signup_failed",
  "mystery_mail_viewed",
  "mystery_mail_cta_clicked",
  "mystery_mail_added_to_basket",
  "mystery_mail_unavailable_signup_clicked",
  "painting_event_banner_viewed",
  "painting_event_form_started",
  "painting_event_signup_success",
  "painting_event_whatsapp_clicked",
  "turkiye_shop_opened",
  "international_shop_opened",
  "sticker_drop_animation_started",
  "sticker_drop_animation_completed",
  "sticker_drop_modal_opened",
  "sticker_drop_market_selected",
  "sticker_drop_dismissed",
  "sticker_drop_add_to_basket",
  "sticker_drop_external_product_clicked",
  "sticker_drop_sold_out_viewed",
  "homepage_market_selected",
  "homepage_category_clicked",
  "homepage_product_clicked",
  "homepage_event_clicked",
  "homepage_about_clicked",
  "homepage_tiktok_clicked",
]);
const META_KEYS = new Set([
  "productType",
  "category",
  "size",
  "finish",
  "colour",
  "quantity",
  "currency",
  "total",
  "form",
  "newSubscriber",
  "hrefDomain",
  "market",
  "placement",
  "destinationType",
]);
const recent = new Map<string, number>();
let lastMaintenanceAt = 0;

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || req.header("x-admin-password") !== expected)
    return res.status(401).json({ error: "Admin authentication required" });
  return next();
}

export async function ensureAnalyticsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_visitors (
      id BIGSERIAL PRIMARY KEY, anonymous_visitor_id UUID UNIQUE NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      first_source TEXT NOT NULL DEFAULT 'direct', first_medium TEXT, first_campaign TEXT, first_content TEXT,
      first_referrer_domain TEXT, first_landing_path TEXT NOT NULL, first_country_code TEXT,
      first_country_name TEXT, first_region TEXT, first_city TEXT,
      last_source TEXT NOT NULL DEFAULT 'direct', last_medium TEXT, last_campaign TEXT, last_referrer_domain TEXT,
      total_sessions INTEGER NOT NULL DEFAULT 0, total_page_views INTEGER NOT NULL DEFAULT 0,
      has_subscribed BOOLEAN NOT NULL DEFAULT FALSE, subscriber_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS analytics_sessions (
      id BIGSERIAL PRIMARY KEY, visitor_id BIGINT NOT NULL REFERENCES analytics_visitors(id) ON DELETE CASCADE,
      session_uuid UUID UNIQUE NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ, landing_path TEXT NOT NULL, exit_path TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'direct', medium TEXT, campaign TEXT, content TEXT, term TEXT, referrer_domain TEXT,
      country_code TEXT, country_name TEXT, region TEXT, city TEXT, device_category TEXT, browser_family TEXT,
      operating_system_family TEXT, preferred_language TEXT, page_view_count INTEGER NOT NULL DEFAULT 0,
      converted_to_subscriber BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY, visitor_id BIGINT REFERENCES analytics_visitors(id) ON DELETE SET NULL,
      session_id BIGINT REFERENCES analytics_sessions(id) ON DELETE SET NULL, event_name TEXT NOT NULL,
      page_path TEXT NOT NULL, page_title TEXT, entity_type TEXT, entity_id TEXT, entity_name TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS analytics_subscriber_attribution (
      subscriber_id BIGINT PRIMARY KEY, analytics_visitor_id BIGINT REFERENCES analytics_visitors(id) ON DELETE SET NULL,
      signup_path TEXT, signup_form TEXT, signup_source TEXT, signup_medium TEXT, signup_campaign TEXT,
      signup_content TEXT, signup_referrer_domain TEXT, signup_landing_path TEXT, country_code TEXT,
      country_name TEXT, region TEXT, city TEXT, first_seen_at TIMESTAMPTZ, subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sessions_before_subscription INTEGER NOT NULL DEFAULT 0, page_views_before_subscription INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS analytics_daily (
      date DATE PRIMARY KEY, unique_visitors INTEGER NOT NULL DEFAULT 0, new_visitors INTEGER NOT NULL DEFAULT 0,
      returning_visitors INTEGER NOT NULL DEFAULT 0, sessions INTEGER NOT NULL DEFAULT 0, page_views INTEGER NOT NULL DEFAULT 0,
      subscriber_conversions INTEGER NOT NULL DEFAULT 0, whatsapp_continuations INTEGER NOT NULL DEFAULT 0,
      add_to_basket_events INTEGER NOT NULL DEFAULT 0, fourthwall_outbound_clicks INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx ON analytics_events(occurred_at);
    CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON analytics_events(visitor_id);
    CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_id);
    CREATE INDEX IF NOT EXISTS analytics_events_path_idx ON analytics_events(page_path);
    CREATE INDEX IF NOT EXISTS analytics_sessions_source_idx ON analytics_sessions(source);
    CREATE INDEX IF NOT EXISTS analytics_sessions_country_idx ON analytics_sessions(country_code);
    CREATE INDEX IF NOT EXISTS analytics_events_entity_idx ON analytics_events(entity_type, entity_id);
  `);
}

async function runAnalyticsMaintenance() {
  if (Date.now() - lastMaintenanceAt < 24 * 60 * 60 * 1000) return;
  lastMaintenanceAt = Date.now();
  await pool.query(`
    INSERT INTO analytics_daily
      (date, unique_visitors, new_visitors, returning_visitors, sessions, page_views,
       subscriber_conversions, whatsapp_continuations, add_to_basket_events, fourthwall_outbound_clicks)
    SELECT CURRENT_DATE - 1,
      COUNT(DISTINCT visitor_id),
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IN (SELECT id FROM analytics_visitors WHERE first_seen_at::date = CURRENT_DATE - 1)),
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IN (SELECT id FROM analytics_visitors WHERE first_seen_at::date < CURRENT_DATE - 1)),
      COUNT(DISTINCT session_id), COUNT(*) FILTER (WHERE event_name='page_view'),
      COUNT(*) FILTER (WHERE event_name='newsletter_signup_success' AND metadata->>'newSubscriber'='true'),
      COUNT(*) FILTER (WHERE event_name='whatsapp_checkout_started'),
      COUNT(*) FILTER (WHERE event_name IN ('add_to_basket','mystery_mail_added_to_basket')),
      COUNT(*) FILTER (WHERE event_name='fourthwall_product_clicked')
    FROM analytics_events
    WHERE occurred_at >= CURRENT_DATE - 1 AND occurred_at < CURRENT_DATE
    ON CONFLICT (date) DO UPDATE SET
      unique_visitors=EXCLUDED.unique_visitors, new_visitors=EXCLUDED.new_visitors,
      returning_visitors=EXCLUDED.returning_visitors, sessions=EXCLUDED.sessions,
      page_views=EXCLUDED.page_views, subscriber_conversions=EXCLUDED.subscriber_conversions,
      whatsapp_continuations=EXCLUDED.whatsapp_continuations,
      add_to_basket_events=EXCLUDED.add_to_basket_events,
      fourthwall_outbound_clicks=EXCLUDED.fourthwall_outbound_clicks;
    DELETE FROM analytics_events WHERE occurred_at < NOW() - INTERVAL '12 months';
  `);
}

function sourceName(value: string | undefined, referrer: string | undefined) {
  const raw = (value || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (["instagram", "ig"].includes(raw)) return "instagram";
  if (["tiktok", "tt"].includes(raw)) return "tiktok";
  if (["youtube", "yt"].includes(raw)) return "youtube";
  if (raw === "google") return "google";
  if (["newsletter", "studio_letter", "email"].includes(raw))
    return "studio_letter";
  if (raw === "fourthwall") return "fourthwall";
  const domain = (referrer || "").toLowerCase();
  if (domain.includes("instagram.com")) return "instagram";
  if (domain.includes("tiktok.com")) return "tiktok";
  if (domain.includes("youtube.com") || domain.includes("youtu.be"))
    return "youtube";
  if (domain.includes("google.")) return "google";
  if (domain.includes("fourthwall.com")) return "fourthwall";
  return domain ? "referral" : "direct";
}

function geo(req: Request) {
  const h = (name: string) =>
    String(req.header(name) || "").slice(0, 120) || "Unknown";
  return {
    countryCode: h("cf-ipcountry"),
    countryName: h("x-country-name"),
    region: h("x-region"),
    city: h("x-city"),
  };
}

function device(value: string) {
  const ua = value.toLowerCase();
  const category = /ipad|tablet/.test(ua)
    ? "tablet"
    : /mobile|iphone|android/.test(ua)
      ? "mobile"
      : "desktop";
  const browser = /firefox/.test(ua)
    ? "Firefox"
    : /edg\//.test(ua)
      ? "Edge"
      : /safari/.test(ua) && !/chrome/.test(ua)
        ? "Safari"
        : /chrome/.test(ua)
          ? "Chrome"
          : "Other";
  const os = /iphone|ipad|mac os/.test(ua)
    ? "Apple"
    : /android/.test(ua)
      ? "Android"
      : /windows/.test(ua)
        ? "Windows"
        : /linux/.test(ua)
          ? "Linux"
          : "Other";
  return { category, browser, os };
}

router.post("/collect", async (req, res) => {
  try {
    if (
      process.env.NODE_ENV !== "production" &&
      req.header("x-analytics-debug") !== "1"
    )
      return res.status(204).end();
    const origin = req.header("origin");
    const allowed = process.env.PUBLIC_SITE_URL || "https://www.aedaart.com";
    if (
      origin &&
      !origin.startsWith(allowed) &&
      process.env.NODE_ENV === "production"
    )
      return res.status(403).end();
    const ua = req.header("user-agent") || "";
    if (/bot|crawler|spider|preview|headless/i.test(ua))
      return res.status(204).end();
    const {
      visitorId,
      sessionId,
      eventName,
      pagePath,
      pageTitle,
      entityType,
      entityId,
      entityName,
      attribution = {},
      metadata = {},
    } = req.body || {};
    if (
      !VISITOR_ID.test(visitorId) ||
      !VISITOR_ID.test(sessionId) ||
      !EVENTS.has(eventName) ||
      !SAFE_PATH.test(pagePath)
    )
      return res.status(400).json({ error: "Invalid analytics event" });
    const key = `${sessionId}:${eventName}:${pagePath}:${entityId || ""}`;
    const now = Date.now();
    if ((recent.get(key) || 0) > now - 1500)
      return res.status(202).json({ duplicate: true });
    recent.set(key, now);
    if (recent.size > 5000)
      for (const [k, time] of recent) if (time < now - 60000) recent.delete(k);
    const safeMeta = Object.fromEntries(
      Object.entries(metadata)
        .filter(
          ([k, v]) =>
            META_KEYS.has(k) &&
            ["string", "number", "boolean"].includes(typeof v),
        )
        .map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 150) : v]),
    );
    const referrerDomain =
      String(attribution.referrerDomain || "")
        .replace(/[^a-z0-9.-]/gi, "")
        .slice(0, 200) || null;
    const source = sourceName(attribution.source, referrerDomain || undefined);
    const location = geo(req);
    const d = device(ua);
    await ensureAnalyticsTables();
    void runAnalyticsMaintenance().catch((error) =>
      req.log.error({ err: error }, "Analytics maintenance failed"),
    );
    const visitor = await pool.query(
      `INSERT INTO analytics_visitors (anonymous_visitor_id, first_source, first_medium, first_campaign, first_content, first_referrer_domain, first_landing_path, first_country_code, first_country_name, first_region, first_city, last_source, last_medium, last_campaign, last_referrer_domain, total_sessions, total_page_views) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$2,$3,$4,$6,0,$12) ON CONFLICT (anonymous_visitor_id) DO UPDATE SET last_seen_at=NOW(), last_source=$2, last_medium=$3, last_campaign=$4, last_referrer_domain=$6, total_page_views=analytics_visitors.total_page_views+$12, updated_at=NOW() RETURNING id`,
      [
        visitorId,
        source,
        attribution.medium || null,
        attribution.campaign || null,
        attribution.content || null,
        referrerDomain,
        pagePath,
        location.countryCode,
        location.countryName,
        location.region,
        location.city,
        eventName === "page_view" ? 1 : 0,
      ],
    );
    const session = await pool.query(
      `INSERT INTO analytics_sessions (visitor_id, session_uuid, landing_path, exit_path, source, medium, campaign, content, term, referrer_domain, country_code, country_name, region, city, device_category, browser_family, operating_system_family, preferred_language, page_view_count) VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (session_uuid) DO UPDATE SET last_activity_at=NOW(), exit_path=$3, page_view_count=analytics_sessions.page_view_count+$18, updated_at=NOW() RETURNING id, (xmax = 0) AS created`,
      [
        visitor.rows[0].id,
        sessionId,
        pagePath,
        source,
        attribution.medium || null,
        attribution.campaign || null,
        attribution.content || null,
        attribution.term || null,
        referrerDomain,
        location.countryCode,
        location.countryName,
        location.region,
        location.city,
        d.category,
        d.browser,
        d.os,
        String(req.header("accept-language") || "")
          .split(",")[0]
          .slice(0, 20),
        eventName === "page_view" ? 1 : 0,
      ],
    );
    if (session.rows[0].created)
      await pool.query(
        "UPDATE analytics_visitors SET total_sessions=total_sessions+1 WHERE id=$1",
        [visitor.rows[0].id],
      );
    await pool.query(
      `INSERT INTO analytics_events (visitor_id, session_id, event_name, page_path, page_title, entity_type, entity_id, entity_name, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        visitor.rows[0].id,
        session.rows[0].id,
        eventName,
        pagePath,
        String(pageTitle || "").slice(0, 200) || null,
        String(entityType || "").slice(0, 50) || null,
        String(entityId || "").slice(0, 100) || null,
        String(entityName || "").slice(0, 200) || null,
        JSON.stringify(safeMeta),
      ],
    );
    return res.status(202).json({ accepted: true });
  } catch (error) {
    req.log.error({ err: error }, "Analytics event failed");
    return res
      .status(500)
      .json({ error: "Analytics event could not be recorded" });
  }
});

export async function attributeSubscriber(input: {
  subscriberId: number;
  visitorUuid?: string;
  sessionUuid?: string;
  signupPath?: string;
  signupForm?: string;
  isNew: boolean;
}) {
  if (!input.isNew || !input.visitorUuid || !VISITOR_ID.test(input.visitorUuid))
    return;
  await ensureAnalyticsTables();
  const visitor = await pool.query(
    "SELECT * FROM analytics_visitors WHERE anonymous_visitor_id=$1",
    [input.visitorUuid],
  );
  if (!visitor.rows[0]) return;
  const v = visitor.rows[0];
  const session =
    input.sessionUuid && VISITOR_ID.test(input.sessionUuid)
      ? await pool.query(
          "SELECT * FROM analytics_sessions WHERE session_uuid=$1 AND visitor_id=$2",
          [input.sessionUuid, v.id],
        )
      : { rows: [] };
  const s = session.rows[0];
  await pool.query(
    `INSERT INTO analytics_subscriber_attribution (subscriber_id, analytics_visitor_id, signup_path, signup_form, signup_source, signup_medium, signup_campaign, signup_content, signup_referrer_domain, signup_landing_path, country_code, country_name, region, city, first_seen_at, sessions_before_subscription, page_views_before_subscription) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (subscriber_id) DO NOTHING`,
    [
      input.subscriberId,
      v.id,
      input.signupPath || null,
      input.signupForm || null,
      s?.source || v.last_source,
      s?.medium || v.last_medium,
      s?.campaign || v.last_campaign,
      s?.content || null,
      s?.referrer_domain || v.last_referrer_domain,
      s?.landing_path || v.first_landing_path,
      s?.country_code || v.first_country_code,
      s?.country_name || v.first_country_name,
      s?.region || v.first_region,
      s?.city || v.first_city,
      v.first_seen_at,
      v.total_sessions,
      v.total_page_views,
    ],
  );
  await pool.query(
    "UPDATE analytics_visitors SET has_subscribed=TRUE, subscriber_id=$2 WHERE id=$1",
    [v.id, input.subscriberId],
  );
  if (s)
    await pool.query(
      "UPDATE analytics_sessions SET converted_to_subscriber=TRUE WHERE id=$1",
      [s.id],
    );
}

function range(req: Request) {
  const days = Math.min(366, Math.max(1, Number(req.query.days) || 30));
  return { days };
}
router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    await ensureAnalyticsTables();
    const { days } = range(req);
    const args = [days];
    const [
      kpi,
      trends,
      sources,
      pages,
      products,
      geography,
      devices,
      funnel,
      recentActivity,
    ] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(DISTINCT visitor_id) FILTER (WHERE occurred_at >= NOW()-make_interval(days => $1::int))::int visitors,
          COUNT(DISTINCT session_id) FILTER (WHERE occurred_at >= NOW()-make_interval(days => $1::int))::int sessions,
          COUNT(*) FILTER (WHERE occurred_at >= NOW()-make_interval(days => $1::int) AND event_name='page_view')::int page_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE occurred_at >= NOW()-make_interval(days => $1::int) AND event_name='newsletter_signup_success' AND metadata->>'newSubscriber'='true')::int subscribers,
          COUNT(*) FILTER (WHERE occurred_at >= NOW()-make_interval(days => $1::int) AND event_name='whatsapp_checkout_started')::int whatsapp,
          COUNT(DISTINCT visitor_id) FILTER (WHERE occurred_at < NOW()-make_interval(days => $1::int))::int previous_visitors,
          COUNT(DISTINCT session_id) FILTER (WHERE occurred_at < NOW()-make_interval(days => $1::int))::int previous_sessions,
          COUNT(*) FILTER (WHERE occurred_at < NOW()-make_interval(days => $1::int) AND event_name='page_view')::int previous_page_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE occurred_at < NOW()-make_interval(days => $1::int) AND event_name='newsletter_signup_success' AND metadata->>'newSubscriber'='true')::int previous_subscribers,
          COUNT(*) FILTER (WHERE occurred_at < NOW()-make_interval(days => $1::int) AND event_name='whatsapp_checkout_started')::int previous_whatsapp
         FROM analytics_events WHERE occurred_at >= NOW()-make_interval(days => $1::int * 2)`,
        args,
      ),
      pool.query(
        `SELECT occurred_at::date date, COUNT(DISTINCT visitor_id)::int visitors, COUNT(DISTINCT session_id)::int sessions, COUNT(*) FILTER(WHERE event_name='page_view')::int page_views, COUNT(*) FILTER(WHERE event_name='newsletter_signup_success' AND metadata->>'newSubscriber'='true')::int subscribers, COUNT(*) FILTER(WHERE event_name='whatsapp_checkout_started')::int whatsapp FROM analytics_events WHERE occurred_at >= NOW()-make_interval(days => $1::int) GROUP BY 1 ORDER BY 1`,
        args,
      ),
      pool.query(
        `SELECT s.source, COUNT(DISTINCT s.visitor_id)::int visitors, COUNT(DISTINCT s.id)::int sessions, COUNT(DISTINCT a.subscriber_id)::int subscribers, COUNT(e.id) FILTER(WHERE e.event_name='whatsapp_checkout_started')::int whatsapp FROM analytics_sessions s LEFT JOIN analytics_subscriber_attribution a ON a.analytics_visitor_id=s.visitor_id LEFT JOIN analytics_events e ON e.session_id=s.id WHERE s.started_at >= NOW()-make_interval(days => $1::int) GROUP BY s.source ORDER BY visitors DESC`,
        args,
      ),
      pool.query(
        `SELECT page_path, MAX(page_title) page_title, COUNT(DISTINCT visitor_id)::int visitors, COUNT(*)::int views, COUNT(*) FILTER(WHERE event_name='newsletter_signup_success')::int subscribers, COUNT(*) FILTER(WHERE event_name='add_to_basket')::int basket, COUNT(*) FILTER(WHERE event_name='whatsapp_checkout_started')::int whatsapp FROM analytics_events WHERE occurred_at >= NOW()-make_interval(days => $1::int) GROUP BY page_path ORDER BY views DESC LIMIT 20`,
        args,
      ),
      pool.query(
        `SELECT entity_id, MAX(entity_name) entity_name, MAX(entity_type) entity_type, COUNT(*) FILTER(WHERE event_name='product_view')::int views, COUNT(*) FILTER(WHERE event_name='product_options_opened')::int options, COUNT(*) FILTER(WHERE event_name IN ('add_to_basket','mystery_mail_added_to_basket'))::int basket, COUNT(*) FILTER(WHERE event_name='whatsapp_checkout_started')::int whatsapp FROM analytics_events WHERE entity_id IS NOT NULL AND occurred_at >= NOW()-make_interval(days => $1::int) GROUP BY entity_id ORDER BY views DESC LIMIT 20`,
        args,
      ),
      pool.query(
        `SELECT COALESCE(country_name,'Unknown') country, COALESCE(city,'Unknown') city, COUNT(DISTINCT visitor_id)::int visitors, COUNT(*) FILTER(WHERE converted_to_subscriber)::int subscribers FROM analytics_sessions WHERE started_at >= NOW()-make_interval(days => $1::int) GROUP BY 1,2 ORDER BY visitors DESC LIMIT 20`,
        args,
      ),
      pool.query(
        `SELECT COALESCE(device_category,'Unknown') device, COUNT(DISTINCT visitor_id)::int visitors FROM analytics_sessions WHERE started_at >= NOW()-make_interval(days => $1::int) GROUP BY 1 ORDER BY visitors DESC`,
        args,
      ),
      pool.query(
        `SELECT COUNT(DISTINCT visitor_id) FILTER(WHERE event_name='page_view')::int visitors, COUNT(DISTINCT visitor_id) FILTER(WHERE event_name='newsletter_section_viewed')::int viewers, COUNT(DISTINCT visitor_id) FILTER(WHERE event_name='newsletter_form_started')::int starters, COUNT(DISTINCT visitor_id) FILTER(WHERE event_name='newsletter_signup_success' AND metadata->>'newSubscriber'='true')::int subscribers FROM analytics_events WHERE occurred_at >= NOW()-make_interval(days => $1::int)`,
        args,
      ),
      pool.query(
        `SELECT COUNT(DISTINCT session_id)::int active_sessions, COUNT(*) FILTER(WHERE event_name='newsletter_signup_success')::int subscriptions, COUNT(*) FILTER(WHERE event_name='add_to_basket')::int basket, MODE() WITHIN GROUP (ORDER BY page_path) FILTER(WHERE event_name='page_view') popular_page FROM analytics_events WHERE occurred_at >= NOW()-INTERVAL '30 minutes'`,
      ),
    ]);
    const k = kpi.rows[0];
    return res.json({
      rangeDays: days,
      kpis: {
        ...k,
        conversion_rate: Number(k.visitors)
          ? Number(
              ((Number(k.subscribers) / Number(k.visitors)) * 100).toFixed(1),
            )
          : 0,
      },
      trends: trends.rows,
      sources: sources.rows,
      pages: pages.rows,
      products: products.rows,
      geography: geography.rows,
      devices: devices.rows,
      funnel: funnel.rows[0],
      recent: recentActivity.rows[0],
    });
  } catch (error) {
    req.log.error({ err: error }, "Analytics dashboard failed");
    return res.status(500).json({ error: "Analytics could not be loaded" });
  }
});

router.get("/subscribers", requireAdmin, async (req, res) => {
  try {
    await ensureAnalyticsTables();
    const { days } = range(req);
    const result = await pool.query(
      `SELECT n.id, n.email, n.created_at subscribed_at, a.signup_source, a.signup_campaign, a.signup_path, a.signup_form, a.signup_landing_path, a.country_name, a.city, a.sessions_before_subscription, a.page_views_before_subscription FROM newsletter_subscribers n LEFT JOIN analytics_subscriber_attribution a ON a.subscriber_id=n.id WHERE n.created_at >= NOW()-make_interval(days => $1::int) ORDER BY n.created_at DESC LIMIT 500`,
      [days],
    );
    return res.json({ subscribers: result.rows });
  } catch (error) {
    req.log.error({ err: error }, "Subscriber analytics failed");
    return res
      .status(500)
      .json({ error: "Subscriber analytics could not be loaded" });
  }
});

router.post("/cleanup", requireAdmin, async (req, res) => {
  try {
    await ensureAnalyticsTables();
    const months = Math.min(36, Math.max(1, Number(req.body?.months) || 12));
    const deleted = await pool.query(
      "DELETE FROM analytics_events WHERE occurred_at < NOW()-make_interval(months => $1::int) RETURNING id",
      [months],
    );
    return res.json({ deleted: deleted.rowCount, retentionMonths: months });
  } catch (error) {
    req.log.error({ err: error }, "Analytics cleanup failed");
    return res.status(500).json({ error: "Cleanup failed" });
  }
});

export default router;
