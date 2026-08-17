"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FEATURED_CORRIDORS, KENYA_PRODUCE, countryName } from "@/lib/corridors";

type Listing = {
  name: string;
  slug: string;
  type: string;
  countryCode: string;
  city?: string | null;
  verificationStatus: string;
  trustScore: number;
  summary?: string | null;
  commodities: string[];
  exportMarkets: string[];
};

type Payload = {
  kenyanSuppliers: Listing[];
  gulfBuyers: Listing[];
};

export default function KenyaCorridorPage() {
  const [data, setData] = useState<Payload | null>(null);

  const load = useCallback(() => {
    fetch("/api/v1/corridors/kenya")
      .then((r) => r.json())
      .then((body) => setData(body.data ?? null))
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-semibold"
          >
            Koridor
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium">
              Sign in
            </Link>
            <Link href="/register?role=BUYER">
              <Button size="sm">Buy from Kenya</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Featured corridor
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl">
            Kenyan farm produce for Oman, Iran, and Iraq
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--fg-muted)] leading-relaxed">
            Importers in Muscat, Tehran, Baghdad, Basra, and Sohar can source
            verified Kenyan cooperatives and exporters — then contract, insure,
            and ship on Koridor. No cash-to-farmer shortcuts: identity, Halal /
            certificate of origin, escrow, and logistics sit on one passport.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register?role=BUYER&country=OM">
              <Button size="lg">Buyer in Oman</Button>
            </Link>
            <Link href="/register?role=BUYER&country=IR">
              <Button size="lg" variant="secondary">
                Buyer in Iran
              </Button>
            </Link>
            <Link href="/register?role=BUYER&country=IQ">
              <Button size="lg" variant="secondary">
                Buyer in Iraq
              </Button>
            </Link>
            <Link href="/register?role=EXPORTER&country=KE">
              <Button size="lg" variant="secondary">
                I farm or export from Kenya
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {FEATURED_CORRIDORS.map((c) => (
            <div
              key={c.id}
              className="border border-[var(--border)] bg-white p-5"
            >
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {c.title}
              </p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">{c.ports}</p>
              <p className="mt-2 text-sm">{c.note}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Typical Kenyan lots
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {KENYA_PRODUCE.map((p) => (
              <li
                key={p}
                className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
              >
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            How a Gulf or Iranian buyer purchases
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed">
            <li>
              <strong>1. Register as Buyer</strong> — organisation country Oman
              (OM), Iran (IR), or Iraq (IQ).
            </li>
            <li>
              <strong>2. Publish an RFQ</strong> — origin Kenya (KE), destination
              your country, commodity (avocado, tea, coffee, …). Kenyan
              exporters answer with offers.
            </li>
            <li>
              <strong>3. Contract + escrow</strong> — dual signature, deposit
              held on-ledger, Halal / COO / phytosanitary on the Trade Passport.
            </li>
            <li>
              <strong>4. Ship Mombasa → your port</strong> — book, track, proof
              of delivery, then release settlement.
            </li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Kenyan suppliers on the registry
          </h2>
          {!data?.kenyanSuppliers?.length ? (
            <p className="text-sm text-[var(--fg-muted)]">
              Listed Kenyan exporters and farmers appear here once they publish
              a registry profile. Sign in to browse the full directory.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {data.kenyanSuppliers.map((s) => (
                <li key={s.slug} className="py-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {s.type.replaceAll("_", " ")} · {countryName(s.countryCode)}
                    {s.city ? ` · ${s.city}` : ""} · Trust {s.trustScore}
                  </p>
                  {s.commodities?.length ? (
                    <p className="mt-1 text-sm">{s.commodities.join(" · ")}</p>
                  ) : null}
                  {s.summary ? (
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                      {s.summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {data?.gulfBuyers?.length ? (
          <section className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Buyers in Oman, Iran, and Iraq
            </h2>
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {data.gulfBuyers.map((s) => (
                <li key={s.slug} className="py-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {countryName(s.countryCode)}
                    {s.city ? ` · ${s.city}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
