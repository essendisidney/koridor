"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { label } from "@/lib/labels";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type Requirement = {
  id: string;
  reference: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  destinationCountry: string;
  status: string;
  verifiedDemand: boolean;
  matchedQuantity: string | number;
  frequency: string;
  _count?: { matches: number; rfqs: number };
};

export default function RequirementsPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Requirement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api<Requirement[]>("/requirements", { token: accessToken })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load"),
      );
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">
            My requests
          </h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Everything you&apos;ve asked farms for, and how many have matched.
          </p>
        </div>
        <Link href="/dashboard/requirements/new">
          <Button size="lg">New request</Button>
        </Link>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!rows.length && !error ? (
        <p className="text-sm text-[var(--fg-muted)]">
          No requests yet. Tell us what you want to buy and we&apos;ll find farms.
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {rows.map((r) => {
          const qty = Number(r.quantity);
          const matched = Number(r.matchedQuantity);
          const pct = qty > 0 ? Math.round((matched / qty) * 100) : 0;
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">
                  {r.commodity}{" "}
                  {r.verifiedDemand ? (
                    <span className="text-xs text-[var(--accent)]">
                      Verified Demand
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {r.reference} · {countryName(r.destinationCountry)} ·{" "}
                  {Number(r.quantity).toLocaleString()} {r.unit === "MT" ? "t" : r.unit} · {label(r.frequency)} · {label(r.status)}
                </p>
                <p className="mt-1 text-sm">Match {pct}%</p>
              </div>
              <Link href={`/dashboard/requirements/${r.id}`}>
                <Button variant="secondary">View</Button>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
