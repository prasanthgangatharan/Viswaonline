ALTER TABLE results
  ADD COLUMN IF NOT EXISTS prize_2              INTEGER,
  ADD COLUMN IF NOT EXISTS prize_3              INTEGER,
  ADD COLUMN IF NOT EXISTS prize_4              INTEGER,
  ADD COLUMN IF NOT EXISTS prize_5              INTEGER,
  ADD COLUMN IF NOT EXISTS complementary_numbers JSONB DEFAULT '[]'::jsonb;
