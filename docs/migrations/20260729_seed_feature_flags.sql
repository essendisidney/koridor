-- Seed default feature flags (idempotent)
INSERT INTO feature_flags (id, key, name, description, enabled, percentage, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'analytics_v1', 'Analytics dashboard', 'Trade / corridor / risk analytics UI', true, 100, NOW(), NOW()),
  (gen_random_uuid(), 'ai_assistant_v1', 'AI assistant', 'Heuristic + optional OpenAI assistant', true, 100, NOW(), NOW()),
  (gen_random_uuid(), 'strict_evidence', 'Strict evidence mode', 'Gate milestone completion on TradeEvidence', true, 100, NOW(), NOW()),
  (gen_random_uuid(), 'finance_escrow', 'Finance escrow', 'Wallet hold/release escrow flows', true, 100, NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  deleted_at = NULL,
  updated_at = NOW();
