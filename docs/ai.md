# AI (Phase 8)

Heuristic-first assistant with optional OpenAI enrichment.

## Surfaces

- `GET /api/v1/ai/jobs` — recent jobs for the org
- `POST /api/v1/ai/jobs` — `{ action: "assistant" | "score_trade" | "analyze_document", ... }`
- Dashboard: `/dashboard/ai`

## Capabilities

- **Document analysis** — status / missing fields / next actions
- **Trade risk** — verification, evidence gaps, escrow, shipment readiness; writes back `trade.riskScore`
- **Assistant Q&A** — ops guidance; uses `OPENAI_API_KEY` when present

## Storage

`ai_jobs` + `ai_insights` (see `docs/migrations/20260729_stage8_ai_stage9_admin.sql`). Persist is best-effort if tables are not migrated yet.
