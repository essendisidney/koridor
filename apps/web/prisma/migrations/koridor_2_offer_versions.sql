-- Koridor 2.0 — immutable offer version trail (additive)

ALTER TABLE offers ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS offer_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  unit_price DECIMAL(18, 4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  quantity DECIMAL(18, 4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'MT',
  incoterm TEXT,
  lead_time_days INTEGER,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id UUID NOT NULL,
  UNIQUE (offer_id, version)
);

CREATE INDEX IF NOT EXISTS offer_versions_offer_id_idx ON offer_versions(offer_id);

-- Backfill v1 snapshots for existing offers
INSERT INTO offer_versions (
  offer_id,
  version,
  unit_price,
  currency,
  quantity,
  unit,
  incoterm,
  lead_time_days,
  valid_until,
  notes,
  created_at,
  created_by_id
)
SELECT
  o.id,
  1,
  o.unit_price,
  o.currency,
  o.quantity,
  o.unit,
  o.incoterm,
  o.lead_time_days,
  o.valid_until,
  o.notes,
  o.created_at,
  o.created_by_id
FROM offers o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM offer_versions v WHERE v.offer_id = o.id AND v.version = 1
  );
