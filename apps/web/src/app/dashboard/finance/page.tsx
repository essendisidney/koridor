"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  buyerOrg: { name: string };
  sellerOrg: { name: string };
};

export default function FinancePage() {
  const { accessToken } = useAuth();
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      api<WalletPayload>("/finance/wallet", { token: accessToken }),
      api<EscrowAccount[]>("/finance/escrow", { token: accessToken }),
    ])
      .then(([w, e]) => {
        setWallet(w);
        setEscrows(e);
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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Finance
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Organisation wallet, ledger, and trade escrow accounts.
        </p>
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

      <form
        onSubmit={topUp}
        className="space-y-3 border-t border-[var(--border)] pt-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Top up wallet
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Provider: <span className="text-[var(--fg)]">{wallet?.provider ?? "…"}</span>
          . Stripe Checkout when configured; otherwise demo credit. Escrow stays
          on-ledger.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            required
          />
          <Input label="Currency" name="currency" defaultValue="USD" />
          <Input label="Notes" name="notes" />
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Mode</span>
            <select
              name="mode"
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3"
              defaultValue="provider"
            >
              <option value="provider">Configured provider</option>
              <option value="demo">Force demo credit</option>
            </select>
          </label>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Working…" : "Top up"}
        </Button>
      </form>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Escrow accounts
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Open an account from a contract escrow request, then fund (buyer) and
          release (seller / bank).
        </p>
        {escrows.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            No escrow accounts yet. Request escrow on a{" "}
            <Link href="/dashboard/contracts" className="underline">
              contract
            </Link>
            , then open it here with the request id from the contract page.
          </p>
        ) : (
          escrows.map((e) => (
            <div
              key={e.id}
              className="border-b border-[var(--border)] py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {e.reference} · {e.amount} {e.currency}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">{e.status}</p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {e.buyerOrg.name} → {e.sellerOrg.name}
                {e.fundedAt ? ` · funded ${formatDate(e.fundedAt)}` : ""}
                {e.releasedAt ? ` · released ${formatDate(e.releasedAt)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {e.status === "OPEN" ? (
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={() => actEscrow(e.id, "fund")}
                  >
                    Fund
                  </Button>
                ) : null}
                {e.status === "FUNDED" ? (
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={() => actEscrow(e.id, "release")}
                  >
                    Release
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
        <form
          className="flex flex-wrap items-end gap-2 pt-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const id = String(
              new FormData(ev.currentTarget).get("escrowRequestId") || "",
            );
            if (id) openEscrow(id);
          }}
        >
          <Input label="Escrow request id" name="escrowRequestId" required />
          <Button type="submit" size="sm" disabled={loading}>
            Open escrow account
          </Button>
        </form>
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
