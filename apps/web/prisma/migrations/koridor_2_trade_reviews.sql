-- Koridor 2.0 — two-sided post-trade reviews (additive)

CREATE TABLE IF NOT EXISTS trade_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  reviewer_org_id UUID NOT NULL REFERENCES organisations(id),
  reviewee_org_id UUID NOT NULL REFERENCES organisations(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  on_time_score INTEGER CHECK (on_time_score BETWEEN 1 AND 5),
  documentation_score INTEGER CHECK (documentation_score BETWEEN 1 AND 5),
  payment_score INTEGER CHECK (payment_score BETWEEN 1 AND 5),
  comment TEXT,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_id, reviewer_org_id),
  CHECK (reviewer_org_id <> reviewee_org_id)
);

CREATE INDEX IF NOT EXISTS trade_reviews_reviewee_org_id_idx ON trade_reviews(reviewee_org_id);
