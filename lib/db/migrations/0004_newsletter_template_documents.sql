-- Version Studio Letter template JSON without altering existing block documents.
ALTER TABLE newsletter_templates
  ADD COLUMN IF NOT EXISTS document_version INTEGER NOT NULL DEFAULT 1;

UPDATE newsletter_templates
SET document_version = 1
WHERE document_version IS NULL;
