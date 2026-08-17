# Koridor

**The operating system for cross-border trade.**

Koridor is infrastructure — not a marketplace, not a bank, not a logistics company. It connects producers, cooperatives, exporters, buyers, banks, insurers, logistics providers, and governments into one trusted digital ecosystem.

## Phase 1 — Foundation (shipped)

Usable vertical slice:

- Landing page
- Authentication (JWT + refresh tokens, RBAC, MFA-ready fields)
- Organisation registration
- User registration & role assignment
- Dashboard
- Settings
- Notifications
- Audit logs
- Activity timeline

## Phase 2 — Trust Engine (shipped)

- KYB verification cases + admin review queue
- Member KYC submission
- Document upload (Supabase Storage bucket `org-documents`)
- Deterministic trust score (0–100)
- Farmer / Cooperative / Exporter / Buyer registry listings
- Organisation contacts on profiles

## Phase 3 — Trade Engine (shipped)

- RFQs (draft / publish / close)
- Offers (submit / accept / reject)
- Contracts formed on acceptance + dual signature
- Milestones, escrow requests, shipment requests
- Trade timeline events

## Stage 3.5 — Trade Orchestration (shipped)

- Canonical **Trade Passport** as parent hub for living trades
- Lifecycle states, milestone + evidence engines
- Readiness & completion scores
- Unified Trade Workspace (`/dashboard/trades/[id]`)

## Phase 4 — Finance Engine (shipped)

- Organisation wallets (available + held balances)
- Ledger entries (top-up, escrow hold/release)
- Escrow accounts linked to trade escrow requests (open → fund → release)

## Phase 5 — Compliance (shipped)

- Certificate types (COO, export permit, packing list, invoice, inspection, Halal, …)
- Document generator (structured printable payload)
- Expiry tracking dashboard
- Government / chamber approval workflow

## Phase 6 — Logistics (shipped)

- Shipments from trade shipment requests
- Tracking timeline events
- Proof of delivery

## Phase 7 — Analytics (shipped)

- Live trade / risk / corridor / commodity dashboards
- Daily snapshot rollups (`analytics_snapshots`, corridor & commodity stats)
- Org-scoped by default; platform-wide for admins

## Phase 8 — AI (shipped)

- Heuristic document analysis + trade risk scoring
- Ops assistant (optional OpenAI via `OPENAI_API_KEY`)
- `AiJob` / `AiInsight` persistence when tables are migrated

## Phase 9 — Administration (shipped)

- Feature flags + health checks
- Admin overview (`/dashboard/admin`) for system admins

## Integrations (shipped)

- Payments adapter: demo / Stripe Checkout + webhook / M-Pesa-ready
- Carriers adapter: manual / AfterShip book + sync tracking
- See [`docs/integrations.md`](./docs/integrations.md)

## Bankability & trade credit (shipped)

- **Bankability dossier** (`/dashboard/bankability`) — lender-facing score from identity, trade performance, escrow settlement, logistics
- **In-kind trade credit** on Finance — limit from bankability; issue supplier credit (goods/inputs, not cash); settle post-delivery
- Migration: [`docs/migrations/20260730_bankability_trade_credit.sql`](./docs/migrations/20260730_bankability_trade_credit.sql)

## Kenya → Oman / Saudi Arabia / Iran / Iraq (shipped)

- Public corridor: `/kenya` — buyers in Oman, Saudi Arabia, Iran, and Iraq RFQ Kenyan farm produce
- Register as **Buyer** with country OM / SA / IR / IQ; Kenyan farms register origin KE
- Registry filters by Kenya origin and Gulf export markets
- Produce presets (avocado, tea, coffee, macadamia) on RFQs and Trade Passports
- **CropChain Africa** (`/cropchain`) — order-first GCC food security program on Koridor
- **Executable corridor** tests on each Trade Passport (trust, rules, events, finance)

## Architecture

```
koridor/
├── apps/
│   ├── api/          NestJS + Prisma + PostgreSQL
│   └── web/          Next.js + Tailwind
├── packages/
│   └── shared/       Shared types, roles, permissions
├── docs/
├── docker-compose.yml
└── .github/workflows/
```

**Principles:** API-first, modular domains, soft deletes, audit on mutations, clean architecture.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project (Postgres) — see [`docs/supabase.md`](./docs/supabase.md)
- Optional: Docker for local Redis / Mailpit only

## Quick start

```bash
# 1. Install
pnpm install

# 2. Environment — paste Supabase DATABASE_URL + DIRECT_URL
cp .env.example .env

# 3. Shared package + Prisma client
pnpm --filter @koridor/shared build
pnpm --filter @koridor/api prisma:generate

# 4. Seed (if not already applied remotely)
pnpm db:seed

# 5. Run
pnpm dev
```

Schema for project `koridor` (`qfptnyifzdwmuxfkgpmv`) is already applied on Supabase with RLS enabled.

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/docs |
| Mailpit | http://localhost:8025 |
| MinIO | http://localhost:9001 |

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@koridor.io` | `Admin123!` | System Admin |
| `exporter@demo.koridor.io` | `Demo123!` | Exporter |
| `buyer@demo.koridor.io` | `Demo123!` | Buyer |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + web |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm docker:up` | Start Postgres, Redis, MinIO, Mailpit |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed demo data |

## Phase roadmap

1. **Foundation** — auth, orgs, RBAC, dashboard, audit *(shipped)*
2. **Trust Engine** — KYB/KYC, registries, trust score *(shipped)*
3. **Trade Engine** — RFQs, contracts, milestones *(shipped)*
4. **Finance Engine** — wallets, escrow, ledger *(shipped)*
5. **Compliance** — certificates, government workflows *(shipped)*
6. **Logistics** — shipping, tracking, PoD *(shipped)*
7. **Analytics** — trade / risk dashboards *(shipped)*
8. **AI** — assistant, document analysis *(shipped)*
9. **Administration** — feature flags, monitoring *(shipped)*

## Documentation

See [`docs/`](./docs/) for architecture notes, ER overview, and deployment guide.
