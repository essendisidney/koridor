"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { countryName, FEATURED_CORRIDORS } from "@/lib/corridors";

type Req = {
  id: string;
  reference: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  destinationCountry: string;
  verifiedDemand: boolean;
  buyerOrg?: { name: string; countryCode: string };
};

type Lot = {
  id: string;
  commodity: string;
  availableQuantity: string | number;
  unit: string;
  originCountry: string;
  supplierOrg?: { name: string; countryCode: string };
};

export default function DiscoverPage() {
  const [tab, setTab] = useState<"demand" | "supply" | "opportunities" | "markets">(
    "demand",
  );
  const [demand, setDemand] = useState<Req[]>([]);
  const [supply, setSupply] = useState<Lot[]>([]);

  useEffect(() => {
    api<Req[]>("/requirements?scope=public").then(setDemand).catch(() => setDemand([]));
    api<Lot[]>("/supply-lots?scope=public").then(setSupply).catch(() => setSupply([]));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav ctaHref="/dashboard/requirements/new" ctaLabel="Post requirement" />
      <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Discover
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold">
            Global demand meets African supply
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
            Not a catalogue of 7,000 listings — structured requirements, verified
            capacity, and corridors from Kenya to the world.
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["demand", "Demand"],
              ["supply", "Supply"],
              ["opportunities", "Opportunities"],
              ["markets", "Markets"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "primary" : "secondary"}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {tab === "demand" ? (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {demand.map((r) => (
              <li key={r.id} className="py-4">
                <p className="font-medium">
                  {r.commodity} · {r.quantity} {r.unit}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {countryName(r.destinationCountry)} · {r.reference}
                  {r.verifiedDemand ? " · Verified Demand" : ""}
                </p>
              </li>
            ))}
            {!demand.length ? (
              <li className="py-4 text-sm text-[var(--fg-muted)]">
                Published requirements appear here.{" "}
                <Link href="/register?role=BUYER" className="underline">
                  Post the first one
                </Link>
                .
              </li>
            ) : null}
          </ul>
        ) : null}

        {tab === "supply" ? (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {supply.map((s) => (
              <li key={s.id} className="py-4">
                <p className="font-medium">
                  {s.commodity} · {s.availableQuantity} {s.unit}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {s.supplierOrg?.name ?? "Supplier"} ·{" "}
                  {countryName(s.originCountry)}
                </p>
              </li>
            ))}
            {!supply.length ? (
              <li className="py-4 text-sm text-[var(--fg-muted)]">
                Verified Kenya lots appear when suppliers declare capacity.
              </li>
            ) : null}
          </ul>
        ) : null}

        {tab === "opportunities" ? (
          <p className="text-sm text-[var(--fg-muted)]">
            Opportunity engine (supply gaps + sourcing campaigns) ships after V1
            transaction volume. Use Control Tower exceptions for shortfalls.
          </p>
        ) : null}

        {tab === "markets" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURED_CORRIDORS.map((c) => (
              <div key={c.id} className="border border-[var(--border)] bg-white p-5">
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {c.title}
                </p>
                <p className="mt-2 text-sm text-[var(--fg-muted)]">{c.ports}</p>
                <p className="mt-2 text-sm">{c.note}</p>
              </div>
            ))}
          </div>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  );
}
