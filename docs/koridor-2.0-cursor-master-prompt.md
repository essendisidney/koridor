# Koridor 2.0 — Cursor Master Prompt

**Use this as the standing instruction for every Koridor 2.0 implementation session.**  
Paste the block under **MASTER PROMPT** into Cursor. Keep this file as source of truth alongside [`koridor-2.0-rebuild-spec.md`](./koridor-2.0-rebuild-spec.md) and [`koridor-2.0-build-prompts.md`](./koridor-2.0-build-prompts.md).

---

## MASTER PROMPT (copy into Cursor)

```text
You are upgrading Koridor (apps/web on Vercel + Supabase Postgres + Prisma) from a supply-led trade OS into Koridor 2.0: demand-led agricultural procurement infrastructure.

PRODUCT LOGIC (non-negotiable)
- OLD: supplier lists → buyer searches → contact.
- NEW: buyer demand enters → Koridor discovers/aggregates supply → verify both sides → match → RFQ → negotiate → contract → coordinate trade → permanent Trade Passport + history.
- Buyer is the demand engine. Key object is BUYING REQUIREMENT (BuyerRequirement / KR-…), not a listing.
- Koridor is an ORCHESTRATION LAYER. Do not take title to goods. Do not build owned logistics, lending, warehouses, or payments rails in V1.
- Tagline: The world's demand. Africa's supply. One Koridor.
- Wedge: Kenya → GCC first (AE, SA, OM), then Europe + Asia. Do not launch “all Africa” UI.
- First commodities: avocado, macadamia, coffee, mango, fresh vegetables.
- Compete on verified demand + aggregation + trade workflow — not catalogue size vs Selina/Alibaba.

REBUILD RULES
1. Evolve apps/web IN PLACE. Live: https://koridor-psi.vercel.app — do not greenfield a second app.
2. NEVER destroy working auth, JWT, Trade Passport, RFQ/Offer/Contract, verification, finance/logistics/compliance modules. Extend and link them.
3. DATABASE → API → BUSINESS LOGIC → UI. Never invent schema while drawing screens. Schema changes go in BOTH apps/web/prisma/schema.prisma AND apps/api/prisma/schema.prisma, then prisma generate / db push.
4. Keep JWT auth (auth-server.ts). No Supabase Auth migration in V1. Server-side permissions via existing Permission/org-access. RLS for partners is later.
5. Deterministic matching first (lib/matching.ts). Explain scores. Hard filters (e.g. required certs) must fail closed — AI must not override commercial constraints.
6. Dual UX: buyer desktop-dense; supplier mobile-simple. No classifieds (“WhatsApp me”, “price negotiable”).
7. Work in PHASES below. One PR-sized slice per session. Do not implement Market Intelligence Pro, WhatsApp bot, finance products, or 50-country onboarding until V1 loop ships.

ALREADY BUILT (reuse — audit before rewriting)
- Docs: docs/koridor-2.0-rebuild-spec.md, docs/koridor-2.0-build-prompts.md
- Schema: BuyerRequirement, SupplyLot, RequirementMatch, Deal, DealMessage; Rfq.requirementId
- Matching: apps/web/src/lib/matching.ts (score + aggregate + landed cost)
- APIs: /api/v1/requirements, /requirements/[id], /supply-lots, /deals, /deals/[id]
- UI: /discover; /dashboard/requirements(+/new+/[id]+/matches); /supply; /demand; /deals; shell Buy/Supply/Deals/Trade; landing demand CTA; Control Tower lite on /dashboard/admin
- Seed: apps/web/scripts/seed-koridor-2-demand.cjs (KR-000001/2 + KR-KE-AVO-000001)
- Corridors widened: WORLD_BUYER_DESTINATIONS in lib/corridors.ts
- Existing spine: Rfq, Offer, Contract, Trade Passport (trade-passport.ts), journey, kenya directory, KYB

CORE OBJECTS
1) BuyerRequirement — structured commercial demand (not a chat message).
2) SupplyLot — declared/verified exportable capacity.
3) Match — scored Requirement ↔ Lot (and/or supplier org).
4) Rfq / Offer — commercial solicitation (existing tables; RFQ hangs off requirementId).
5) Deal + DealMessage — private room after agreement path.
6) Contract + Trade (Passport) — execution spine (existing).

STATUS VOCABULARY (enums only — no free-text statuses)
Requirement (Prisma RequirementStatus — map UI labels):
  DRAFT | PUBLISHED(=ACTIVE) | MATCHING | RFQ_OPEN | PARTIALLY_FILLED | FILLED
  | CLOSED | CANCELLED
  (NEGOTIATING/AWARDED/CONTRACT_* are Deal/Contract/Trade statuses — do not overload Requirement)
SupplyLot: DECLARED | VERIFIED | EXPORT_ELIGIBLE | CONTRACTED | IN_PRODUCTION | INSPECTED | IN_TRANSIT | DELIVERED
Match: SUGGESTED | SELECTED | RFQ_SENT | OFFERED | ACCEPTED | REJECTED
Deal: PENDING_CONTRACT | ACTIVE | IN_FULFILMENT | COMPLETED | CANCELLED | DISPUTED
Reuse existing RfqStatus / OfferStatus / ContractStatus / TradeStatus.

MATCHING (deterministic)
Weights: product 25, quantity 20 (or 15+qtyFit), quality/certs 15, delivery window 15/10, origin 10/5, trust 10, destination/history 5–10.
Hard filter: required certifications with zero overlap → exclude (score 0 / no match).
Always return reasons[]. Aggregation packs lots until requirement qty met; UI shows matched/gap/FULLY SOURCED.
Partial matches are first-class.

EVENTS (emit via Activity/AuditLog or TradeEvent where appropriate; do not invent a second event bus yet)
REQUIREMENT_CREATED, REQUIREMENT_MATCHED, RFQ_CREATED, OFFER_SUBMITTED, OFFER_UPDATED,
OFFER_ACCEPTED, DEAL_CREATED, CONTRACT_SIGNED, DOCUMENT_UPLOADED, TRADE_COMPLETED
(Inspection/shipment/payment events already exist in compliance/logistics modules — link from Deal Room.)

IA / ROUTES
Public: / (demand-first hero), /discover (Demand|Supply|Opportunities|Markets), /start, /kenya, /cropchain
App: Home /dashboard; Buy requirements+rfqs; Supply supply+demand; Deals deals+contracts; Trade trade+logistics+compliance; Capital→finance; Intelligence→analytics stub; Account setup; Admin Control Tower
Primary CTA everywhere for buyers: Post Buying Requirement → /dashboard/requirements/new

NORTH STAR / METRICS (instrument later; do not fake dashboards)
Verified Trade Value, Verified Demand value, Match rate, Requirement→Trade conversion. Not vanity registrations.

PHASE ORDER (execute in order; stop at phase boundary unless told to continue)
P1 Audit — map live routes vs this prompt; list reuse vs gaps; do not delete.
P2 Schema — only additive migrations; sync dual Prisma; no invented tables in UI PRs.
P3 Design system — existing CSS variables; navy/trust B2B; no NGO/Alibaba clone.
P4 Onboarding — progressive Buy/Sell/Services; keep org+KYB.
P5 Buyer — requirement wizard, detail, matches+aggregate, dashboard procurement metrics.
P6 Supplier — supply lots, demand feed, mobile-simple forms.
P7 Matching — harden hard filters + explanations + aggregation UX.
P8 RFQ/Offers — requirementId wiring, offer versions trail, landed-cost compare.
P9 Deal Room — messages + structured terms → contract/passport links.
P10 Trade Passport — richer header/timeline; document checklist readiness.
P11 Control Tower — pipeline counts + exceptions (shortfall gaps).
P12 Market Intelligence — BACKLOG after V1 transactions.
P13 Testing/security — tsc, critical path manual, no secrets in client.
P14 Deploy — vercel prod from repo root; verify Requirement→Match→RFQ→Offer→Deal→Passport.

DoD FOR V1 DEMO
saudi@ / oman@ / exporter@ demo path: publish requirement → rematch → create RFQ → offer → accept → Deal Room → link Passport.
Typecheck passes. No broken existing dashboard modules.

When unsure: prefer linking existing modules over rebuilding. Prefer Kenya→GCC seed data over abstract fixtures.
```

---

## Architecture (for implementers)

```text
DATABASE (Prisma / Supabase Postgres)
        ↓
API (apps/web App Router /api/v1/*)
        ↓
BUSINESS LOGIC (matching.ts, trade-passport.ts, org-access, permissions)
        ↓
UI (dashboard + public discover/landing)
```

Stack stays: Next.js 15, Prisma, JWT, Supabase Postgres/Storage, Vercel.

**Koridor does not become the legal seller of goods in V1** — orchestration only.

---

## Schema (already in production DB after db push)

| Table | Role |
|-------|------|
| `buyer_requirements` | Demand record `KR-######` |
| `supply_lots` | Capacity `KR-KE-…` |
| `requirement_matches` | Scores + selection |
| `deals` / `deal_messages` | Deal Room |
| `rfqs.requirement_id` | Bridge to existing RFQ engine |
| Existing `offers`, `contracts`, `trades`, documents, trust | Execution |

Additive only. See Prisma models in `apps/web/prisma/schema.prisma`.

SQL reference copy: `apps/web/prisma/migrations/koridor_2_demand_engine.sql`.

---

## Matching algorithm (canonical)

```text
score =
  product compatibility     ~25
  quantity availability     ~15–20
  quality / certification   ~15  (HARD FAIL if required cert missing)
  delivery timing           ~10–15
  origin                    ~5–10
  supplier trust            ~10
  export / profile          ~5–10
```

Output: score, reasons[], quantityMatched.  
Aggregation: greedy by score until target qty; surface gap.

Landed cost (rules): product + packing 0.08 + inland 0.06 + port 0.04 + freight(dest) + insurance 0.02 — label as estimate.

---

## Roles & permissions (V1)

| Role | Access |
|------|--------|
| Buyer | Own requirements; matches; RFQ; offers compare; deals; passport as party |
| Supplier | Own lots; public demand; offers; deals; fulfil |
| Admin / SYSTEM_ADMIN | Control Tower; KYB; overrides with audit |
| Broker / Logistics / Inspector / Finance | Stubs only — use existing org types where present |

No partner RLS rewrite until partner portals.

---

## API surface (V1)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/v1/requirements` | List/create (`scope=public` for Discover) |
| GET/POST | `/api/v1/requirements/[id]` | Detail; actions: rematch, select, create_rfq |
| GET/POST | `/api/v1/supply-lots` | Supplier lots (`scope=public`) |
| GET/POST | `/api/v1/deals` | List/create from offer |
| GET/POST | `/api/v1/deals/[id]` | Room; message; link contract/trade |
| Existing | `/api/v1/rfqs`, offers, contracts, trades | Execution spine |

---

## UI routes (V1)

| Route | Purpose |
|-------|---------|
| `/` | Demand-first hero + Post Requirement |
| `/discover` | Demand / Supply / Opportunities / Markets |
| `/dashboard/requirements` | Buyer demand command |
| `/dashboard/requirements/new` | Wizard |
| `/dashboard/requirements/[id]/matches` | Money screen |
| `/dashboard/supply` | Declare lots |
| `/dashboard/demand` | Buyers looking for you |
| `/dashboard/deals/[id]` | Deal Room |
| `/dashboard/rfqs/[id]` | Offers + landed cost → Deal |
| `/dashboard/admin` | Control Tower lite |
| Existing trade/finance/logistics | Linked from Deal Room |

---

## Seed & demo accounts

```bash
cd apps/web
node scripts/seed-gulf-buyers.cjs      # if GCC buyers missing
node scripts/seed-koridor-2-demand.cjs
```

| Account | Role |
|---------|------|
| `saudi@demo.koridor.io` / Demo123! | GCC buyer + KR-000001 |
| `oman@demo.koridor.io` / Demo123! | GCC buyer |
| `exporter@demo.koridor.io` / Demo123! | Kenya supply lot |

---

## Phased Cursor slices (resume from current state)

| Phase | Status | Next work |
|-------|--------|-----------|
| P1–P11 V1 spine | **Mostly landed in tree** | Harden hard-cert filters; buyer procurement metrics; offer version trail; document checklist on Passport; exception shortfalls in Control Tower |
| P12 Intelligence | Not started | After real transactions |
| P13 Tests | Partial | `tsc`; manual KR→Passport path |
| P14 Deploy | Pending | `npx vercel --prod --yes` from repo root |

---

## Explicit non-goals (until after V1)

- Owned payments / logistics / lending / inventory
- WhatsApp bot as primary interface (notifications later)
- Supabase Auth migration
- Full RLS partner model
- Market Intelligence SaaS / Selina-scale catalogue
- Africa-wide multi-origin aggregation UI
- Blockchain / tokens / principal trading

---

## Revenue note (product, not code)

Prioritize **transactions** over early subscriptions. Instrument Verified Trade Value. Fee model configurable later — do not hard-code commercial %.

---

## How to start the next Cursor session

1. Paste **MASTER PROMPT** above.  
2. Say: “Continue Phase 7–9 hardening: hard-cert filters, offer audit trail, Deal Room structured terms, then deploy.”  
3. Or: “Deploy current Koridor 2.0 branch to production and verify the demo loop.”
