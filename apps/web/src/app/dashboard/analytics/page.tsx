"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Overview = {
  periodDays: number;
  scope: string;
  kpis: {
    totalTrades: number;
    activeTrades: number;
    completedTrades: number;
    cancelledTrades: number;
    disputedTrades: number;
    totalValueUsd: number;
    avgCompletionPct: number;
    avgRiskScore: number;
    avgTrustScore: number;
    newOrgs: number;
    verifiedOrgs: number;
    totalEscrowUsd: number;
    shipmentsBooked: number;
    shipmentsDelivered: number;
    certsApproved: number;
  };
  volumeTrend: { date: string; tradeCount: number; valueUsd: number }[];
  byStatus: Record<string, number>;
  corridors: {
    corridor: string;
    originCountry: string;
    destinationCountry: string;
    tradeCount: number;
    totalValueUsd: number;
    avgRiskScore: number;
    completedCount: number;
  }[];
  commodities: {
    commodity: string;
    tradeCount: number;
    totalValueUsd: number;
    avgRiskScore: number;
    completedCount: number;
  }[];
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function Bar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--fg-muted)]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState<"org" | "global">("org");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = Boolean(user?.roles.includes("SYSTEM_ADMIN"));

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<Overview>(
        `/analytics/overview?days=${days}&scope=${scope}`,
        { token: accessToken },
      );
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, days, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await api("/analytics/overview", {
        method: "POST",
        token: accessToken,
        body: { action: "snapshot", scope },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Snapshot failed");
    } finally {
      setLoading(false);
    }
  };

  const k = data?.kpis;
  const maxCorridor = Math.max(
    ...(data?.corridors.map((c) => c.tradeCount) ?? [0]),
    1,
  );
  const maxCommodity = Math.max(
    ...(data?.commodities.map((c) => c.totalValueUsd) ?? [0]),
    1,
  );
  const maxTrend = Math.max(
    ...(data?.volumeTrend.map((v) => v.tradeCount) ?? [0]),
    1,
  );
  const statusEntries = Object.entries(data?.byStatus ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Trade volume, corridor flows, risk and settlement signals for the selected window.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Period"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          {isAdmin ? (
            <select
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as "org" | "global")}
            >
              <option value="org">My organisation</option>
              <option value="global">Platform-wide</option>
            </select>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => void snapshot()} disabled={loading}>
            Save snapshot
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading analytics…</p>
      ) : null}

      {k ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Trades" value={String(k.totalTrades)} hint={`${k.activeTrades} active`} />
            <Kpi label="Trade value" value={money(k.totalValueUsd)} hint={`${k.completedTrades} completed`} />
            <Kpi label="Avg risk" value={String(k.avgRiskScore)} hint={`Trust ${k.avgTrustScore}`} />
            <Kpi label="Escrow" value={money(k.totalEscrowUsd)} hint={`${k.certsApproved} certs approved`} />
            <Kpi label="Shipments booked" value={String(k.shipmentsBooked)} hint={`${k.shipmentsDelivered} delivered`} />
            <Kpi label="Completion" value={`${k.avgCompletionPct}%`} hint={`${k.disputedTrades} disputed`} />
            <Kpi label="Verified orgs" value={String(k.verifiedOrgs)} hint={`${k.newOrgs} in period`} />
            <Kpi label="Cancelled" value={String(k.cancelledTrades)} hint={`Last ${days}d`} />
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Volume trend
            </h2>
            <div className="flex h-28 items-end gap-1 border-y border-[var(--border)] bg-white/70 py-3">
              {(data?.volumeTrend ?? []).map((v) => (
                <div
                  key={v.date}
                  className="group relative flex-1"
                  title={`${v.date}: ${v.tradeCount} trades · ${money(v.valueUsd)}`}
                >
                  <div
                    className="mx-auto w-full max-w-[10px] rounded-t-sm bg-[var(--accent)]/80 transition-opacity group-hover:opacity-100"
                    style={{
                      height: `${Math.max(4, Math.round((v.tradeCount / maxTrend) * 100))}%`,
                      minHeight: v.tradeCount > 0 ? 4 : 2,
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                Corridors
              </h2>
              <div className="space-y-3 border-y border-[var(--border)] bg-white/70 py-4">
                {(data?.corridors.length ?? 0) === 0 ? (
                  <p className="text-sm text-[var(--fg-muted)]">No corridor data yet.</p>
                ) : (
                  data?.corridors.map((c) => (
                    <Bar
                      key={c.corridor}
                      label={`${c.corridor} · ${money(c.totalValueUsd)} · risk ${c.avgRiskScore}`}
                      value={c.tradeCount}
                      max={maxCorridor}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                Commodities
              </h2>
              <div className="space-y-3 border-y border-[var(--border)] bg-white/70 py-4">
                {(data?.commodities.length ?? 0) === 0 ? (
                  <p className="text-sm text-[var(--fg-muted)]">No commodity data yet.</p>
                ) : (
                  data?.commodities.map((c) => (
                    <Bar
                      key={c.commodity}
                      label={`${c.commodity} · ${c.tradeCount} trades`}
                      value={Math.round(c.totalValueUsd)}
                      max={maxCommodity}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Status mix
            </h2>
            <div className="flex flex-wrap gap-2">
              {statusEntries.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">No trades in period.</p>
              ) : (
                statusEntries.map(([status, count]) => (
                  <span
                    key={status}
                    className="border border-[var(--border)] bg-white/80 px-3 py-1.5 text-xs tracking-wide text-[var(--fg)]"
                  >
                    {status.replaceAll("_", " ")} · {count}
                  </span>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-[var(--border)] bg-white/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--fg)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
