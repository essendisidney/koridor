"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import {
  FEATURED_CORRIDORS,
  GULF_WEST_ASIA_BUYERS,
  KENYA_PRODUCE,
  countryName,
} from "@/lib/corridors";

export type DirectoryListing = {
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

export type DirectoryPayload = {
  kenyanSuppliers: DirectoryListing[];
  gulfBuyers: DirectoryListing[];
};

export function KenyaView({
  dest,
  data,
  error,
}: {
  dest: string;
  data: DirectoryPayload | null;
  error?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav ctaHref="/start" ctaLabel="Begin" />

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
            <Link href="/start">
              <Button size="lg">Begin the corridor</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Sign in
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
              <strong>1. Begin the corridor</strong> — choose GCC buyer or
              Kenyan cooperative at Get started. Register the organisation (not
              700,000 individual farmers).
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
              onChange={(e) => {
                const next = e.target.value;
                router.push(next ? `/kenya?destination=${next}` : "/kenya");
              }}
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
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {!error && !data?.kenyanSuppliers?.length ? (
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

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Buyers already on the corridor
          </h2>
          {!data?.gulfBuyers?.length ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--fg-muted)]">
                Listed importers in Oman, Saudi Arabia, Iran, and Iraq appear
                here. Open a buyer seat if you offtake Kenyan lots.
              </p>
              <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {FEATURED_CORRIDORS.filter(
                  (c) => !dest || c.destination === dest,
                ).map((c) => (
                  <li key={c.id} className="py-4">
                    <p className="font-medium">
                      {countryName(c.destination)} offtake
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">{c.ports}</p>
                    <Link
                      href={`/register?role=BUYER&country=${c.destination}`}
                      className="mt-2 inline-block text-sm text-[var(--accent)] underline"
                    >
                      Register as buyer · {countryName(c.destination)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {data.gulfBuyers.map((s) => (
                <li key={s.slug} className="py-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {countryName(s.countryCode)}
                    {s.city ? ` · ${s.city}` : ""}
                  </p>
                  {s.commodities?.length ? (
                    <p className="mt-1 text-sm">{s.commodities.join(" · ")}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
