# KORIDOR CURRENT STATE AUDIT

**Date:** 2026-08-26  
**Live app:** https://koridor-psi.vercel.app  
**Scope:** Phase 1 only — inspect, do not destroy.  
**Repo:** `d:\koridor` (pnpm monorepo)

This audit answers the First Task in the Cursor Master Build Prompt. **No destructive schema or UI changes follow until you approve Phase 2.**

---

## 1. Current architecture

| Layer | Reality |
|-------|---------|
| Monorepo | `apps/web` (Next.js 15), `apps/api` (NestJS 11, optional), `packages/shared` |
| **Production runtime** | **Next.js App Router** on Vercel — UI **and** `/api/v1/*` |
| Nest API | Thin/partial (auth, users, orgs, notifications…). Trade/finance/demand live in Next only |
| DB | Supabase **Postgres** via Prisma (`DATABASE_URL` + `DIRECT_URL`) |
| Storage | Supabase Storage (`org-documents`) via service role |
| Auth | **Custom JWT** (`jose` + bcrypt) — **not** Supabase Auth |
| Package manager | pnpm 9 + Turbo |
| Deploy | `npx vercel --prod` from repo root → `koridor-psi.vercel.app` |

**Correction to Master Prompt stack assumption:** treat “Supabase Auth” as aspirational/future. Current production auth is JWT in `apps/web/src/lib/auth-server.ts` + client `localStorage` (`koridor.auth`).

```text
Browser → same-origin /api/v1 → Prisma → Supabase Postgres
                ↓
         Storage signed URLs (service role)
```

---

## 2. Current routes

### Public
`/`, `/start`, `/discover`, `/kenya`, `/cropchain`, `/login`, `/register`, `/onboarding/organisation`

### App (under `/dashboard/*` — not `/buyer/*`)
| Area | Paths |
|------|--------|
| Home | `/dashboard` |
| Buy (2.0) | `/dashboard/requirements`, `/new`, `/[id]`, `/[id]/matches`, `/dashboard/rfqs` |
| Supply (2.0) | `/dashboard/supply`, `/dashboard/demand` |
| Deals (2.0) | `/dashboard/deals`, `/dashboard/deals/[id]` |
| Trade | `/dashboard/trade`, `/trades/[id]`, `/contracts`, `/logistics`, `/compliance` |
| Trust | `/verification`, `/trust`, `/registry`, `/documents`, `/reviews` |
| Capital / intel | `/finance`, `/bankability`, `/analytics`, `/ai` |
| Admin | `/dashboard/admin` (Control Tower lite) |

**IA note:** Spec proposes `/buyer/...`. Current tree uses shared `/dashboard/...` with role-aware journey. Prefer extending dashboard (preserve shell) over introducing parallel `/buyer` trees unless you explicitly want a split.

### API (`/api/v1`) — ~60 handlers
Auth, orgs, trust/KYC/registry/documents, **requirements / supply-lots / deals**, rfqs/offers/contracts/trades, finance, logistics, compliance, notifications, admin, journey, analytics, AI.

No Next `middleware.ts` — protection is per-route `requireUser` / permissions.

---

## 3. Current components

Small shared set; most UI is page-local:

- `components/dashboard/shell.tsx` — nav (Home/Discover/Buy/Supply/Deals/Trade/Capital/Intelligence/Account + Control Tower)
- `public-nav.tsx`, `path-cards.tsx`, `journey-stepper.tsx`, `session-cta.tsx`, `country-select.tsx`
- `ui/button`, `ui/input`, `ui/select`

**Missing vs Master Prompt component list:** `RequirementCard`, `MatchCard`, `OfferComparison`, `DealTimeline`, `DocumentChecklist`, etc. — extract as we harden, don’t invent duplicates.

Domain logic: `src/lib/*` (~30 modules).

---

## 4. Current database

**Single logical schema**, duplicated files:

- `apps/web/prisma/schema.prisma`
- `apps/api/prisma/schema.prisma` (kept in sync manually)

### Domains already present
| Domain | Models |
|--------|--------|
| Identity | User, UserRole, RefreshToken, UserSettings |
| Orgs | Organisation, OrganisationMember, Invite, OrgContact |
| Trust | TrustProfile, Document, KycProfile, VerificationCase/Event, RegistryProfile |
| **Demand 2.0** | **BuyerRequirement, SupplyLot, RequirementMatch, Deal, DealMessage** |
| Trade | Rfq (+ `requirementId`), Offer, Contract, Milestone, TradeEvent |
| Passport | Trade, TradeParticipant, TradeMilestone, TradeEvidence |
| Finance / logistics / compliance | Wallet, Ledger, Escrow, TradeCredit*, Shipment*, Compliance* |
| Ops | Notification, Activity, AuditLog, FeatureFlag, Analytics*, Ai* |

SQL helper: `apps/web/prisma/migrations/koridor_2_demand_engine.sql` (already applied via `db push`).

**Not present yet (Master Prompt asks for later):** standalone `certifications` table, `rfq_recipients`, `market_signals`, `market_opportunities`, `finance_requests` as first-class, `inspections` table (compliance exists differently), `trade_events` as unified bus (partial via Activity/TradeEvent).

---

## 5. Current authentication

| Item | Detail |
|------|--------|
| Register/login | `/api/v1/auth/*` |
| Tokens | Access + refresh JWT; refresh hashed in DB |
| Client storage | `localStorage` — XSS risk |
| Org membership | `pickPrimaryMembership` (VERIFIED+OWNER preferred) |
| RBAC | `SystemRole` + `Permission` in `lib/permissions.ts` |
| Roles present | SYSTEM_ADMIN, BUYER, EXPORTER, FARMER, COOPERATIVE, LOGISTICS, BANK, INSURANCE, GOV, CHAMBER |

**Gap vs Master Prompt roles:** no first-class BROKER / INSPECTOR / FINANCE_PARTNER / SUPER_ADMIN enums — map to existing org types + SYSTEM_ADMIN for now.

---

## 6. Current Trade Passport implementation

| Piece | Path |
|-------|------|
| Engine | `apps/web/src/lib/trade-passport.ts` |
| Completion | `corridor-completion.ts` |
| API | `/api/v1/trades`, `/trades/[id]` |
| Mint | Offer accept → Trade + Contract |
| UI | `/dashboard/trade`, `/dashboard/trades/[id]` |

**Preserve and extend.** Deal Room already links to Passport. Do not recreate.

Docs: `docs/trade-orchestration.md`.

---

## 7. Current marketplace / corridor functionality

| Surface | Behaviour |
|---------|-----------|
| Landing `/` | Demand-first hero (partially repositioned): Post requirement CTA |
| `/discover` | Tabs Demand / Supply / Opportunities / Markets |
| `/kenya` | SSR directory KE suppliers + Gulf buyers |
| `/cropchain` | Program marketing |
| Registry | Org listings, commodities, markets |
| RFQs | Open market + mine; offers; accept → contract/passport |
| Journey | Connect → Verify → Negotiate → Execute on `/dashboard` |

Still partly “corridor OS” + RFQ, not fully “procurement command centre” metrics.

---

## 8. Reusable functionality (preserve)

1. JWT auth + org membership + KYB/verification queues  
2. Trade Passport lifecycle + evidence  
3. RFQ / Offer / Contract  
4. Documents + Supabase Storage signed URLs  
5. Finance wallet/escrow/credit stubs  
6. Logistics shipments  
7. Compliance certificates/approvals  
8. TrustProfile + bankability  
9. AuditLog / Activity / Notifications  
10. Koridor 2.0 demand slice: matching, requirements APIs, Deal Room v0, seeds  

---

## 9. Technical debt

1. Dual Prisma schemas — sync risk  
2. Nest vs Next API divergence  
3. Permissions duplicated (shared package vs web lib)  
4. Tokens in `localStorage`; no middleware  
5. Root `db:*` scripts point at Nest app, not web  
6. Thin shared component library  
7. Offer version history not immutable trail yet  
8. Matching: hard-cert fail-closed incomplete  
9. Discover subroutes / buyer procurement metrics incomplete  
10. Uncommitted Koridor 2.0 work still on working tree (not all on `main` remote)

---

## 10. Security risks

| Risk | Severity | Notes |
|------|----------|--------|
| JWT in localStorage | Medium | Prefer httpOnly cookies later |
| Service role key server-only | OK if never `NEXT_PUBLIC_` | Verify deploy env |
| No route middleware | Medium | Rely on API auth; UI can flash |
| RLS | High gap vs Master Prompt | **Not** used for app tables today — app uses Prisma service connection. Introducing RLS without redesigning access layer is dangerous. Phase 2 should **not** enable blanket RLS until a dedicated security phase. |
| File uploads | Medium | Type/size limits need audit |
| Demo credentials on login page | Low | Intentional for demo |

---

## 11. Missing functionality (vs Master Build Prompt)

| Priority | Gap |
|----------|-----|
| P0 | Role-specific post-login home (buyer “what to source” / supplier “what buyers want” / admin “what needs attention”) |
| P0 | Hard-cert matching fail-closed + stronger explanations |
| P0 | Deploy + commit current 2.0 tree |
| P1 | Buyer procurement metrics dashboard |
| P1 | Offer immutable version trail; structured negotiation fields |
| P1 | Document checklist on Deal/Passport |
| P1 | Control Tower exceptions (shortfall, missing docs) |
| P2 | Certifications table; future demand/supply calendars |
| P2 | Market signals / opportunities / sourcing campaigns |
| P2 | Partner-scoped portals |
| P3 | Finance request orchestration UI |
| P3 | WhatsApp; NL demand extraction; Supabase Auth; RLS |

---

## 12. Recommended migration strategy

1. **Do not greenfield.** Continue in `apps/web`.  
2. **Do not rename** `BuyerRequirement` → `buying_requirements` Prisma model casually — already mapped to `buyer_requirements`. Align naming in docs only.  
3. **Do not introduce `/buyer` route tree** until dashboard IA is stable — map Master Prompt routes → existing `/dashboard/*`.  
4. **Keep JWT** for V1; schedule Auth/RLS as a later security phase.  
5. **Additive migrations only** for: certifications catalog, offer_versions, exception_alerts, market_signals (when approved).  
6. **Reuse** Rfq/Offer/Contract/Trade; deepen Deal Room tabs by linking, not cloning.  
7. **Commit + deploy** current 2.0 code before large Phase 2 DDL.  
8. Dual-schema: any Prisma change → copy web → api (or single source later).

---

## 13. Proposed Koridor 2.0 architecture (target)

```text
DEMAND GRAPH     SUPPLY GRAPH      TRADE GRAPH
BuyerRequirement SupplyLot         Deal → Contract → Trade Passport
       ↓              ↓                      ↓
            RequirementMatch
                    ↓
              Rfq → Offer → Deal Room
                    ↓
         Inspection / Logistics / Settlement (existing modules)
                    ↓
              Trade data → Intelligence (later)
```

**Stack stay:** Next.js + Prisma + JWT + Supabase Postgres/Storage + Vercel.  
**Principle:** orchestration layer (no title to goods).  
**Wedge:** Kenya → AE / SA / OM, then Europe / Asia.  
**North star:** Verified Trade Value.

---

## 14. Exact files recommended to **change** (next phases)

| File / area | Why |
|-------------|-----|
| `apps/web/src/app/dashboard/page.tsx` | Role-specific home (buyer/supplier/admin) |
| `apps/web/src/lib/matching.ts` | Hard filters |
| `apps/web/src/app/api/v1/requirements/**` | Publish/match hardening |
| `apps/web/src/app/dashboard/requirements/**` | Wizard polish, metrics |
| `apps/web/src/app/dashboard/deals/**` | Structured negotiation, tabs |
| `apps/web/src/app/dashboard/rfqs/[id]/page.tsx` | Offer versions / compare |
| `apps/web/src/app/dashboard/trades/[id]` | Document checklist + passport header |
| `apps/web/src/app/dashboard/admin/page.tsx` | Exceptions |
| `apps/web/src/app/page.tsx` | Live demand counters (real queries, demo-labelled if seed) |
| Prisma (both) | Only additive tables when Phase 2 approved |

---

## 15. Exact files / systems recommended to **preserve**

| Preserve | Path / system |
|----------|----------------|
| Auth | `lib/auth-server.ts`, `lib/auth.tsx`, `/api/v1/auth/*` |
| Membership picker | `lib/membership.ts`, `org-access.ts` |
| Trade Passport | `lib/trade-passport.ts`, trades APIs/UI |
| RFQ/Offer/Contract | existing routes + pages |
| Documents/Storage | `lib/supabase-server.ts`, documents API |
| Finance / logistics / compliance | existing dashboards |
| Verification / KYB | verification + reviews |
| Journey | `lib/journey.ts`, journey API |
| Kenya directory | `lib/kenya-directory.ts`, `/kenya` |
| Demand 2.0 core | BuyerRequirement, SupplyLot, Match, Deal models + APIs + matching.ts |
| Shell IA | Buy/Supply/Deals/Trade grouping |

**Do not delete:** Nest app, CropChain page, legacy RFQs without `requirementId`, demo seed accounts.

---

## Koridor 2.0 progress vs Master Prompt

| Master Prompt phase | Status |
|---------------------|--------|
| Phase 1 Audit | **This document** |
| Phase 2 Schema | Partial — demand tables exist; further DDL wait for approval |
| Phase 3 Design system | Partial — tokens exist; component kit thin |
| Phase 4 Auth/onboarding | Exists (JWT); progressive services roles incomplete |
| Phase 5 Buyer requirements | **Largely built** (wizard, list, detail, matches) |
| Phase 6 Supplier supply | **Basic built** (lots + demand feed) |
| Phase 7 Matching | **v0 built** — needs hard filters + tests |
| Phase 8 RFQ/offers | Wired from matches; version trail incomplete |
| Phase 9 Deal Room | **v0 built** |
| Phase 10 Trade Passport | **Exists** — enrich, don’t rebuild |
| Phase 11–16 | Mostly backlog |

---

## Immediate product recommendation (from your note)

After login, make home **role-specific**:

- **Buyer:** What are you looking to source? → Post Requirement  
- **Supplier:** What are buyers looking for? → Demand feed  
- **Admin:** What needs attention? → Control Tower exceptions  

That single change encodes Koridor 2.0 philosophy without a rewrite.

---

## STOP — awaiting approval

Per Master Prompt Phase 1:

1. No further destructive migrations.  
2. No mass file deletes.  
3. No Supabase Auth / blanket RLS cutover without a dedicated plan.  

**Approve one of:**

- **A)** Proceed Phase 2 — additive schema only (certifications, offer_versions, exceptions) + migration plan for review before apply  
- **B)** Skip to role-specific dashboard home + matching hard filters (no DDL)  
- **C)** Commit + deploy current 2.0 tree first, then continue  

Say A, B, or C.
