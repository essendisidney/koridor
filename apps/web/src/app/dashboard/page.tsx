"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { JourneyStepper } from "@/components/journey-stepper";
import type { JourneyPhase } from "@/lib/journey";

type JourneyPayload = {
  persona: string;
  copy: { headline: string; blurb: string };
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
        setError(err instanceof ApiError ? err.message : "Unable to load journey"),
      );
  }, [accessToken]);

  if (!journey && !error) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">Loading your next step…</p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          {user?.firstName ? `Welcome, ${user.firstName}` : "Workspace"}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
          {journey?.copy.headline ?? "Your Kenya–GCC corridor"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          {journey?.copy.blurb}
        </p>
        {journey?.org ? (
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            {journey.org.name} · {journey.org.type.replaceAll("_", " ")} ·{" "}
            {journey.org.countryCode} · {journey.org.verificationStatus}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {journey ? <JourneyStepper phases={journey.phases} /> : null}

      {journey?.next ? (
        <section className="border border-[var(--border)] bg-white p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
            Next
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
            Open lots
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
