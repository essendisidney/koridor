import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { ActivityType } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { creditWallet, decimalStr } from "@/lib/finance";
import { parseStripeCheckoutCompleted } from "@/lib/payments";

export const runtime = "nodejs";

function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 60 * 5) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return fail("STRIPE_WEBHOOK_SECRET is not configured", 500);
    }

    const sig = req.headers.get("stripe-signature");
    if (!verifyStripeSignature(raw, sig, secret)) {
      return fail("Invalid Stripe signature", 400);
    }

    const event = JSON.parse(raw) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };

    if (event.type !== "checkout.session.completed") {
      return ok({ received: true, ignored: event.type ?? "unknown" });
    }

    const session = event.data?.object as {
      id: string;
      payment_status?: string;
      amount_total?: number | null;
      currency?: string | null;
      metadata?: Record<string, string> | null;
    };

    const verified = parseStripeCheckoutCompleted(session);
    if (!verified) {
      return ok({ received: true, credited: false, reason: "unverified" });
    }

    // Idempotent: skip if ledger already has this Stripe session reference
    const existing = await prisma.ledgerEntry.findFirst({
      where: {
        reference: verified.reference,
        kind: "TOP_UP",
        deletedAt: null,
      },
    });
    if (existing) {
      return ok({ received: true, credited: false, reason: "already_applied" });
    }

    const result = await creditWallet({
      walletId: verified.walletId,
      amount: verified.amount,
      kind: "TOP_UP",
      description: `Stripe top-up ${verified.reference}`,
      reference: verified.reference,
      actorId: session.metadata?.actorId,
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.WALLET_CREDITED,
        title: "Wallet credited (Stripe)",
        description: `${verified.amount} ${verified.currency}`,
        actorId: session.metadata?.actorId ?? undefined,
        organisationId: verified.organisationId,
        entityType: "Wallet",
        entityId: verified.walletId,
      },
    });

    return ok({
      received: true,
      credited: true,
      wallet: {
        id: result.wallet.id,
        availableBalance: decimalStr(result.wallet.availableBalance),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    return fail(message, 400);
  }
}
