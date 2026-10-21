import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { demoPaymentsAllowed, getPaymentProvider } from "./payments";

const saved = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("demo payments", () => {
  afterEach(() => {
    process.env = { ...saved };
  });

  it("are refused on the live Vercel site without a real provider", async () => {
    setEnv({ VERCEL_ENV: "production", PAYMENTS_ALLOW_DEMO: undefined, PAYMENTS_PROVIDER: undefined, STRIPE_SECRET_KEY: undefined });
    assert.equal(demoPaymentsAllowed(), false);
    await assert.rejects(
      getPaymentProvider().createTopUp({ organisationId: "o", walletId: "w", amount: 100, currency: "USD", actorId: "a" }),
      /aren't switched on/,
    );
  });

  it("are allowed on preview builds and local development", () => {
    setEnv({ VERCEL_ENV: "preview", PAYMENTS_ALLOW_DEMO: undefined });
    assert.equal(demoPaymentsAllowed(), true);
    setEnv({ VERCEL_ENV: undefined });
    assert.equal(demoPaymentsAllowed(), process.env.NODE_ENV !== "production");
  });

  it("can be switched on deliberately", () => {
    setEnv({ VERCEL_ENV: "production", PAYMENTS_ALLOW_DEMO: "true" });
    assert.equal(demoPaymentsAllowed(), true);
  });
});
