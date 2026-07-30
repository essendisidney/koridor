import { tradeReference } from "@/lib/trade";

export type PaymentIntent = {
  id: string;
  status: "pending" | "succeeded" | "failed";
  amount: number;
  currency: string;
  provider: string;
  checkoutUrl?: string;
  reference: string;
};

export type VerifiedTopUp = {
  ok: boolean;
  amount: number;
  currency: string;
  organisationId: string;
  walletId: string;
  reference: string;
  provider: string;
};

export interface PaymentProvider {
  name: string;
  createTopUp(input: {
    organisationId: string;
    walletId: string;
    amount: number;
    currency: string;
    actorId?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<PaymentIntent>;
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

const demoProvider: PaymentProvider = {
  name: "demo",
  async createTopUp(input) {
    const reference = tradeReference("PAY");
    return {
      id: reference,
      status: "succeeded",
      amount: input.amount,
      currency: input.currency,
      provider: "demo",
      reference,
    };
  },
};

const stripeProvider: PaymentProvider = {
  name: "stripe",
  async createTopUp(input) {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured");

    const reference = tradeReference("PAY");
    const successUrl =
      input.successUrl ??
      `${appUrl()}/dashboard/finance?topup=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      input.cancelUrl ?? `${appUrl()}/dashboard/finance?topup=cancelled`;

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set(
      "line_items[0][price_data][currency]",
      input.currency.toLowerCase(),
    );
    params.set(
      "line_items[0][price_data][product_data][name]",
      "Koridor wallet top-up",
    );
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(Math.round(input.amount * 100)),
    );
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", reference);
    params.set("metadata[organisationId]", input.organisationId);
    params.set("metadata[walletId]", input.walletId);
    params.set("metadata[amount]", String(input.amount));
    params.set("metadata[currency]", input.currency);
    params.set("metadata[koridorReference]", reference);
    if (input.actorId) params.set("metadata[actorId]", input.actorId);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const json = (await res.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.id || !json.url) {
      throw new Error(json.error?.message ?? "Stripe Checkout session failed");
    }

    return {
      id: json.id,
      status: "pending",
      amount: input.amount,
      currency: input.currency,
      provider: "stripe",
      checkoutUrl: json.url,
      reference: json.id,
    };
  },
};

/** M-Pesa-ready placeholder: same interface; wire Daraja STK when keys exist. */
const mpesaProvider: PaymentProvider = {
  name: "mpesa",
  async createTopUp(input) {
    const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();
    const shortcode = process.env.MPESA_SHORTCODE?.trim();
    const passkey = process.env.MPESA_PASSKEY?.trim();
    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      throw new Error(
        "M-Pesa is selected but MPESA_CONSUMER_KEY/SECRET/SHORTCODE/PASSKEY are not set",
      );
    }
    // STK Push wiring is env-ready; until callback URL + phone are mandatory,
    // fall back to a pending intent so callers can surface setup guidance.
    const reference = tradeReference("MPESA");
    return {
      id: reference,
      status: "pending",
      amount: input.amount,
      currency: input.currency === "KES" ? "KES" : input.currency,
      provider: "mpesa",
      reference,
      checkoutUrl: `${appUrl()}/dashboard/finance?topup=mpesa_pending&ref=${reference}`,
    };
  },
};

export function paymentsProviderName() {
  const configured = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();
  if (configured) return configured;
  if (process.env.STRIPE_SECRET_KEY?.trim()) return "stripe";
  return "demo";
}

export function getPaymentProvider(): PaymentProvider {
  const name = paymentsProviderName();
  if (name === "stripe") return stripeProvider;
  if (name === "mpesa") return mpesaProvider;
  return demoProvider;
}

export function parseStripeCheckoutCompleted(session: {
  id: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
}): VerifiedTopUp | null {
  if (session.payment_status && session.payment_status !== "paid") return null;
  const organisationId = session.metadata?.organisationId;
  const walletId = session.metadata?.walletId;
  if (!organisationId || !walletId) return null;

  const amountFromMeta = Number(session.metadata?.amount ?? 0);
  const amount =
    amountFromMeta > 0
      ? amountFromMeta
      : session.amount_total != null
        ? session.amount_total / 100
        : 0;
  if (amount <= 0) return null;

  return {
    ok: true,
    amount,
    currency: (
      session.metadata?.currency ??
      session.currency ??
      "USD"
    ).toUpperCase(),
    organisationId,
    walletId,
    reference: session.id,
    provider: "stripe",
  };
}
