ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS product_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discount_codes_scope_check'
  ) THEN
    ALTER TABLE discount_codes
      ADD CONSTRAINT discount_codes_scope_check
      CHECK (scope IN ('order', 'products'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS discount_codes_product_ids_gin_idx
  ON discount_codes USING GIN (product_ids);
