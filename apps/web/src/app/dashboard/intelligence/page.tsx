"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CURATED_BRIEFS,
  INTELLIGENCE_SECTIONS,
  intelligenceCorridorCards,
  signalLabel,
} from "@/lib/intelligence";
import { countryName } from "@/lib/corridors";

export default function IntelligencePage() {
  const corridors = intelligenceCorridorCards();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Intelligence
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
          Koridor market intelligence
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Curated corridor briefs for African agricultural procurement. These are
          editorial notes for operators — not live price quotes or fabricated
          market data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/requirements/new">
            <Button>Post buying requirement</Button>
          </Link>
          <Link href="/dashboard/analytics">
            <Button variant="secondary">Platform analytics</Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {INTELLIGENCE_SECTIONS.map((s) => (
          <div
            key={s.id}
            className="border border-[var(--border)] bg-white/70 px-4 py-3"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.blurb}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Featured corridors
        </h2>
        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {corridors.map((c) => (
            <li key={c.id} className="py-4">
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-[var(--fg-muted)]">
                {c.ports} · {c.note}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Product signals
          </h2>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Curated · not live prices
          </p>
        </div>
        <div className="grid gap-4">
          {CURATED_BRIEFS.map((b) => (
            <article
              key={b.id}
              className="border border-[var(--border)] bg-white p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {b.product}
                </h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  {signalLabel(b.signal)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                {countryName(b.origin)} → {countryName(b.destination)}
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                    Demand
                  </dt>
                  <dd className="mt-1">{b.demandNote}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                    Supply
                  </dt>
                  <dd className="mt-1">{b.supplyNote}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                    Recommendation
                  </dt>
                  <dd className="mt-1">{b.recommendation}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
