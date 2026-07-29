-- Stage 8 AI + Stage 9 Administration
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID,
  trade_id UUID,
  document_id UUID,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  prompt TEXT,
  input JSONB,
  result JSONB,
  error TEXT,
  model TEXT DEFAULT 'koridor-heuristic-v1',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_jobs_org_idx ON ai_jobs(organisation_id);
CREATE INDEX IF NOT EXISTS ai_jobs_trade_idx ON ai_jobs(trade_id);
CREATE INDEX IF NOT EXISTS ai_jobs_type_idx ON ai_jobs(type);
CREATE INDEX IF NOT EXISTS ai_jobs_status_idx ON ai_jobs(status);
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  score INT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_insights_job_idx ON ai_insights(job_id);
CREATE INDEX IF NOT EXISTS ai_insights_kind_idx ON ai_insights(kind);
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  percentage INT NOT NULL DEFAULT 100,
  audience JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags(enabled);
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INT,
  detail JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS system_health_logs_service_idx ON system_health_logs(service);
CREATE INDEX IF NOT EXISTS system_health_logs_checked_idx ON system_health_logs(checked_at);
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
