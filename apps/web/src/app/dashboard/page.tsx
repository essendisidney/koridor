"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { JourneyStepper } from "@/components/journey-stepper";
import type { JourneyPhase } from "@/lib/journey";
import type { WorkspaceView } from "@/lib/journey";

type JourneyPayload = {
  persona: string;
  isAdmin?: boolean;
  copy: { headline: string; blurb: string };
  workspace?: WorkspaceView | null;
  org: {
    name: string;
    type: string;
    countryCode: string;
    verificationStatus: string;
  } | null;
  phases: JourneyPhase[];
  next: { title: string; body: string; href: string; cta: string };
  trades: {
    id: string;
    tradeNumber: string;
    title: string;
    status: string;
    currentStage: string;
    completionPct: number;
  }[];
};

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [journey, setJourney] = useState<JourneyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api<JourneyPayload>("/journey", { token: accessToken })
      .then(setJourney)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Unable to load workspace"),
      );
  }, [accessToken]);

  if (!journey && !error) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse bg-[var(--border)]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 animate-pulse bg-[var(--border)]" />
          ))}
        </div>
      </div>
    );
  }

  const workspace = journey?.workspace;
  const headline = workspace?.headline ?? journey?.copy.headline ?? "Your Koridor workspace";
  const subhead = workspace?.subhead ?? journey?.copy.blurb;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          {user?.firstName ? `Welcome, ${user.firstName}` : "Workspace"}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
          {headline}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          {subhead}
        </p>
        {workspace ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={workspace.primaryCta.href}>
              <Button>{workspace.primaryCta.label}</Button>
            </Link>
            {workspace.secondaryCta ? (
              <Link href={workspace.secondaryCta.href}>
                <Button variant="secondary">{workspace.secondaryCta.label}</Button>
              </Link>
            ) : null}
          </div>
        ) : null}
        {journey?.org ? (
          <p className="mt-3 text-xs text-[var(--fg-muted)]">
            {journey.org.name} · {journey.org.type.replaceAll("_", " ")} ·{" "}
            {journey.org.countryCode} · {journey.org.verificationStatus}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {workspace?.metrics.length ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workspace.metrics.map((m) => {
            const inner = (
              <>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                  {m.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--fg)]">
                  {m.value}
                </p>
              </>
            );
            return m.href ? (
              <Link
                key={m.label}
                href={m.href}
                className="border border-[var(--border)] bg-white/70 px-4 py-3 transition hover:border-[var(--accent)]"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={m.label}
                className="border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                {inner}
              </div>
            );
          })}
        </section>
      ) : null}

      {workspace?.highlights.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            {journey?.persona === "buyer" ? "Your requirements" : "Live buyer demand"}
          </h2>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
            {workspace.highlights.map((h) => (
              <li key={h.href}>
                <Link
                  href={h.href}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-muted)]"
                >
                  <div>
                    <p className="font-medium text-[var(--fg)]">{h.title}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{h.subtitle}</p>
                  </div>
                  {h.badge ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                      {h.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {journey && !workspace ? (
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/requirements/new">
            <Button>Post a buying requirement</Button>
          </Link>
          <Link href="/dashboard/demand">
            <Button variant="secondary">See buyer demand</Button>
          </Link>
        </div>
      ) : null}

      {journey ? <JourneyStepper phases={journey.phases} /> : null}

      {journey?.next ? (
        <section className="border border-[var(--border)] bg-white p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
            {(() => {
              const idx = journey.phases.findIndex((p) => p.status === "current");
              const phase = journey.phases[idx] ?? journey.phases[0];
              return `Step ${Math.max(1, idx + 1)} of ${journey.phases.length} · ${phase.title}`;
            })()}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {journey.next.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
            {journey.next.body}
          </p>
          <Link href={journey.next.href} className="mt-5 inline-block">
            <Button>{journey.next.cta}</Button>
          </Link>
        </section>
      ) : null}

      {journey?.trades?.length ? (
        <section className="space-y-3 border-t border-[var(--border)] pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Open trades
          </h2>
          {journey.trades.map((t) => (
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
                {t.tradeNumber} · {t.currentStage}
              </p>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
