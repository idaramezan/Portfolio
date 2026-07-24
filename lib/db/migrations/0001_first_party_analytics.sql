-- First-party, consent-gated studio analytics.
CREATE TABLE IF NOT EXISTS analytics_visitors (
  id BIGSERIAL PRIMARY KEY, anonymous_visitor_id UUID UNIQUE NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_source TEXT NOT NULL DEFAULT 'direct', first_medium TEXT, first_campaign TEXT, first_content TEXT,
  first_referrer_domain TEXT, first_landing_path TEXT NOT NULL, first_country_code TEXT, first_country_name TEXT,
  first_region TEXT, first_city TEXT, last_source TEXT NOT NULL DEFAULT 'direct', last_medium TEXT,
  last_campaign TEXT, last_referrer_domain TEXT, total_sessions INTEGER NOT NULL DEFAULT 0,
  total_page_views INTEGER NOT NULL DEFAULT 0, has_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  subscriber_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id BIGSERIAL PRIMARY KEY, visitor_id BIGINT NOT NULL REFERENCES analytics_visitors(id) ON DELETE CASCADE,
  session_uuid UUID UNIQUE NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ended_at TIMESTAMPTZ, landing_path TEXT NOT NULL,
  exit_path TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'direct', medium TEXT, campaign TEXT, content TEXT,
  term TEXT, referrer_domain TEXT, country_code TEXT, country_name TEXT, region TEXT, city TEXT,
  device_category TEXT, browser_family TEXT, operating_system_family TEXT, preferred_language TEXT,
  page_view_count INTEGER NOT NULL DEFAULT 0, converted_to_subscriber BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY, visitor_id BIGINT REFERENCES analytics_visitors(id) ON DELETE SET NULL,
  session_id BIGINT REFERENCES analytics_sessions(id) ON DELETE SET NULL, event_name TEXT NOT NULL,
  page_path TEXT NOT NULL, page_title TEXT, entity_type TEXT, entity_id TEXT, entity_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS analytics_subscriber_attribution (
  subscriber_id BIGINT PRIMARY KEY, analytics_visitor_id BIGINT REFERENCES analytics_visitors(id) ON DELETE SET NULL,
  signup_path TEXT, signup_form TEXT, signup_source TEXT, signup_medium TEXT, signup_campaign TEXT,
  signup_content TEXT, signup_referrer_domain TEXT, signup_landing_path TEXT, country_code TEXT,
  country_name TEXT, region TEXT, city TEXT, first_seen_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sessions_before_subscription INTEGER NOT NULL DEFAULT 0,
  page_views_before_subscription INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS analytics_daily (
  date DATE PRIMARY KEY, unique_visitors INTEGER NOT NULL DEFAULT 0, new_visitors INTEGER NOT NULL DEFAULT 0,
  returning_visitors INTEGER NOT NULL DEFAULT 0, sessions INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0, subscriber_conversions INTEGER NOT NULL DEFAULT 0,
  whatsapp_continuations INTEGER NOT NULL DEFAULT 0, add_to_basket_events INTEGER NOT NULL DEFAULT 0,
  fourthwall_outbound_clicks INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx ON analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS analytics_events_path_idx ON analytics_events(page_path);
CREATE INDEX IF NOT EXISTS analytics_sessions_source_idx ON analytics_sessions(source);
CREATE INDEX IF NOT EXISTS analytics_sessions_country_idx ON analytics_sessions(country_code);
CREATE INDEX IF NOT EXISTS analytics_events_entity_idx ON analytics_events(entity_type, entity_id);
