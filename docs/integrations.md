# Real integrations — payments & carriers

Koridor stays the operating system: wallets/escrow and shipment state remain
source of truth. External providers plug in behind thin adapters.

## Payments (`lib/payments.ts`)

| Provider | Env | Behaviour |
|----------|-----|-----------|
| `demo` (default) | — | Immediate `creditWallet` (existing demo) |
| `stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout Session → webhook credits wallet |
| `mpesa` | `MPESA_*` | Interface ready; returns pending until STK is fully wired |

**Flow**
1. `POST /api/v1/finance/wallet` `{ action: "top_up", amount }`
2. If Stripe → response `{ pending: true, intent.checkoutUrl }` → redirect
3. Stripe sends `checkout.session.completed` to `/api/v1/finance/webhooks/stripe`
4. Idempotent ledger credit using session id as `reference`

Force demo even when Stripe is configured: `{ demo: true }` or UI mode “Force demo credit”.

Escrow fund/release stays **internal ledger** (hold → release).

## Carriers (`lib/carriers.ts`)

| Provider | Env | Behaviour |
|----------|-----|-----------|
| `manual` (default) | — | Generates / accepts carrier + tracking |
| `aftership` | `AFTERSHIP_API_KEY`, optional `AFTERSHIP_CARRIER_SLUG` | Registers tracking + poll checkpoints |

**Flow**
1. `POST /api/v1/logistics/shipments/:id` `{ action: "book" }` → `carrier.book()`
2. `{ action: "sync_tracking" }` → `carrier.track()` → append `TrackingEvent`s
3. Auto-advances `BOOKED` → `IN_TRANSIT` when feed reports transit

## Admin health

`/dashboard/admin` health checks include `payments` and `carriers` status.

## Vercel

Add secrets in Project Settings → Environment Variables, then redeploy.
For Stripe, point the webhook to:

`https://koridor-psi.vercel.app/api/v1/finance/webhooks/stripe`
