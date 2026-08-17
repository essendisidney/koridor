"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import {
  FEATURED_CORRIDORS,
  GULF_WEST_ASIA_BUYERS,
  KENYA_PRODUCE,
  countryName,
} from "@/lib/corridors";

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
  const [dest, setDest] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    const qs = dest ? `?destination=${encodeURIComponent(dest)}` : "";
    fetch(`/api/v1/corridors/kenya${qs}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((body) => {
        if (!body?.success) throw new Error(body?.error?.message ?? "Failed");
        setData(body.data ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name: string }).name === "AbortError"
        ) {
          return;
        }
        setError("Unable to load the corridor directory.");
        setData(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [dest]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav ctaHref="/register?role=BUYER&country=OM" ctaLabel="Buy from Kenya" />

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Executable corridor
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl">
            Kenyan farm produce for Oman, Saudi Arabia, Iran, and Iraq
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--fg-muted)] leading-relaxed">
            Signed offtake first — then Kenyan cooperatives plant. Importers
            contract, insure, and ship on one Trade Passport. Identity, Halal,
            origin, escrow, and logistics stay bound to the lot.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register?role=BUYER&country=OM">
              <Button size="lg">Buyer in Oman</Button>
            </Link>
            <Link href="/register?role=BUYER&country=SA">
              <Button size="lg" variant="secondary">
                Buyer in Saudi Arabia
              </Button>
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
            <Link href="/register?role=COOPERATIVE&country=KE">
              <Button size="lg" variant="secondary">
                Kenyan cooperative
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
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
              <Link
                href={`/register?role=BUYER&country=${c.destination}`}
                className="mt-3 inline-block text-sm text-[var(--accent)] underline"
              >
                Register as buyer · {countryName(c.destination)}
              </Link>
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
            How the lot actually completes
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed">
            <li>
              <strong>1. Register as Buyer</strong> — organisation country Oman
              (OM), Saudi Arabia (SA), Iran (IR), or Iraq (IQ).
            </li>
            <li>
              <strong>2. Publish an offtake RFQ</strong> — origin Kenya, destination
              your country, <em>needed-by</em> date (harvest into your port). Kenyan
              cooperatives answer with offers.
            </li>
            <li>
              <strong>3. Contract + finance</strong> — dual signature, escrow or
              in-kind credit, Halal / COO / inspection on the Trade Passport.
            </li>
            <li>
              <strong>4. Execute</strong> — ship Mombasa → Sohar, Jeddah, Bandar
              Abbas, or Umm Qasr. Proof of delivery releases settlement on the
              same passport.
            </li>
          </ol>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Kenyan suppliers
            </h2>
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="h-11 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="">All GCC / West Asia buyers</option>
              {GULF_WEST_ASIA_BUYERS.map((c) => (
                <option key={c} value={c}>
                  Serving {countryName(c)}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading registry…</p>
          ) : null}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {!loading && !error && !data?.kenyanSuppliers?.length ? (
            <p className="text-sm text-[var(--fg-muted)]">
              Listed Kenyan exporters and cooperatives appear here once they
              publish a registry profile.
            </p>
          ) : null}
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {data?.kenyanSuppliers.map((s) => (
              <li key={s.slug} className="py-4">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {s.type.replaceAll("_", " ")} · {countryName(s.countryCode)}
                  {s.city ? ` · ${s.city}` : ""} · {s.verificationStatus} · Trust{" "}
                  {s.trustScore}
                </p>
                {s.commodities?.length ? (
                  <p className="mt-1 text-sm">{s.commodities.join(" · ")}</p>
                ) : null}
                {s.exportMarkets?.length ? (
                  <p className="text-xs text-[var(--fg-muted)]">
                    Markets {s.exportMarkets.join(", ")}
                  </p>
                ) : null}
                {s.summary ? (
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    {s.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {data?.gulfBuyers?.length ? (
          <section className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Buyers already on the corridor
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
      <PublicFooter />
    </div>
  );
}
