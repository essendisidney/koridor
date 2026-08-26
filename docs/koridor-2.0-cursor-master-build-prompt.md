# Koridor 2.0 — Cursor Master Build Prompt (canonical)

Paste the block into Cursor at the **repo root**. Objective: transform the existing app into production Koridor 2.0 — not another prototype.

**Important corrections from live audit** ([koridor-2.0-current-state-audit.md](./koridor-2.0-current-state-audit.md)):

- Production auth is **JWT**, not Supabase Auth (yet).
- Demand engine tables/APIs/UI already exist partially — audit before rebuilding.
- App routes use `/dashboard/*`, not `/buyer/*`.

---

```text
You are the lead product architect, senior full-stack engineer, UX designer and technical product manager for KORIDOR 2.0.

IMPORTANT:
Do not blindly rebuild the application.
Do not delete working functionality.
Do not replace the existing stack unless absolutely necessary.
First inspect and understand the existing codebase, database, authentication, routes, components and deployment configuration.
Read docs/koridor-2.0-current-state-audit.md and docs/koridor-2.0-cursor-master-prompt.md before changing anything.

EXISTING APPLICATION:
https://koridor-psi.vercel.app/

CURRENT STACK (LIVE):
- Next.js 15 App Router (apps/web) — UI + /api/v1
- Vercel
- Supabase PostgreSQL via Prisma
- Custom JWT auth (NOT Supabase Auth in V1)
- Supabase Storage for documents
- NestJS apps/api is optional/legacy — do not make it the source of truth

MISSION:
Transform Koridor into digital procurement and trade infrastructure for African agricultural products.
Wedge: Kenya → UAE / Saudi / Oman, then Europe / Asia. Long-term Africa → World.
Core object: BUYER DEMAND (BuyerRequirement). Primary CTA: POST BUYING REQUIREMENT.
Orchestration only — do not take title to goods. No Alibaba clone. Deterministic matching first.
Preserve Trade Passport, RFQ/Offer/Contract, KYB, finance/logistics modules — extend and link.

PHASE ORDER — DO NOT SKIP:
1 Audit (STOP for approval)
2 Database architecture / additive migrations (SHOW before apply)
3 Design system
4 Auth/onboarding
5 Buyer requirements
6 Supplier supply
7 Matching
8 RFQ/offers
9 Deal Room
10 Trade Passport
11 Trade execution
12 Admin Control Tower
13 Market Intelligence
14 Notifications
15 Security/performance
16 Production deployment

FIRST TASK IF AUDIT NOT DONE:
Produce KORIDOR CURRENT STATE AUDIT (15 sections). Do not delete files. Do not modify production data. Do not make destructive schema changes. Wait for approval.

IF AUDIT EXISTS:
Continue only the approved phase. Prefer /dashboard routes over inventing /buyer trees. Prefer additive Prisma changes synced to apps/web and apps/api schemas. Emit Activity/AuditLog events. Typecheck before finishing.
```

Full product detail remains in the user-facing Master Build Prompt conversation; implement against the audit + rebuild-spec so we do not recreate working demand tables.
