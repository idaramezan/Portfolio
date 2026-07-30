# First-party studio analytics

The storefront uses a consent-gated, first-party analytics client alongside the Smartlook EU session-replay tracker configured in the document head. The first-party system does not use advertising pixels, fingerprinting or raw IP storage. Smartlook is a separate third-party service and follows its configured Smartlook project privacy and retention settings.

## Architecture

- `analytics_visitors`: random first-party visitor UUID and first/last attribution.
- `analytics_sessions`: 30-minute sessions, landing/exit pages, approximate geography and broad device families.
- `analytics_events`: validated allowlisted events with safe metadata only.
- `analytics_subscriber_attribution`: connects an existing newsletter subscriber to consented attribution without duplicating their email in event metadata.
- `analytics_daily`: storage for longer-term non-identifiable aggregates.

Tables and indexes are created idempotently by `ensureAnalyticsTables()` when analytics is first used. Production uses the existing `DATABASE_URL` PostgreSQL database.

## Consent

No visitor or session UUID is created and no event is sent until the visitor selects **Accept analytics**. Declining or withdrawing consent removes the analytics cookie and session state. Necessary storefront and newsletter functionality remains available. Visitors can reopen preferences with **Manage analytics**.

The visitor cookie is a random UUID with `Secure`, `SameSite=Lax`, a one-year lifetime and no browser/device-derived input. Sessions use a separate random UUID and expire after 30 minutes of inactivity.

## Attribution

UTM parameters have priority, then a recognised external referrer, then other referral traffic, then direct. Supported normalisation includes Instagram, TikTok, YouTube, Google, Newsletter and Fourthwall. Only the referrer domain is stored, never its query string.

Use **Admin → Analytics → Tracked Links** to create UTM-tagged URLs for social bios, videos and Newsletter campaigns.

## Geography

The collector reads trusted deployment headers when available:

- `cf-ipcountry`
- `x-country-name`
- `x-region`
- `x-city`

Missing values become `Unknown`. The request IP is discarded and never written to analytics tables. Cloudflare supplies country automatically; region/city require trusted proxy headers if available.

## Events and development

The event allowlist is defined in `routes/analytics.ts`. Metadata is reduced to an allowlist and cannot contain emails, messages, phone numbers or WhatsApp text. Admin paths, API paths, bots, preview-like user agents and rapid duplicate events are excluded.

Collection is disabled outside production unless the request has `x-analytics-debug: 1`. Reporting routes always require the existing `x-admin-password` authentication.

## Retention and deletion

Raw events default to 12 months. An authorised cleanup can call `POST /api/analytics/cleanup` with `{ "months": 12 }`. Non-identifiable daily aggregates may be retained longer. If a subscriber requests deletion, delete their existing newsletter record and `analytics_subscriber_attribution` row, then clear `subscriber_id` and `has_subscribed` from the related visitor or delete that visitor record to cascade anonymous sessions/events.

## Environment and deployment

No new secrets are required. Existing variables are reused:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `PUBLIC_SITE_URL` (used for collection origin validation; recommended `https://www.aedaart.com`)

The tables are created automatically. To verify production, accept analytics, visit a UTM URL, open a product, add it to the basket, and submit a new Newsletter address. Then open `/admin/analytics` and refresh the selected range.
