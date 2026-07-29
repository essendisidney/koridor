-- Stage 7 Analytics rollup tables
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date DATE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  total_trades INT NOT NULL DEFAULT 0,
  active_trades INT NOT NULL DEFAULT 0,
  completed_trades INT NOT NULL DEFAULT 0,
  cancelled_trades INT NOT NULL DEFAULT 0,
  disputed_trades INT NOT NULL DEFAULT 0,
  total_value_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  avg_readiness_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_completion_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_trust_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  new_orgs INT NOT NULL DEFAULT 0,
  verified_orgs INT NOT NULL DEFAULT 0,
  total_escrow_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  shipments_booked INT NOT NULL DEFAULT 0,
  shipments_delivered INT NOT NULL DEFAULT 0,
  certs_approved INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_date, scope)
);
CREATE INDEX IF NOT EXISTS analytics_snapshots_period_date_idx ON analytics_snapshots(period_date);
CREATE INDEX IF NOT EXISTS analytics_snapshots_scope_idx ON analytics_snapshots(scope);
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS corridor_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date DATE NOT NULL,
  corridor TEXT NOT NULL,
  origin_country CHAR(2) NOT NULL,
  destination_country CHAR(2) NOT NULL,
  trade_count INT NOT NULL DEFAULT 0,
  total_value_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  avg_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_date, corridor)
);
CREATE INDEX IF NOT EXISTS corridor_stats_period_date_idx ON corridor_stats(period_date);
CREATE INDEX IF NOT EXISTS corridor_stats_corridor_idx ON corridor_stats(corridor);
CREATE INDEX IF NOT EXISTS corridor_stats_origin_idx ON corridor_stats(origin_country);
CREATE INDEX IF NOT EXISTS corridor_stats_dest_idx ON corridor_stats(destination_country);
ALTER TABLE corridor_stats ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS commodity_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date DATE NOT NULL,
  commodity TEXT NOT NULL,
  trade_count INT NOT NULL DEFAULT 0,
  total_value_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  avg_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_date, commodity)
);
CREATE INDEX IF NOT EXISTS commodity_stats_period_date_idx ON commodity_stats(period_date);
CREATE INDEX IF NOT EXISTS commodity_stats_commodity_idx ON commodity_stats(commodity);
ALTER TABLE commodity_stats ENABLE ROW LEVEL SECURITY;
