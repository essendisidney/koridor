# Koridor 2.0 — Screen-by-Screen Rebuild Spec

> **The world's demand. Africa's supply. One Koridor.**

Koridor lets verified global buyers specify what African agricultural products they need, then finds, aggregates, verifies, contracts, and coordinates supply through delivery.

**Key object:** `BuyerRequirement` (`KR-…`), not a listing.  
**Legal posture (V1):** orchestration layer — Koridor does **not** take title to goods.  
**North star metric:** Verified Trade Value (executed USD), not registrations.  
**Rebuild mode:** Evolve `apps/web` in place. Do not greenfield.  
**Stack:** Next.js App Router APIs + Prisma + JWT auth + Supabase Postgres. No Supabase Auth migration in V1.

**Cursor instruction pack:** [`koridor-2.0-cursor-master-prompt.md`](./koridor-2.0-cursor-master-prompt.md)

---

## 1. Positioning

| Compete on | Do not compete on |
|------------|-------------------|
| Verified Demand | Catalogue size (Selina) |
| Supply aggregation | Generic listings |
| Future offtake path | Owned logistics/finance |
| Trade Passport execution | Classifieds / WhatsApp leads |
| Africa export procurement wedge | 50-country day-one launch |

**Wedge:** Kenya → GCC + Europe + Asia. Product story: Africa → World.

**First corridors:** KE→AE, KE→SA, KE→OM, KE→NL, KE→UK, KE→IN (retain IR/IQ).  
**First commodities:** Avocado, coffee, macadamia, mango, vegetables.

---

## 2. Core loop

```text
BUYER NEEDS → POST REQUIREMENT → MATCH + AGGREGATE → RFQ → OFFERS
→ NEGOTIATE → DEAL → CONTRACT → TRADE PASSPORT → SETTLE → DATA
```

If a feature does not support this loop, it is out of V1.

---

## 3. Information architecture

### Public

| Route | Purpose |
|-------|---------|
| `/` | Demand-first home: search + Post Requirement + live demand |
| `/discover` | Demand \| Supply \| Opportunities \| Markets |
| `/discover/demand` | Global buying requirements |
| `/discover/supply` | Verified African supply lots |
| `/kenya` | Featured origin corridor (not whole product identity) |
| `/cropchain` | Program page |
| `/start`, `/login`, `/register` | Auth |

### App (authenticated)

| Nav | Routes |
|-----|--------|
| Home | `/dashboard` |
| Discover | `/discover` (also public) |
| Buy | `/dashboard/requirements`, `/dashboard/requirements/new`, `/dashboard/requirements/[id]`, `/dashboard/rfqs` |
| Supply | `/dashboard/supply`, `/dashboard/supply/new`, `/dashboard/demand` |
| Deals | `/dashboard/deals`, `/dashboard/deals/[id]` |
| Trade | `/dashboard/trade`, `/dashboard/trades/[id]`, logistics/compliance |
| Capital | `/dashboard/finance` (stub link) |
| Intelligence | `/dashboard/analytics` (stub) |
| Account | organisation, settings, verification |
| Control Tower | `/dashboard/admin` (admin) |

Existing RFQs, contracts, passports remain reachable; new primary path starts at Requirements.

---

## 4. Status machines

### BuyerRequirement

`DRAFT → PUBLISHED → MATCHING → RFQ_OPEN → PARTIALLY_FILLED | FILLED → CLOSED`  
Also: `CANCELLED`

`verifiedDemand = true` when buyer org `verificationStatus === VERIFIED` and requirement is published.

### SupplyLot

`DECLARED → VERIFIED → EXPORT_ELIGIBLE → CONTRACTED → IN_PRODUCTION → INSPECTED → IN_TRANSIT → DELIVERED`

### RequirementMatch

`SUGGESTED → SELECTED → RFQ_SENT → OFFERED → ACCEPTED → REJECTED`

### Deal

`PENDING_CONTRACT → ACTIVE → IN_FULFILMENT → COMPLETED`  
Also: `CANCELLED`, `DISPUTED`

### RFQ / Offer / Contract / Trade

Reuse existing enums in Prisma (`RfqStatus`, `OfferStatus`, `ContractStatus`, Trade lifecycle in `docs/trade-orchestration.md`).

---

## 5. Data model delta

### New tables

**buyer_requirements**  
id, reference (`KR-…`), buyerOrgId, createdById, commodity, variety?, quantity, unit, frequency (`ONE_OFF|MONTHLY|QUARTERLY|ANNUAL`), deliveryStart?, deliveryEnd?, destinationCountry, destinationCity?, destinationPort?, originPreference? (default KE), grade?, sizeSpec?, certifications[], packaging?, incoterm?, paymentTerms?, currency, notes?, status, verifiedDemand, matchedQuantity, publishedAt?, deletedAt, timestamps

**supply_lots**  
id, reference (`KR-KE-…`), supplierOrgId, createdById, commodity, variety?, originCountry, originRegion?, quantity, availableQuantity, unit, harvestStart?, harvestEnd?, grade?, certifications[], packaging?, status, notes?, deletedAt, timestamps

**requirement_matches**  
id, requirementId, supplyLotId?, supplierOrgId, score, availableQty, quantityMatched, reasons (Json), status, selectedForRfq, deletedAt, timestamps

**deals**  
id, reference (`KR-DEAL-…`), requirementId?, rfqId?, offerId?, contractId?, tradeId?, buyerOrgId, sellerOrgId, title, commodity, quantity, unit, value?, currency, status, deletedAt, timestamps

**deal_messages**  
id, dealId, authorUserId, body, createdAt, deletedAt?

### Extend

- `rfqs.requirementId` nullable FK → buyer_requirements  
- Organisation relations for requirements, supply lots, deals

### Reuse

Offer, Contract, Trade (Passport), Document, TrustProfile, VerificationCase, RegistryProfile

---

## 6. Matching algorithm (deterministic V1)

```text
score (0–100) =
  product match          25
  quantity fit           15
  quality / certs        15
  availability window    10
  origin                 5
  trust score            10
  export history proxy   10
  profile completeness   10
```

Return human-readable `reasons[]` (e.g. `"GlobalG.A.P. overlap"`, `"Window covers Jan–Jun"`).

**Aggregation:** greedy pack selected matches by score until `sum(quantityMatched) >= requirement.quantity`, or best effort + gap. UI: matched MT / unmatched MT / FULLY MATCHED.

---

## 7. Permissions

| Actor | Can |
|-------|-----|
| Public | Read published Discover Demand/Supply (limited fields) |
| Buyer (own org) | CRUD own requirements; select matches; create RFQ; compare offers; create deal; Deal Room; contracts/passports as today |
| Supplier (own org) | CRUD own lots; see published demand matches; offer on RFQs; Deal Room; fulfil |
| Admin | All + Control Tower + override capacity/status with audit log |
| Broker / Logistics / Inspector / Finance | Role stubs only in V1 |

V1: server-side checks via existing JWT + `Permission.*` (no Supabase RLS rewrite).

---

## 8. Screen inventory (V1)

### B1 — Buyer Home `/dashboard`

- Greeting, search stub, **Post a Buying Requirement**
- Active requirements with match %
- Trades summary (counts by stage)
- Opportunities stub (optional cards)

### B2 — Post Requirement `/dashboard/requirements/new`

Steps: product → qty/frequency → when → where → quality → arrival terms → notes → review + market-check stub → Publish

### B3 — Requirement detail `/dashboard/requirements/[id]`

Status, verified demand badge, matched/unmatched, responses, **View Matches**

### B4 — Matches (money screen) `/dashboard/requirements/[id]/matches`

Ranked suppliers/lots, scores, select, aggregation bar, **Create RFQ**

### B5 — RFQs `/dashboard/rfqs` (+ existing detail)

Created from matches; suppliers submit offers via existing offer API

### B6 — Offer comparison `/dashboard/rfqs/[id]` (enhanced)

Table: qty, price, trust, delivery + **estimated landed cost** (rules-based)

### B7 — Deal Room `/dashboard/deals/[id]`

Tabs: Overview, Parties, Messages, Offer, Contract, Documents, Finance, Logistics, Passport (links)

### S1 — Supplier demand `/dashboard/demand`

Buyers looking for your products (match %)

### S2 — My supply `/dashboard/supply`

Lots list + create lot

### A1 — Control Tower lite `/dashboard/admin`

Pipeline counts: requirements, RFQs, deals, shipments, exceptions list

### Public P1 — Landing `/`

Tagline + Post Requirement CTA + live demand strip (Kenya → world)

### Public P2 — Discover `/discover`

Tabs Demand / Supply / Opportunities / Markets

---

## 9. Landed cost (V1 rules)

Per offer, estimate:

```text
unitPrice + packing(0.08) + inland(0.06) + port(0.04) + freight(by dest) + insurance(0.02)
```

Freight defaults: GCC 0.35, Europe 0.42, Asia 0.40 (USD/kg proxy). Label as estimate, not quote.

---

## 10. Migration from RFQ-first

1. New flow: Requirement → Match → RFQ (`requirementId` set).  
2. Legacy RFQs: `requirementId = null`; still usable.  
3. No forced backfill in V1.  
4. Journey copy reframes to Demand → Match → Deal → Execute.

---

## 11. Design language

International, trusted, financial, data-rich. Navy/charcoal + restrained agricultural green. Large numbers, status chips, minimal copy. Not NGO, not Alibaba clone, not classifieds.

---

## 12. V1 out of scope

Owned payments/logistics/lending, WhatsApp, full Intelligence Pro, Future Supply calendars UI, Offtake market, Traceability QR graph, partner portals, Supabase Auth, dual domains, 50-country onboarding.

---

## 13. Commercial proof target

25 serious buyers · 100 verified suppliers · 25 live requirements · 10 completed trades.
