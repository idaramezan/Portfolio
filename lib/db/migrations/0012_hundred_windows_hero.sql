UPDATE shop_settings
SET payload = jsonb_set(
  payload,
  '{hundredWindows}',
  COALESCE(payload->'hundredWindows','{"currentDay":1,"currentProductId":null}'::jsonb)
    || '{"heroImageUrl":null,"heroUpdatedAt":null}'::jsonb,
  true
)
WHERE id='primary' AND NOT (COALESCE(payload->'hundredWindows','{}'::jsonb) ? 'heroImageUrl');
