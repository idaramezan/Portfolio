CREATE TABLE IF NOT EXISTS newsletter_template_revisions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES newsletter_templates(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  preheader TEXT,
  blocks JSONB NOT NULL,
  document_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS featured_studio_letter_config (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  template_id TEXT REFERENCES newsletter_templates(id) ON DELETE SET NULL,
  template_revision_id TEXT REFERENCES newsletter_template_revisions(id) ON DELETE SET NULL,
  public_eyebrow TEXT,
  public_title_override TEXT,
  public_metadata_override TEXT,
  preview_image_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_word_count INTEGER NOT NULL DEFAULT 65 CHECK (preview_word_count BETWEEN 20 AND 180),
  show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_turkiye_shop BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_international_shop BOOLEAN NOT NULL DEFAULT FALSE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO featured_studio_letter_config (id) VALUES ('primary')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS featured_studio_letter_deliveries (
  subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  template_revision_id TEXT NOT NULL REFERENCES newsletter_template_revisions(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subscriber_id, template_revision_id)
);
