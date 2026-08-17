"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/country-select";
import { Select } from "@/components/ui/select";
import { KENYA_PRODUCE } from "@/lib/corridors";

type Trade = {
  id: string;
  tradeNumber: string;
  title: string;
  status: string;
  currentStage: string;
  completionPct: number;
  readinessPct?: number;
  riskScore: number;
  trustScore: number;
  commodity: string;
  currency: string;
  value?: string | number | null;
  buyerOrg: { name: string };
  sellerOrg?: { name: string } | null;
};

export default function TradePage() {
  const { accessToken } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Trade[]>("/trades", { token: accessToken })
      .then(setTrades)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function createDraft(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const trade = await api<Trade>("/trades", {
        method: "POST",
        token: accessToken,
        body: {
          title: String(form.get("title")),
          commodity: String(form.get("commodity")),
          quantity: Number(form.get("quantity")),
          unit: String(form.get("unit") || "MT"),
          value: form.get("value") ? Number(form.get("value")) : undefined,
          currency: String(form.get("currency") || "USD"),
          originCountry: String(form.get("originCountry") || ""),
          destinationCountry: String(form.get("destinationCountry") || ""),
          incoterms: String(form.get("incoterms") || ""),
        },
      });
      window.location.href = `/dashboard/trades/${trade.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Trade Passports
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Living trades — the single source of truth for parties, documents,
            living trades with origin Kenya and destination Oman, Iran, or Iraq.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/rfqs">
            <Button size="sm" variant="secondary">
              RFQs
            </Button>
          </Link>
          <Link href="/dashboard/contracts">
            <Button size="sm" variant="secondary">
              Contracts
            </Button>
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Active passports
        </h2>
        {trades.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            No trades yet. Draft one below, or accept an RFQ offer to mint a
            passport.
          </p>
        ) : (
          trades.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/trades/${t.id}`}
              className="block border-b border-[var(--border)] py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {t.completionPct}% · {t.status}
                </p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {t.tradeNumber} · {t.currentStage} · {t.commodity}
                {t.sellerOrg
                  ? ` · ${t.buyerOrg.name} ↔ ${t.sellerOrg.name}`
                  : ` · ${t.buyerOrg.name}`}
                {t.value != null ? ` · ${t.currency} ${t.value}` : ""}
              </p>
            </Link>
          ))
        )}
      </section>

      <form
        onSubmit={createDraft}
        className="space-y-3 border-t border-[var(--border)] pt-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Draft opportunity
        </h2>
        <Input label="Title" name="title" required placeholder="Kenya tea — CIF Bandar Abbas" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Commodity" name="commodity" required defaultValue="Tea">
            {KENYA_PRODUCE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            step="0.01"
            required
          />
          <Input label="Unit" name="unit" defaultValue="MT" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Value" name="value" type="number" step="0.01" />
          <Input label="Currency" name="currency" defaultValue="USD" />
          <Input label="Incoterms" name="incoterms" defaultValue="FOB Mombasa" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CountrySelect
            label="Origin"
            name="originCountry"
            defaultValue="KE"
            required
          />
          <CountrySelect
            label="Destination"
            name="destinationCountry"
            defaultValue="IQ"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create draft passport"}
        </Button>
      </form>
    </div>
  );
}
