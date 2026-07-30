CREATE SEQUENCE IF NOT EXISTS checkout_order_number_seq;
CREATE TABLE IF NOT EXISTS bank_transfer_settings (
  currency TEXT PRIMARY KEY CHECK (currency IN ('TRY','USD')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  account_holder TEXT NOT NULL DEFAULT '', bank_name TEXT NOT NULL DEFAULT '',
  iban TEXT NOT NULL DEFAULT '', swift_bic TEXT, branch_info TEXT,
  bank_address TEXT, instructions TEXT, notification_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO bank_transfer_settings(currency) VALUES ('TRY'),('USD') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS checkout_orders (
  id UUID PRIMARY KEY, order_number TEXT UNIQUE NOT NULL, payment_reference TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL, market TEXT NOT NULL, currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', customer_full_name TEXT NOT NULL,
  customer_email TEXT NOT NULL, customer_phone TEXT NOT NULL, country_code TEXT NOT NULL,
  country_name TEXT NOT NULL, province_or_region TEXT, district TEXT, city TEXT,
  postal_code TEXT NOT NULL, address_line TEXT NOT NULL, delivery_notes TEXT,
  subtotal_minor INTEGER NOT NULL, shipping_minor INTEGER NOT NULL, grand_total_minor INTEGER NOT NULL,
  print_quantity INTEGER NOT NULL DEFAULT 0, original_quantity INTEGER NOT NULL DEFAULT 0,
  receipt_storage_key TEXT NOT NULL, receipt_original_name TEXT NOT NULL,
  receipt_mime_type TEXT NOT NULL, receipt_size INTEGER NOT NULL,
  customer_language TEXT NOT NULL DEFAULT 'en', consent_version TEXT NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL, tracking_carrier TEXT, tracking_number TEXT, tracking_url TEXT,
  internal_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), packaging_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS checkout_order_items (
  id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, product_type TEXT NOT NULL, product_name TEXT NOT NULL,
  selected_options JSONB NOT NULL DEFAULT '{}'::jsonb, quantity INTEGER NOT NULL,
  unit_price_minor INTEGER NOT NULL, line_total_minor INTEGER NOT NULL, currency TEXT NOT NULL,
  image_snapshot TEXT, sku TEXT
);
CREATE TABLE IF NOT EXISTS checkout_order_status_history (
  id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE,
  previous_status TEXT, new_status TEXT NOT NULL, changed_by_admin_id TEXT,
  internal_note TEXT, customer_notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS checkout_notifications (
  id UUID PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  template TEXT NOT NULL, recipient TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT, attempt_count INTEGER NOT NULL DEFAULT 0, last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS bank_settings_audit (
  id UUID PRIMARY KEY, currency TEXT NOT NULL, changed_by_admin_id TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE SEQUENCE IF NOT EXISTS event_application_number_seq;
CREATE TABLE IF NOT EXISTS event_applications (
  id UUID PRIMARY KEY, application_number TEXT UNIQUE NOT NULL, event_id TEXT NOT NULL,
  full_name TEXT NOT NULL, age INTEGER NOT NULL, eligibility_response TEXT NOT NULL,
  email TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  customer_language TEXT NOT NULL DEFAULT 'en', consent_version TEXT NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL, admin_note TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ, rejected_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS event_application_history (
  id UUID PRIMARY KEY, application_id UUID NOT NULL REFERENCES event_applications(id) ON DELETE CASCADE,
  previous_status TEXT, new_status TEXT NOT NULL, changed_by_admin_id TEXT,
  customer_notified BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
