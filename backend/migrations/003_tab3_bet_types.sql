-- =============================================================
--  003 · Tab 3 Bet Types (SUPER and BOX)
--  Replaces the bets type CHECK constraint to allow SUPER/BOX.
-- =============================================================

ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_type_check;
ALTER TABLE bets ADD CONSTRAINT bets_type_check
  CHECK (type IN ('A', 'B', 'C', 'AB', 'BC', 'AC', 'SUPER', 'BOX'));
