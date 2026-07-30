ALTER TABLE event_banner_config
  ADD COLUMN IF NOT EXISTS banner_short_title_en TEXT,
  ADD COLUMN IF NOT EXISTS banner_short_title_tr TEXT;
