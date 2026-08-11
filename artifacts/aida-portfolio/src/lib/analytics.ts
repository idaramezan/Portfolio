export type AnalyticsEventName =
  | "session_start"
  | "page_view"
  | "outbound_link_click"
  | "product_view"
  | "product_options_opened"
  | "add_to_basket"
  | "remove_from_basket"
  | "basket_opened"
  | "whatsapp_checkout_started"
  | "checkout_started"
  | "bank_instructions_viewed"
  | "receipt_upload_started"
  | "receipt_upload_completed"
  | "order_submitted"
  | "event_application_started"
  | "event_application_submitted"
  | "fourthwall_product_clicked"
  | "fourthwall_product_click"
  | "newsletter_section_viewed"
  | "newsletter_form_started"
  | "newsletter_signup_success"
  | "newsletter_signup_failed"
  | "mystery_mail_viewed"
  | "mystery_mail_cta_clicked"
  | "mystery_mail_added_to_basket"
  | "mystery_mail_unavailable_signup_clicked"
  | "painting_event_banner_viewed"
  | "painting_event_form_started"
  | "painting_event_signup_success"
  | "painting_event_whatsapp_clicked"
  | "turkiye_shop_opened"
  | "international_shop_opened"
  | "sticker_drop_animation_started"
  | "sticker_drop_animation_completed"
  | "sticker_drop_modal_opened"
  | "sticker_drop_market_selected"
  | "sticker_drop_dismissed"
  | "sticker_drop_add_to_basket"
  | "sticker_drop_external_product_clicked"
  | "sticker_drop_sold_out_viewed"
  | "homepage_market_selected"
  | "homepage_category_clicked"
  | "homepage_product_clicked"
  | "homepage_event_clicked"
  | "homepage_about_clicked"
  | "homepage_tiktok_clicked"
  | "stream_platform_click"
  | "discord_join_click"
  | "stream_section_view"
  | "discord_section_view"
  | "event_page_view"
  | "event_booking_click"
  | "finished_event_open"
  | "event_gallery_open"
  | "event_newsletter_signup"
  | "hundred_windows_page_view"
  | "hundred_windows_region_switch"
  | "hundred_windows_current_product_click"
  | "hundred_windows_archive_product_click"
  | "hundred_windows_fourthwall_click"
  | "hundred_windows_tiktok_click"
  | "hundred_windows_twitch_click"
  | "hundred_windows_kick_click"
  | "hundred_windows_newsletter_signup"
  | "hundred_windows_links_page_click"
  | "shipping_destination_detected"
  | "shipping_destination_changed"
  | "shop_view"
  | "local_purchase_selected"
  | "fourthwall_redirect"
  | "original_delivery_request_started"
  | "original_delivery_request_submitted"
  | "us_original_unavailable_view"
  | "100_windows_product_view";

export const ANALYTICS_CONSENT_KEY = "aida-analytics-consent";
const VISITOR_COOKIE = "aida_analytics_visitor";
const SESSION_KEY = "aida-analytics-session";
const SESSION_ACTIVITY = "aida-analytics-last-activity";

function cookie(name: string) {
  return (
    document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${name}=`))
      ?.split("=")[1] || null
  );
}
function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}
export function analyticsConsent() {
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === "accepted";
}
export function setAnalyticsConsent(value: "accepted" | "declined") {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  if (value === "declined") {
    document.cookie = `${VISITOR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_ACTIVITY);
  }
  window.dispatchEvent(new CustomEvent("analytics:consent", { detail: value }));
}
function ids() {
  if (!analyticsConsent()) return null;
  let visitorId = cookie(VISITOR_COOKIE);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    setCookie(VISITOR_COOKIE, visitorId, 31536000);
  }
  const now = Date.now();
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  const last = Number(sessionStorage.getItem(SESSION_ACTIVITY) || 0);
  let fresh = false;
  if (!sessionId || now - last > 30 * 60 * 1000) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    fresh = true;
  }
  sessionStorage.setItem(SESSION_ACTIVITY, String(now));
  return { visitorId, sessionId, fresh };
}
function attribution() {
  const query = new URLSearchParams(location.search);
  let referrerDomain = "";
  try {
    if (
      document.referrer &&
      new URL(document.referrer).origin !== location.origin
    )
      referrerDomain = new URL(document.referrer).hostname;
  } catch {}
  return {
    source: query.get("utm_source") || undefined,
    medium: query.get("utm_medium") || undefined,
    campaign: query.get("utm_campaign") || undefined,
    content: query.get("utm_content") || undefined,
    term: query.get("utm_term") || undefined,
    referrerDomain: referrerDomain || undefined,
  };
}
export function analyticsContext() {
  const value = ids();
  return value
    ? {
        analyticsVisitorId: value.visitorId,
        analyticsSessionId: value.sessionId,
        analyticsSignupPath: location.pathname,
      }
    : {};
}
export function trackAnalytics(
  eventName: AnalyticsEventName,
  options: {
    entityType?: string;
    entityId?: string;
    entityName?: string;
    metadata?: Record<string, string | number | boolean>;
  } = {},
) {
  if (location.pathname.startsWith("/admin")) return;
  const value = ids();
  if (!value) return;
  const payload = JSON.stringify({
    visitorId: value.visitorId,
    sessionId: value.sessionId,
    eventName,
    pagePath: location.pathname,
    pageTitle: document.title,
    attribution: attribution(),
    ...options,
  });
  const send = () =>
    fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(send, { timeout: 1500 });
  else globalThis.setTimeout(send, 0);
}
