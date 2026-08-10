-- Add project metadata in-place to canonical Prints & Goods records.
-- Array order is used only to give legacy records a stable historical createdAt;
-- all newly created products receive their real creation timestamp in the editor.
UPDATE shop_settings
SET payload = jsonb_set(
  jsonb_set(
    payload,
    '{printProducts}',
    COALESCE((
      SELECT jsonb_agg(
        product || jsonb_build_object(
          'isHundredWindowsProduct', COALESCE((product->>'isHundredWindowsProduct')::boolean, false),
          'createdAt', COALESCE(product->>'createdAt', to_char(TIMESTAMPTZ '2020-01-01 00:00:00+00' + (ordinality || ' seconds')::interval, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
        ) ORDER BY ordinality
      )
      FROM jsonb_array_elements(COALESCE(payload->'printProducts','[]'::jsonb)) WITH ORDINALITY AS products(product, ordinality)
    ), '[]'::jsonb),
    true
  ),
  '{hundredWindows}',
  COALESCE(payload->'hundredWindows', '{"currentDay":1,"currentProductId":null}'::jsonb),
  true
)
WHERE id='primary';
