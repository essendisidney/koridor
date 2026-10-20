# Real integrations — payments, carriers & messaging

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

## Messaging — WhatsApp / SMS dispatch (`lib/messaging.ts`)

Match "dispatch" and RFQ invites are written as in-app `Notification` rows and
then pushed to the farm manager's phone **after the response is sent**
(`next/server` `after()`), so a slow or failing provider never blocks the request.

| Provider | Channel | Env | Behaviour |
|----------|---------|-----|-----------|
| `demo` (default) | `IN_APP` | — | Logs the message to the server console |
| `taifa` | `SMS` | `TAIFA_API_KEY`, `TAIFA_SENDER_NAME` (approved sender ID or shortcode) | SMS via Taifa Mobile (`POST https://api.taifamobile.co.ke/sms/sendsms`, status `1000` = sent) |
| `africastalking` | `SMS` | `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, optional `AFRICASTALKING_SENDER_ID` | SMS via Africa's Talking (fallback) |
| `twilio` | `WHATSAPP` | `TWILIO_*` | WhatsApp — **not used unless named in `MESSAGING_PROVIDER`** (WhatsApp provider still to be chosen) |

- `MESSAGING_PROVIDER` — optional ordered chain, e.g. `taifa` or
  `taifa,africastalking`, or `demo` to force logging. Default: `taifa` then
  `africastalking`, whichever has keys; `demo` if none are set.
- `MESSAGING_DEFAULT_COUNTRY_CODE` — prefix for local numbers (default `254`,
  so `0712 345 678` → `+254712345678`).
- Taifa messages are capped at 920 characters (6 SMS units; each unit is billed).

**Recipient phone**: `User.phone`, falling back to the supplier org's
`OrgContact.phone` (primary contact first). Numbers are deduplicated per dispatch.

**Recorded outcome**: on delivery the row's `Notification.channel` becomes
`WHATSAPP` or `SMS` (it stays in the in-app inbox either way);
`metadata.outbound` holds `{ provider, ok, messageId, error }`. Failed or demo
sends leave `channel = IN_APP`.

Schema: apply `apps/web/prisma/migrations/20261020_notification_whatsapp_channel.sql`
(adds `WHATSAPP` to the `NotificationChannel` enum) before enabling Twilio.

## Admin health

`/dashboard/admin` health checks include `payments` and `carriers` status.

## Vercel

Add secrets in Project Settings → Environment Variables, then redeploy.
For Stripe, point the webhook to:

`https://koridor-psi.vercel.app/api/v1/finance/webhooks/stripe`
