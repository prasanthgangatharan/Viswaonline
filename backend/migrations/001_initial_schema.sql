-- =============================================================
--  001 · Initial Schema
--  Creates all base tables and indexes.
--  Uses IF NOT EXISTS so it is safe to run on an existing DB.
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  username         TEXT        UNIQUE NOT NULL,
  password_hash    TEXT        NOT NULL,
  role             TEXT        NOT NULL CHECK (role IN ('admin', 'agent')),
  status           TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_logout_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id           UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username     TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'active',
  tab1_price   NUMERIC NOT NULL DEFAULT 0,
  tab2_price   NUMERIC NOT NULL DEFAULT 0,
  tab3_price   NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lotteries (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 TEXT        NOT NULL,
  draw_time            TIMESTAMPTZ NOT NULL,
  stop_betting_minutes INTEGER     NOT NULL DEFAULT 10,
  status               TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'done')),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bets (
  id             BIGSERIAL   PRIMARY KEY,
  ticket_id      TEXT        NOT NULL,
  agent_id       UUID        NOT NULL REFERENCES users(id),
  lottery_id     UUID        NOT NULL REFERENCES lotteries(id),
  type           TEXT        NOT NULL CHECK (type IN ('A', 'B', 'C', 'AB', 'BC', 'AC')),
  number         INTEGER     NOT NULL,
  count          INTEGER     NOT NULL CHECK (count > 0),
  tab            INTEGER     NOT NULL CHECK (tab IN (1, 2, 3)),
  amount         NUMERIC     NOT NULL DEFAULT 0,
  win_amount     NUMERIC     NOT NULL DEFAULT 0,
  customer_name  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_id      UUID        NOT NULL REFERENCES lotteries(id),
  winning_number  INTEGER     NOT NULL CHECK (winning_number >= 0 AND winning_number <= 999),
  declared_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bets_agent_id      ON bets(agent_id);
CREATE INDEX IF NOT EXISTS idx_bets_lottery_id    ON bets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at    ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_lottery_id ON results(lottery_id);
