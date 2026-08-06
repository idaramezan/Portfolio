-- Preserve the legacy event row and registrations; only separate its presentation settings.
CREATE TABLE IF NOT EXISTS homepage_event_feature (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  event_id TEXT REFERENCES event_banner_config(id) ON DELETE SET NULL,
  show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_turkiye_shop BOOLEAN NOT NULL DEFAULT FALSE,
  title_override TEXT,
  desktop_object_position TEXT,
  mobile_object_position TEXT,
  hide_after_event BOOLEAN NOT NULL DEFAULT TRUE,
  show_remaining_places BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO homepage_event_feature(id,enabled,event_id,show_on_homepage,show_on_turkiye_shop,desktop_object_position,hide_after_event,show_remaining_places)
SELECT 'primary',enabled,id,show_on_homepage,show_on_turkiye_shop,image_object_position,TRUE,TRUE
FROM event_banner_config WHERE id='istanbul-painting-day-2026-08-04'
ON CONFLICT(id) DO NOTHING;

UPDATE event_banner_config
SET status='completed', completed_at=COALESCE(completed_at,event_end_at,event_start_at),
    slug=COALESCE(NULLIF(slug,''),'istanbul-summer-painting-day')
WHERE (id='istanbul-painting-day-2026-08-04' OR internal_name ILIKE '%Istanbul%painting%day%')
  AND event_start_at<NOW()
  AND status IN ('active','scheduled','expired','paused','booking_closed','fully_booked');
