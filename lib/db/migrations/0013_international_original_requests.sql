CREATE SEQUENCE IF NOT EXISTS original_request_number_seq;

CREATE TABLE IF NOT EXISTS international_original_requests (
  id UUID PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved', 'completed', 'declined')),
  admin_note TEXT,
  customer_language TEXT NOT NULL DEFAULT 'en',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS international_original_requests_status_submitted_idx
  ON international_original_requests(status, submitted_at DESC);
