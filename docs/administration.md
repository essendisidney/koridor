# Administration (Phase 9)

System-admin feature flags and health monitoring.

## Surfaces

- `GET /api/v1/admin?view=overview|flags|health|health_logs`
- `POST /api/v1/admin` — `{ action: "upsert_flag" | "health_check", ... }`
- Dashboard: `/dashboard/admin` (SYSTEM_ADMIN)

## Defaults

Flags fall back in-memory when `feature_flags` is not migrated:

- `analytics_v1`, `ai_assistant_v1`, `strict_evidence`, `finance_escrow`

## Health

Checks database connectivity, web process, and OpenAI config; optionally writes `system_health_logs`.
