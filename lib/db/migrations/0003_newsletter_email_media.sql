-- Preserve source photographs while serving an email-compatible derivative.
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS source_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS source_byte_size INTEGER,
  ADD COLUMN IF NOT EXISTS source_data BYTEA;

ALTER TABLE newsletter_campaigns
  ADD COLUMN IF NOT EXISTS rendered_html TEXT;
