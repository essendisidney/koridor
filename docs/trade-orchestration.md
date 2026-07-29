# Trade Orchestration — Stage 3.5

Koridor manages a **living trade**, not isolated documents, payments, or shipments.

## Trade Passport

Every transaction receives a unique Trade Passport (`Trade` model):

| Field | Notes |
|-------|--------|
| Trade ID / Number | UUID + `TRD-…` reference |
| Status | Canonical lifecycle state |
| Completion % | Milestone completion |
| Risk / Trust scores | Derived snapshots |
| Buyer / Supplier | Org FKs + participants graph |
| Commodity, qty, value | Commercial identity |
| Origin / Destination / Corridor | Route |
| Incoterms | Trade terms |
| Current stage | Human-readable stage label |
| Owner | Creating user |

RFQs, contracts, certificates attach via `tradeId`. Escrow and shipments remain on the contract and surface through the Trade Workspace.

## Lifecycle states

`DRAFT` → `PENDING_VERIFICATION` → `NEGOTIATION` → `CONTRACTED` → `IN_PRODUCTION` → `AWAITING_INSPECTION` → `AWAITING_COMPLIANCE` → `READY_TO_SHIP` → `IN_TRANSIT` → `AT_BORDER` → `DELIVERED` → `AWAITING_SETTLEMENT` → `COMPLETED`

Also: `CANCELLED`, `DISPUTED`.

## Engines

| Engine | Location |
|--------|----------|
| Milestone template + seeding | `apps/web/src/lib/trade-passport.ts` |
| Evidence attachment | `POST /api/v1/trades/[id]` `attach_evidence` |
| Readiness score | `computeReadiness` |
| Completion | `computeCompletion` / `recomputeTradeScores` |
| Timeline | `TradeEvent` with `tradeId` |

## APIs

- `GET/POST /api/v1/trades`
- `GET/POST /api/v1/trades/[id]` — actions: `advance`, `attach_evidence`, `complete_milestone`, `cancel`, `dispute`, `recompute`

Offer accept creates a Trade Passport + Contract and links both.

## Workspace

- `/dashboard/trade` — passport list + draft form
- `/dashboard/trades/[id]` — unified workspace (overview, readiness, parties, milestones, evidence, finance, logistics, compliance, timeline)

## Definition of Done (this slice)

- [x] Canonical Trade Passport
- [x] Standard lifecycle + statuses
- [x] Milestone engine
- [x] Evidence engine
- [x] Trade readiness score
- [x] Completion engine
- [x] Unified Trade Workspace
- [x] Trade graph via `TradeParticipant`
- [x] Digital twin sync from contract/escrow/shipment/KYB world state
