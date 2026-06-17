-- =============================================================
--  006 · Result Document
--  Adds an optional document URL to results (PDF or image)
--  uploaded by admin when declaring a lottery result.
-- =============================================================

ALTER TABLE results ADD COLUMN IF NOT EXISTS document_url TEXT;
