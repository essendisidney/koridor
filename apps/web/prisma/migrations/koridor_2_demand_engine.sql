-- Koridor 2.0 demand engine (apply on Supabase Postgres)
DO $$ BEGIN
  CREATE TYPE "RequirementFrequency" AS ENUM ('ONE_OFF', 'MONTHLY', 'QUARTERLY', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'MATCHING', 'RFQ_OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "SupplyLotStatus" AS ENUM ('DECLARED', 'VERIFIED', 'EXPORT_ELIGIBLE', 'CONTRACTED', 'IN_PRODUCTION', 'INSPECTED', 'IN_TRANSIT', 'DELIVERED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'SELECTED', 'RFQ_SENT', 'OFFERED', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DealStatus" AS ENUM ('PENDING_CONTRACT', 'ACTIVE', 'IN_FULFILMENT', 'COMPLETED', 'CANCELLED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS buyer_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  buyer_org_id uuid NOT NULL REFERENCES organisations(id),
  created_by_id uuid NOT NULL,
  commodity text NOT NULL,
  variety text,
  quantity numeric(18,4) NOT NULL,
  unit text NOT NULL DEFAULT 'MT',
  frequency "RequirementFrequency" NOT NULL DEFAULT 'ONE_OFF',
  delivery_start timestamp,
  delivery_end timestamp,
  destination_country char(2) NOT NULL,
  destination_city text,
  destination_port text,
  origin_preference char(2),
  grade text,
  size_spec text,
  certifications text[] NOT NULL DEFAULT '{}',
  packaging text,
  incoterm text,
  payment_terms text,
  currency char(3) NOT NULL DEFAULT 'USD',
  notes text,
  status "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
  verified_demand boolean NOT NULL DEFAULT false,
  matched_quantity numeric(18,4) NOT NULL DEFAULT 0,
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp
);

CREATE TABLE IF NOT EXISTS supply_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  supplier_org_id uuid NOT NULL REFERENCES organisations(id),
  created_by_id uuid NOT NULL,
  commodity text NOT NULL,
  variety text,
  origin_country char(2) NOT NULL,
  origin_region text,
  quantity numeric(18,4) NOT NULL,
  available_quantity numeric(18,4) NOT NULL,
  unit text NOT NULL DEFAULT 'MT',
  harvest_start timestamp,
  harvest_end timestamp,
  grade text,
  certifications text[] NOT NULL DEFAULT '{}',
  packaging text,
  status "SupplyLotStatus" NOT NULL DEFAULT 'DECLARED',
  notes text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp
);

CREATE TABLE IF NOT EXISTS requirement_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES buyer_requirements(id) ON DELETE CASCADE,
  supply_lot_id uuid REFERENCES supply_lots(id) ON DELETE SET NULL,
  supplier_org_id uuid NOT NULL REFERENCES organisations(id),
  score integer NOT NULL DEFAULT 0,
  available_qty numeric(18,4) NOT NULL,
  quantity_matched numeric(18,4) NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]',
  status "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
  selected_for_rfq boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp
);

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  requirement_id uuid REFERENCES buyer_requirements(id) ON DELETE SET NULL,
  rfq_id uuid REFERENCES rfqs(id) ON DELETE SET NULL,
  offer_id uuid UNIQUE REFERENCES offers(id) ON DELETE SET NULL,
  contract_id uuid UNIQUE REFERENCES contracts(id) ON DELETE SET NULL,
  trade_id uuid REFERENCES trades(id) ON DELETE SET NULL,
  buyer_org_id uuid NOT NULL REFERENCES organisations(id),
  seller_org_id uuid NOT NULL REFERENCES organisations(id),
  title text NOT NULL,
  commodity text NOT NULL,
  quantity numeric(18,4) NOT NULL,
  unit text NOT NULL DEFAULT 'MT',
  value numeric(18,4),
  currency char(3) NOT NULL DEFAULT 'USD',
  status "DealStatus" NOT NULL DEFAULT 'PENDING_CONTRACT',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp
);

CREATE TABLE IF NOT EXISTS deal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp
);

ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS requirement_id uuid;
DO $$ BEGIN
  ALTER TABLE rfqs ADD CONSTRAINT rfqs_requirement_id_fkey
    FOREIGN KEY (requirement_id) REFERENCES buyer_requirements(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
