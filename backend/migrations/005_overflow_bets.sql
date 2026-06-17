-- =============================================================
--  005 · Overflow Bets
--  Records bets that exceeded the number limit: the placed
--  portion was accepted, the overflow portion is stored here
--  for admin visibility. Fully-booked numbers are not recorded.
-- =============================================================

CREATE TABLE IF NOT EXISTS overflow_bets (
  id              BIGSERIAL   PRIMARY KEY,
  ticket_id       TEXT        NOT NULL,
  agent_id        UUID        NOT NULL REFERENCES users(id),
  lottery_id      UUID        NOT NULL REFERENCES lotteries(id),
  type            TEXT        NOT NULL,
  number          INTEGER     NOT NULL,
  tab             INTEGER     NOT NULL,
  requested_count INTEGER     NOT NULL CHECK (requested_count > 0),
  placed_count    INTEGER     NOT NULL DEFAULT 0,
  overflow_count  INTEGER     NOT NULL CHECK (overflow_count > 0),
  customer_name   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overflow_bets_lottery_id ON overflow_bets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_overflow_bets_agent_id   ON overflow_bets(agent_id);
CREATE INDEX IF NOT EXISTS idx_overflow_bets_created_at ON overflow_bets(created_at DESC);
