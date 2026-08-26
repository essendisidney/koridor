# Koridor 2.0 — Cursor Build Prompt Pack

**Primary instruction:** use [`koridor-2.0-cursor-master-prompt.md`](koridor-2.0-cursor-master-prompt.md) (full Master Prompt + architecture + phases).  
Also read [`koridor-2.0-rebuild-spec.md`](koridor-2.0-rebuild-spec.md). Evolve `apps/web` in place. Keep JWT auth + Prisma. Sync both Prisma schemas when changing models.

## Master prompt (short form — prefer full file)

```text
See docs/koridor-2.0-cursor-master-prompt.md MASTER PROMPT.
Demand-led: BuyerRequirement → Match/Aggregate → RFQ → Offer → Deal → Contract → Trade Passport.
Orchestration only (no title to goods). Kenya→GCC wedge. Preserve existing Passport/RFQ/auth.
```

---

## S0 — Spec + IA / corridor widen

- Confirm docs exist.
- Expand `apps/web/src/lib/corridors.ts`: WORLD_BUYER_DESTINATIONS, FEATURED_CORRIDORS for AE/SA/OM/NL/UK/IN.
- Restructure `shell.tsx` nav: Home, Discover, Buy, Supply, Deals, Trade, Capital, Intelligence, Account; Control Tower for admin.
- Soften landing eyebrow to Kenya → world.

## S1 — Schema

Add enums + models: BuyerRequirement, SupplyLot, RequirementMatch, Deal, DealMessage.  
Extend Rfq with `requirementId`. Sync API schema. `prisma generate`. Apply via `db push` or SQL.

## S2 — Public home demand-first

Landing: tagline, Post Requirement CTA, live published requirements strip (API).

## S3 — Post Requirement wizard

`/dashboard/requirements/new` + API CRUD. Set `verifiedDemand` from org verification.

## S4 — Matches + aggregation

`lib/matching.ts` + `/dashboard/requirements/[id]/matches` + rematch API.

## S5 — RFQ from matches

POST create RFQ with requirementId for selected suppliers (open RFQ; notify via existing open scope).

## S6 — Offer compare + landed cost

Enhance RFQ detail with landed-cost helper.

## S7 — Deal Room

Create Deal on offer accept (or explicit action). Messages + tabs linking contract/passport.

## S8 — Supplier demand + supply lots

`/dashboard/demand`, `/dashboard/supply`, supply lot CRUD.

## S9 — Control Tower lite

Admin dashboard cards: requirements, RFQs, deals, exceptions stub.

## S10 — Seed + deploy

Seed Kenya lots + world buyer requirements. Deploy production. Verify loop.

---

## Slice checklist

| Slice | Done when |
|-------|-----------|
| S0 | Nav groups + wider corridors live |
| S1 | Prisma client has new models |
| S2 | `/` shows demand CTA + feed |
| S3 | Buyer can publish KR-… |
| S4 | Matches show aggregate fill |
| S5 | RFQ linked to requirement |
| S6 | Landed cost column visible |
| S7 | Deal Room messages work |
| S8 | Supplier sees demand matches |
| S9 | Admin sees pipeline counts |
| S10 | Demo accounts complete one path |
