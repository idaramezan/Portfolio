-- Scheduled Sticker Drop campaigns and their transparent PNG artwork.
CREATE TABLE IF NOT EXISTS sticker_drop_campaigns (
  id UUID PRIMARY KEY, internal_name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL, timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  english_eyebrow TEXT NOT NULL, english_title TEXT NOT NULL, english_description TEXT NOT NULL,
  turkish_eyebrow TEXT NOT NULL, turkish_title TEXT NOT NULL, turkish_description TEXT NOT NULL,
  animation_duration_ms INTEGER NOT NULL DEFAULT 3000,
  maximum_desktop_stickers INTEGER NOT NULL DEFAULT 12,
  maximum_mobile_stickers INTEGER NOT NULL DEFAULT 7,
  show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_turkiye_shop BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_international_shop BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_other_storefront_pages BOOLEAN NOT NULL DEFAULT TRUE,
  frequency_mode TEXT NOT NULL DEFAULT 'once_per_campaign', repeat_after_days INTEGER,
  turkiye_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  turkiye_destination_type TEXT NOT NULL DEFAULT 'local_product',
  turkiye_local_product_id TEXT, turkiye_custom_product_url TEXT,
  international_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  international_destination_type TEXT NOT NULL DEFAULT 'fourthwall_product',
  international_local_product_id TEXT, international_fourthwall_product_id TEXT,
  international_external_product_url TEXT, published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sticker_drop_assets (
  id UUID PRIMARY KEY, campaign_id UUID NOT NULL REFERENCES sticker_drop_campaigns(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL, alt_text TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0, mime_type TEXT NOT NULL DEFAULT 'image/png',
  byte_size INTEGER NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sticker_drop_campaign_schedule_idx ON sticker_drop_campaigns(status, start_at, end_at);
CREATE INDEX IF NOT EXISTS sticker_drop_assets_campaign_idx ON sticker_drop_assets(campaign_id, display_order);
