-- =============================================================
--  002 · Number Lock Limits on Lotteries
--  Adds per-tab max-count columns to the lotteries table.
-- =============================================================

ALTER TABLE lotteries ADD COLUMN IF NOT EXISTS tab1_max INTEGER;
ALTER TABLE lotteries ADD COLUMN IF NOT EXISTS tab2_max INTEGER;
ALTER TABLE lotteries ADD COLUMN IF NOT EXISTS tab3_max INTEGER;
