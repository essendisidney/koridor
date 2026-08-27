"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ControlException } from "@/lib/control-tower";

type Flag = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  percentage: number;
};

type Health = {
  overall: string;
  checks: {
    service: string;
    status: string;
    latencyMs: number;
  }[];
  checkedAt: string;
};

type Overview = {
  counts: { organisations: number; users: number; trades: number };
  flagsEnabled: number;
  flagsTotal: number;
  health: Health;
};

type Tower = {
  requirements: number;
  rfqsOpen: number;
  deals: number;
  supplyLots: number;
  shipments: number;
  verificationQueue: number;
  exceptionCount: number;
  exceptions: ControlException[];
};

export default function AdminPage() {
  const { accessToken, user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [tower, setTower] = useState<Tower | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isAdmin = Boolean(
    user?.roles.includes("SYSTEM_ADMIN") ||
      user?.permissions?.includes("admin:all"),
  );

  const load = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, fl, towerData] = await Promise.all([
        api<Overview>("/admin?view=overview", { token: accessToken }),
        api<Flag[]>("/admin?view=flags", { token: accessToken }),
        api<Tower>("/admin?view=tower", { token: accessToken }),
      ]);
      setOverview(ov);
      setFlags(Array.isArray(fl) ? fl : []);
      setTower(towerData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Admin load failed");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (flag: Flag) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await api("/admin", {
        method: "POST",
        token: accessToken,
        body: {
          action: "upsert_flag",
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: !flag.enabled,
          percentage: flag.percentage,
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Flag update failed");
      setLoading(false);
    }
  };

  const healthCheck = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const health = await api<Health>("/admin", {
        method: "POST",
        token: accessToken,
        body: { action: "health_check" },
      });
      setOverview((prev) => (prev ? { ...prev, health } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Health check failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Administration
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          System admin access required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
            Control Tower
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Pipeline, exceptions, verification — what needs attention.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => void healthCheck()} disabled={loading}>
            Run health check
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tower ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Live requirements" value={String(tower.requirements)} />
          <Stat label="Open RFQs" value={String(tower.rfqsOpen)} />
          <Stat label="Deal rooms" value={String(tower.deals)} />
          <Stat label="Active shipments" value={String(tower.shipments)} />
          <Stat label="Supply lots" value={String(tower.supplyLots)} />
          <Stat
            label="Verification queue"
            value={String(tower.verificationQueue)}
            href="/dashboard/reviews"
          />
          <Stat
            label="Exceptions"
            value={String(tower.exceptionCount)}
            hint={
              tower.exceptionCount
                ? "Needs attention"
                : "All clear"
            }
          />
        </div>
      ) : null}

      {tower?.exceptions?.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Exception center
          </h2>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
            {tower.exceptions.map((ex) => (
              <li
                key={ex.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--fg)]">
                    <SeverityBadge severity={ex.severity} /> {ex.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">
                    {ex.type.replaceAll("_", " ")} · {ex.detail}
                  </p>
                </div>
                {ex.href ? (
                  <Link href={ex.href}>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : tower ? (
        <p className="text-sm text-[var(--fg-muted)]">
          No operational exceptions right now.
        </p>
      ) : null}

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Organisations" value={String(overview.counts.organisations)} />
          <Stat label="Users" value={String(overview.counts.users)} />
          <Stat label="Trades" value={String(overview.counts.trades)} />
          <Stat
            label="Health"
            value={overview.health.overall}
            hint={`${overview.flagsEnabled}/${overview.flagsTotal} flags on`}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Services
        </h2>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
          {(overview?.health.checks ?? []).map((c) => (
            <div key={c.service} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium text-[var(--fg)]">{c.service}</span>
              <span className="text-[var(--fg-muted)]">
                {c.status}
                {c.latencyMs ? ` · ${c.latencyMs}ms` : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Feature flags
        </h2>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">{f.name}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {f.key}
                  {f.description ? ` — ${f.description}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant={f.enabled ? "secondary" : "primary"}
                disabled={loading}
                onClick={() => void toggle(f)}
              >
                {f.enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "CRITICAL"
      ? "text-red-700"
      : severity === "WARNING"
        ? "text-amber-700"
        : "text-[var(--fg-muted)]";
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>
      {severity}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="border border-[var(--border)] bg-white/70 px-4 py-3 transition hover:border-[var(--accent)]"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="border border-[var(--border)] bg-white/70 px-4 py-3">
      {inner}
    </div>
  );
}
