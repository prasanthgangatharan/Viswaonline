-- =============================================================
--  004 · Add ON DELETE CASCADE to Lottery Foreign Keys
--  Ensures deleting a lottery automatically removes its bets
--  and results without needing manual pre-deletion.
-- =============================================================

ALTER TABLE bets    DROP CONSTRAINT IF EXISTS bets_lottery_id_fkey;
ALTER TABLE bets    ADD  CONSTRAINT bets_lottery_id_fkey
  FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE;

ALTER TABLE results DROP CONSTRAINT IF EXISTS results_lottery_id_fkey;
ALTER TABLE results ADD  CONSTRAINT results_lottery_id_fkey
  FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE;
