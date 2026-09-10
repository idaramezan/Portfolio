ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS model_url TEXT;
ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS default_scale JSONB NOT NULL DEFAULT '[1,1,1]'::jsonb;
ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS ground_offset DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS rotation_offset JSONB NOT NULL DEFAULT '[0,0,0]'::jsonb;

UPDATE gallery_scenes
SET camera_views = '[{"id":"main","name":"Main gallery wall","position":[0.7,1.62,2.8],"target":[0,1.5,-3.65],"fieldOfView":44,"displayOrder":0},{"id":"small-works","name":"Small Works Wall","position":[-2.7,1.6,-0.2],"target":[-4.82,1.5,-1.15],"fieldOfView":46,"displayOrder":1},{"id":"corner","name":"Gallery corner","position":[2.8,1.65,1.2],"target":[1.3,1.5,-3.55],"fieldOfView":43,"displayOrder":2}]'::jsonb,
    active_camera_view_id = 'main'
WHERE template_id = 'contemporary_gallery';
