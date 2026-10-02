CREATE SEQUENCE IF NOT EXISTS portfolio_enquiry_number_seq;

CREATE TABLE IF NOT EXISTS portfolio_enquiries (
  id UUID PRIMARY KEY,
  enquiry_number TEXT UNIQUE NOT NULL,
  enquiry_type TEXT NOT NULL CHECK (enquiry_type IN ('artwork', 'moving_image')),
  subject_id TEXT,
  subject_name TEXT NOT NULL,
  subject_url TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  country TEXT,
  city TEXT,
  phone TEXT,
  organisation TEXT,
  project_type TEXT,
  project_link TEXT,
  desired_duration TEXT,
  deadline TEXT,
  budget_range TEXT,
  message TEXT,
  reference_links TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'negotiating', 'completed', 'declined')),
  admin_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_enquiries_type_status_idx
  ON portfolio_enquiries(enquiry_type, status, submitted_at DESC);
