"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { label } from "@/lib/labels";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestrictedMarketNotice } from "@/components/restricted-market-notice";

type WalletPayload = {
  provider?: string;
  wallet: {
    id: string;
    currency: string;
    availableBalance: string;
    heldBalance: string;
    status: string;
  };
  ledger: {
    id: string;
    type: string;
    kind: string;
    amount: string;
    balanceAfter: string;
    description?: string | null;
    createdAt: string;
  }[];
};

type TopUpResult = {
  pending?: boolean;
  provider?: string;
  intent?: { checkoutUrl?: string; reference?: string; status?: string };
};

type EscrowAccount = {
  id: string;
  reference: string;
  amount: string;
  currency: string;
  status: string;
  fundedAt?: string | null;
  releasedAt?: string | null;
  buyerOrg: { id?: string; name: string };
  sellerOrg: { id?: string; name: string };
};

type CreditFacility = {
  id: string;
  currency: string;
  status: string;
  bankabilityScore: number;
  limitAmount: string;
  drawnAmount: string;
  availableAmount: string;
  draws: {
    id: string;
    reference: string;
    amount: string;
    currency: string;
    status: string;
    description?: string | null;
    createdAt: string;
    settledAt?: string | null;
    supplierOrg: { id: string; name: string };
  }[];
};

type CreditPayload = {
  facility: CreditFacility;
  receivedDraws: {
    id: string;
    reference: string;
    amount: string;
    currency: string;
    status: string;
    createdAt: string;
    buyerOrg: { name: string };
  }[];
};

export default function FinancePage() {
  const { accessToken, user } = useAuth();
  const isAdmin = Boolean(user?.roles.includes("SYSTEM_ADMIN"));
  const [bankRefs, setBankRefs] = useState<Record<string, string>>({});
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [credit, setCredit] = useState<CreditPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      api<WalletPayload>("/finance/wallet", { token: accessToken }),
      api<EscrowAccount[]>("/finance/escrow", { token: accessToken }),
      api<CreditPayload>("/finance/credit", { token: accessToken }).catch(
        () => null,
      ),
    ])
      .then(([w, e, c]) => {
        setWallet(w);
        setEscrows(e);
        setCredit(c);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function topUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const useDemo = String(form.get("mode") || "") === "demo";
    try {
      const res = await api<TopUpResult>("/finance/wallet", {
        method: "POST",
        token: accessToken,
        body: {
          action: "top_up",
          amount: Number(form.get("amount")),
          currency: String(form.get("currency") || "USD"),
          notes: String(form.get("notes") || ""),
          demo: useDemo,
        },
      });
      if (res.pending && res.intent?.checkoutUrl) {
        window.location.href = res.intent.checkoutUrl;
        return;
      }
      (e.target as HTMLFormElement).reset();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Top-up failed");
    } finally {
      setLoading(false);
    }
  }

  async function actEscrow(id: string, action: "fund" | "release") {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await api("/finance/escrow", {
        method: "POST",
        token: accessToken,
        body: { id, action },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Escrow action failed");
    } finally {
      setLoading(false);
    }
  }

  // Admin: a buyer's bank transfer has arrived. Credit their wallet with the
  // bank reference, then move it into this escrow.
  async function recordBankTransfer(e: EscrowAccount) {
    if (!accessToken) return;
    const reference = (bankRefs[e.id] ?? "").trim();
    if (!reference) {
      setError("Enter the bank reference first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api("/finance/wallet", {
        method: "POST",
        token: accessToken,
        body: {
          action: "top_up",
          mode: "bank_transfer",
          organisationId: e.buyerOrg.id,
          amount: e.amount,
          currency: e.currency,
          reference,
          notes: `Bank transfer ${reference} for ${e.reference}`,
        },
      });
      await api("/finance/escrow", {
        method: "POST",
        token: accessToken,
        body: { id: e.id, action: "fund" },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record the transfer");
    } finally {
      setLoading(false);
    }
  }

  async function openEscrow(escrowRequestId: string) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await api("/finance/escrow", {
        method: "POST",
        token: accessToken,
        body: { action: "open", escrowRequestId },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Open escrow failed");
    } finally {
      setLoading(false);
    }
  }

  async function issueCredit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api("/finance/credit", {
        method: "POST",
        token: accessToken,
        body: {
          action: "draw",
          supplierOrgId: String(form.get("supplierOrgId")),
          amount: Number(form.get("amount")),
          tradeId: String(form.get("tradeId") || "") || undefined,
          description: String(form.get("description") || "") || undefined,
        },
      });
      (e.target as HTMLFormElement).reset();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Credit draw failed");
    } finally {
      setLoading(false);
    }
  }

  async function settleCredit(drawId: string, collectFromWallet: boolean) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await api("/finance/credit", {
        method: "POST",
        token: accessToken,
        body: { action: "settle", drawId, collectFromWallet },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Settle failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Finance
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Organisation wallet, ledger, escrow, and in-kind trade credit.
        </p>
        <RestrictedMarketNotice className="mt-3" />
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {wallet ? (
        <section className="grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
          <Stat
            label="Available"
            value={`${wallet.wallet.availableBalance} ${wallet.wallet.currency}`}
          />
          <Stat
            label="Held in escrow"
            value={`${wallet.wallet.heldBalance} ${wallet.wallet.currency}`}
          />
          <Stat label="Status" value={wallet.wallet.status} />
        </section>
      ) : null}

      {wallet?.provider === "disabled" ? (
        <section className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-soft)] p-5">
          <p className="font-semibold">Online payments aren&apos;t switched on yet</p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            To pay into escrow, contact Koridor for bank transfer details. We
            confirm the money here once it arrives, and it&apos;s only released
            to the farm after delivery.
          </p>
        </section>
      ) : (
        <form onSubmit={topUp} className="card space-y-4 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Add money
          </h2>
          <p className="text-sm text-[var(--fg-muted)]">
            {wallet?.provider === "demo"
              ? "Test mode: money added here is not real."
              : "You'll be taken to a secure payment page."}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Amount" name="amount" type="number" step="0.01" min={1} required />
            <Input label="Currency" name="currency" defaultValue="USD" />
            <Input label="Note (optional)" name="notes" />
          </div>
          {wallet?.provider === "demo" ? <input type="hidden" name="mode" value="demo" /> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Working…" : "Add money"}
          </Button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Escrow</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          The buyer&apos;s payment is held here and only released to the farm after
          the buyer confirms delivery.
        </p>
        {escrows.length === 0 ? (
          <p className="card p-6 text-sm text-[var(--fg-muted)]">
            Nothing in escrow yet. Escrow is set up from a signed{" "}
            <Link href="/dashboard/contracts" className="underline">
              contract
            </Link>
            .
          </p>
        ) : (
          escrows.map((e) => {
            const mine = user?.organisationId;
            const isBuyerSide = e.buyerOrg.id === mine;
            return (
              <div key={e.id} className="card space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {Number(e.amount).toLocaleString()} {e.currency}
                  </p>
                  <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold">
                    {e.status === "OPEN"
                      ? "Waiting for payment"
                      : e.status === "FUNDED"
                        ? "Held safely"
                        : e.status === "RELEASED"
                          ? "Paid to farm"
                          : label(e.status)}
                  </span>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">
                  {e.buyerOrg.name} → {e.sellerOrg.name} · {e.reference}
                  {e.fundedAt ? ` · paid in ${formatDate(e.fundedAt)}` : ""}
                  {e.releasedAt ? ` · released ${formatDate(e.releasedAt)}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {e.status === "OPEN" && isBuyerSide && wallet?.provider !== "disabled" ? (
                    <Button size="sm" disabled={loading} onClick={() => actEscrow(e.id, "fund")}>
                      Pay into escrow
                    </Button>
                  ) : null}
                  {e.status === "OPEN" && isAdmin ? (
                    <>
                      <input
                        placeholder="Bank reference"
                        value={bankRefs[e.id] ?? ""}
                        onChange={(ev) => setBankRefs((r) => ({ ...r, [e.id]: ev.target.value }))}
                        className="h-9 rounded-full border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]"
                      />
                      <Button size="sm" variant="secondary" disabled={loading} onClick={() => recordBankTransfer(e)}>
                        Bank transfer received
                      </Button>
                    </>
                  ) : null}
                  {e.status === "FUNDED" && (isBuyerSide || isAdmin) ? (
                    <Button size="sm" disabled={loading} onClick={() => actEscrow(e.id, "release")}>
                      {isAdmin && !isBuyerSide ? "Release to farm (admin)" : "Confirm delivery & release payment"}
                    </Button>
                  ) : null}
                  {e.status === "FUNDED" && !isBuyerSide && !isAdmin ? (
                    <p className="text-xs text-[var(--fg-muted)]">
                      Released to you when the buyer confirms delivery.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        {isAdmin ? (
          <form
            className="flex flex-wrap items-end gap-2 pt-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              const id = String(new FormData(ev.currentTarget).get("escrowRequestId") || "");
              if (id) openEscrow(id);
            }}
          >
            <Input label="Escrow request ID (admin)" name="escrowRequestId" required />
            <Button type="submit" size="sm" variant="secondary" disabled={loading}>
              Open escrow
            </Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          In-kind trade credit
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Limit follows{" "}
          <Link href="/dashboard/bankability" className="underline">
            bankability
          </Link>
          . Issue supplier credit for inputs/goods (not cash) against a locked
          Trade Passport. Settle after delivery — wallet debit by default.
        </p>
        {credit?.facility ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Limit"
              value={`${credit.facility.limitAmount} ${credit.facility.currency}`}
            />
            <Stat
              label="Drawn"
              value={`${credit.facility.drawnAmount} ${credit.facility.currency}`}
            />
            <Stat
              label="Available"
              value={`${credit.facility.availableAmount} ${credit.facility.currency}`}
            />
          </div>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            Facility syncs when bankability is scored.
          </p>
        )}
        <form onSubmit={issueCredit} className="grid gap-3 sm:grid-cols-2">
          <Input label="Supplier org id" name="supplierOrgId" required />
          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            required
          />
          <Input label="Trade Passport id" name="tradeId" required />
          <Input label="Description" name="description" />
          <Button type="submit" disabled={loading}>
            Issue supplier credit
          </Button>
        </form>
        {credit?.facility?.draws?.length ? (
          <div className="space-y-2 pt-2">
            {credit.facility.draws.map((d) => (
              <div
                key={d.id}
                className="border-b border-[var(--border)] py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {d.reference} · {d.amount} {d.currency}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">{d.status}</p>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">
                  → {d.supplierOrg.name} · {formatDate(d.createdAt)}
                  {d.settledAt ? ` · settled ${formatDate(d.settledAt)}` : ""}
                </p>
                {d.status === "OPEN" ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={loading}
                      onClick={() => settleCredit(d.id, true)}
                    >
                      Settle (wallet)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => settleCredit(d.id, false)}
                    >
                      Mark settled
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {credit?.receivedDraws?.length ? (
          <div className="space-y-2 pt-4">
            <h3 className="text-sm font-medium">Credit received (as supplier)</h3>
            {credit.receivedDraws.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] py-2 text-sm"
              >
                <span>
                  {d.reference} from {d.buyerOrg.name}
                </span>
                <span>
                  {d.amount} {d.currency} · {d.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Ledger
        </h2>
        {!wallet || wallet.ledger.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No ledger entries.</p>
        ) : (
          wallet.ledger.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {row.kind.replaceAll("_", " ")} · {row.type}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {row.description || "—"} · {formatDate(row.createdAt)}
                </p>
              </div>
              <p className="text-sm">
                {row.type === "CREDIT" ? "+" : "−"}
                {row.amount} → {row.balanceAfter}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}
