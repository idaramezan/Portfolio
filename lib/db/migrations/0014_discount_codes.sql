CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discount_codes_limit_not_below_usage CHECK (max_uses IS NULL OR max_uses >= usage_count)
);

CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_upper_unique
  ON discount_codes (UPPER(code));

ALTER TABLE checkout_orders
  ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER,
  ADD COLUMN IF NOT EXISTS discount_amount_minor INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_before_discount_minor INTEGER,
  ALTER COLUMN receipt_storage_key DROP NOT NULL,
  ALTER COLUMN receipt_original_name DROP NOT NULL,
  ALTER COLUMN receipt_mime_type DROP NOT NULL,
  ALTER COLUMN receipt_size DROP NOT NULL;

UPDATE checkout_orders
SET total_before_discount_minor = subtotal_minor + shipping_minor
WHERE total_before_discount_minor IS NULL;

ALTER TABLE checkout_orders
  ALTER COLUMN total_before_discount_minor SET NOT NULL;

CREATE INDEX IF NOT EXISTS checkout_orders_discount_code_id_idx
  ON checkout_orders(discount_code_id);
