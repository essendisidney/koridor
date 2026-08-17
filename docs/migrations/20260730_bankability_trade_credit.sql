-- Bankability fields + in-kind trade credit facility
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'BANKABILITY_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'TRADE_CREDIT_DRAWN';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'TRADE_CREDIT_SETTLED';
ALTER TYPE "LedgerEntryKind" ADD VALUE IF NOT EXISTS 'CREDIT_DRAW';
ALTER TYPE "LedgerEntryKind" ADD VALUE IF NOT EXISTS 'CREDIT_SETTLE';

ALTER TABLE trust_profiles ADD COLUMN IF NOT EXISTS bankability_score INT NOT NULL DEFAULT 0;
ALTER TABLE trust_profiles ADD COLUMN IF NOT EXISTS bankability_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE trust_profiles ADD COLUMN IF NOT EXISTS suggested_credit_limit DECIMAL(18, 4) NOT NULL DEFAULT 0;
ALTER TABLE trust_profiles ADD COLUMN IF NOT EXISTS bankability_scored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS trust_profiles_bankability_score_idx
  ON trust_profiles(bankability_score);

CREATE TABLE IF NOT EXISTS trade_credit_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  limit_amount DECIMAL(18, 4) NOT NULL DEFAULT 0,
  drawn_amount DECIMAL(18, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  bankability_score INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS trade_credit_facilities_status_idx
  ON trade_credit_facilities(status);
CREATE INDEX IF NOT EXISTS trade_credit_facilities_deleted_idx
  ON trade_credit_facilities(deleted_at);
ALTER TABLE trade_credit_facilities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS trade_credit_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES trade_credit_facilities(id) ON DELETE CASCADE,
  supplier_org_id UUID NOT NULL REFERENCES organisations(id),
  trade_id UUID,
  reference TEXT NOT NULL UNIQUE,
  amount DECIMAL(18, 4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'OPEN',
  description TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS trade_credit_draws_facility_idx ON trade_credit_draws(facility_id);
CREATE INDEX IF NOT EXISTS trade_credit_draws_supplier_idx ON trade_credit_draws(supplier_org_id);
CREATE INDEX IF NOT EXISTS trade_credit_draws_trade_idx ON trade_credit_draws(trade_id);
CREATE INDEX IF NOT EXISTS trade_credit_draws_status_idx ON trade_credit_draws(status);
CREATE INDEX IF NOT EXISTS trade_credit_draws_deleted_idx ON trade_credit_draws(deleted_at);
ALTER TABLE trade_credit_draws ENABLE ROW LEVEL SECURITY;
