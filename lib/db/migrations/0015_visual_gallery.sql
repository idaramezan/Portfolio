CREATE TABLE IF NOT EXISTS gallery_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  visibility TEXT NOT NULL DEFAULT 'private_preview' CHECK (visibility IN ('private_preview', 'public_unlisted', 'public')),
  title_en TEXT NOT NULL DEFAULT 'Aida''s Virtual Gallery',
  title_tr TEXT NOT NULL DEFAULT 'Aida''nın Sanal Galerisi',
  intro_en TEXT NOT NULL DEFAULT '',
  intro_tr TEXT NOT NULL DEFAULT '',
  preview_slug TEXT NOT NULL DEFAULT 'gallery-preview-7v4m2k9',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gallery_settings (id) VALUES ('primary') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS gallery_scenes (
  id UUID PRIMARY KEY,
  internal_name TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_tr TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_tr TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  display_order INTEGER NOT NULL DEFAULT 0,
  wall_color TEXT NOT NULL DEFAULT '#efe4d4',
  wall_texture TEXT NOT NULL DEFAULT 'subtle_plaster',
  floor_type TEXT NOT NULL DEFAULT 'light_oak',
  baseboard BOOLEAN NOT NULL DEFAULT TRUE,
  lighting_preset TEXT NOT NULL DEFAULT 'natural_daylight',
  light_direction TEXT NOT NULL DEFAULT 'left',
  mobile_crop TEXT NOT NULL DEFAULT 'center',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gallery_elements (
  id UUID PRIMARY KEY,
  scene_id UUID NOT NULL REFERENCES gallery_scenes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reference_id TEXT,
  label TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  x_percent DOUBLE PRECISION NOT NULL,
  y_percent DOUBLE PRECISION NOT NULL,
  width_percent DOUBLE PRECISION NOT NULL,
  height_percent DOUBLE PRECISION NOT NULL,
  rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 1,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  flip_x BOOLEAN NOT NULL DEFAULT FALSE,
  lock_aspect BOOLEAN NOT NULL DEFAULT TRUE,
  scale_mode TEXT NOT NULL DEFAULT 'realistic',
  frame_style TEXT NOT NULL DEFAULT 'none',
  mat_style TEXT NOT NULL DEFAULT 'none',
  shadow_intensity DOUBLE PRECISION NOT NULL DEFAULT 0.18,
  shadow_blur DOUBLE PRECISION NOT NULL DEFAULT 10,
  shadow_offset DOUBLE PRECISION NOT NULL DEFAULT 4
);

CREATE INDEX IF NOT EXISTS gallery_elements_scene_idx ON gallery_elements(scene_id, z_index);

CREATE TABLE IF NOT EXISTS gallery_assets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  default_width DOUBLE PRECISION NOT NULL DEFAULT 30,
  default_layer INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
