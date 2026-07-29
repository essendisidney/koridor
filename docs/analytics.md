# Analytics (Phase 7)

Live aggregation over Trade Passports, escrow, shipments, and certificates.

## Surfaces

- `GET /api/v1/analytics/overview?days=30&scope=org|global`
- `POST /api/v1/analytics/overview` with `{ action: "snapshot" | "history", scope?, days? }`
- Dashboard: `/dashboard/analytics`

## KPIs

- Trade counts (total / active / completed / cancelled / disputed)
- Trade value, avg risk / trust / completion
- Escrow volume, shipments booked/delivered, certs approved
- Volume trend (daily), corridor ranking, commodity mix, status mix

## Storage

Rollups can be persisted into:

- `analytics_snapshots`
- `corridor_stats`
- `commodity_stats`

Org-scoped by default; platform-wide for system admins.
