CREATE TABLE IF NOT EXISTS rounds (
  round_id TEXT PRIMARY KEY,
  status TEXT,
  roll INTEGER,
  result_color TEXT,
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_red_bet NUMERIC(18,2),
  total_black_bet NUMERIC(18,2),
  total_white_bet NUMERIC(18,2),
  total_bet NUMERIC(18,2),
  house_red NUMERIC(18,2),
  house_black NUMERIC(18,2),
  house_white NUMERIC(18,2),
  favorite_color TEXT,
  favorite_value NUMERIC(18,2),
  financial_difference NUMERIC(18,2),
  finalized BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(round_id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT,
  total_red_bet NUMERIC(18,2) NOT NULL,
  total_black_bet NUMERIC(18,2) NOT NULL,
  total_white_bet NUMERIC(18,2) NOT NULL,
  total_bet NUMERIC(18,2) NOT NULL,
  house_red NUMERIC(18,2) NOT NULL,
  house_black NUMERIC(18,2) NOT NULL,
  house_white NUMERIC(18,2) NOT NULL,
  favorite_color TEXT NOT NULL,
  favorite_value NUMERIC(18,2) NOT NULL,
  financial_difference NUMERIC(18,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_round_time
  ON snapshots(round_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_rounds_closed_at
  ON rounds(closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_rounds_finalized
  ON rounds(finalized, last_seen_at DESC);
