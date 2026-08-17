"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Insight = {
  kind: string;
  title: string;
  body: string;
  severity: string;
};

type Bankability = {
  score: number;
  breakdown: {
    identity: number;
    tradePerformance: number;
    repayment: number;
    logistics: number;
    total: number;
  };
  suggestedCreditLimit: number;
  currency: string;
  insights: Insight[];
  metrics: {
    trustScore: number;
    tradeCount: number;
    closedTrades: number;
    avgCompletionPct: number;
    escrowFunded: number;
    escrowReleased: number;
    repaymentRate: number | null;
    shipmentsTotal: number;
    shipmentsDelivered: number;
    deliveryRate: number | null;
  };
  scoredAt?: string | null;
  organisation: {
    name: string;
    verificationStatus: string;
    type: string;
    countryCode?: string;
    city?: string | null;
  };
  facility?: {
    limitAmount: string;
    drawnAmount: string;
    availableAmount: string;
    status: string;
  } | null;
};

export default function BankabilityPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Bankability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Bankability>("/bankability/me", { token: accessToken })
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Unable to load bankability",
        ),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api<Bankability>("/bankability/me", {
        method: "PATCH",
        token: accessToken,
      });
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refresh failed");
    } finally {
      setSaving(false);
    }
  }

  const b = data?.breakdown;
  const m = data?.metrics;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Bankability dossier
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Lender-facing score from identity, trade passport performance, escrow
            settlement, and logistics — turning trade evidence into a credit
            product.
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={saving}>
          Recalculate
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {data ? (
        <>
          <section className="space-y-4 border-t border-[var(--border)] pt-6">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  Bankability
                </p>
                <p className="font-[family-name:var(--font-display)] text-6xl font-semibold text-[var(--accent)]">
                  {data.score}
                </p>
              </div>
              <div className="pb-2 text-sm text-[var(--fg-muted)]">
                <p className="font-medium text-[var(--fg)]">
                  {data.organisation.name}
                </p>
                <p>
                  {data.organisation.verificationStatus.replaceAll("_", " ")} ·{" "}
                  {data.organisation.type.replaceAll("_", " ")}
                </p>
                {data.scoredAt ? (
                  <p className="text-xs">Scored {formatDate(data.scoredAt)}</p>
                ) : null}
              </div>
              <div className="pb-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  Suggested in-kind credit
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {data.suggestedCreditLimit.toLocaleString()} {data.currency}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  Inputs / goods — not cash
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-[var(--border)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${Math.min(100, data.score)}%` }}
              />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Identity (trust)", b?.identity, 30],
                ["Trade performance", b?.tradePerformance, 25],
                ["Repayment / escrow", b?.repayment, 25],
                ["Logistics reliability", b?.logistics, 20],
              ].map(([label, value, max]) => (
                <div key={String(label)} className="text-sm">
                  <dt className="text-[var(--fg-muted)]">{label}</dt>
                  <dd className="font-medium">
                    {value ?? 0} / {max}
                  </dd>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[var(--border)]">
                    <div
                      className="h-full bg-[var(--accent)]/80"
                      style={{
                        width: `${Math.min(100, ((Number(value) || 0) / Number(max)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          </section>

          {m ? (
            <section className="grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
              <Metric
                label="Trust score"
                value={String(m.trustScore)}
              />
              <Metric
                label="Trades"
                value={`${m.closedTrades}/${m.tradeCount} closed`}
              />
              <Metric
                label="Avg completion"
                value={`${m.avgCompletionPct}%`}
              />
              <Metric
                label="Escrow released"
                value={`${m.escrowReleased}/${m.escrowFunded}`}
              />
              <Metric
                label="Deliveries"
                value={`${m.shipmentsDelivered}/${m.shipmentsTotal}`}
              />
              <Metric
                label="Facility"
                value={
                  data.facility
                    ? `${data.facility.availableAmount} avail`
                    : "—"
                }
              />
            </section>
          ) : null}

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Dossier notes
            </h2>
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {data.insights.map((insight, i) => (
                <li key={`${insight.kind}-${i}`} className="px-1 py-3 text-sm">
                  <p className="font-medium">
                    <span className="mr-2 text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                      {insight.severity}
                    </span>
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-[var(--fg-muted)]">{insight.body}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/dashboard/finance">
                <Button size="sm">Open trade credit</Button>
              </Link>
              <Link href="/dashboard/trust">
                <Button variant="secondary" size="sm">
                  Identity passport
                </Button>
              </Link>
              <Link href="/dashboard/trade">
                <Button variant="secondary" size="sm">
                  Trades
                </Button>
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}
