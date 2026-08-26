"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type Deal = {
  id: string;
  reference: string;
  title: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  status: string;
  value?: string | number | null;
  buyerOrg: { name: string; countryCode: string };
  sellerOrg: { name: string; countryCode: string };
  _count?: { messages: number };
};

export default function DealsPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Deal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api<Deal[]>("/deals", { token: accessToken })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed"),
      );
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Deal rooms
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Negotiation, contract, and Trade Passport for each lot.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {rows.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-[var(--fg-muted)]">
                {d.reference} · {d.commodity} · {d.quantity} {d.unit} ·{" "}
                {d.status}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {d.buyerOrg.name} ({countryName(d.buyerOrg.countryCode)}) ↔{" "}
                {d.sellerOrg.name} ({countryName(d.sellerOrg.countryCode)})
              </p>
            </div>
            <Link href={`/dashboard/deals/${d.id}`}>
              <Button variant="secondary">Open</Button>
            </Link>
          </li>
        ))}
      </ul>
      {!rows.length && !error ? (
        <p className="text-sm text-[var(--fg-muted)]">
          Accept an offer to open a deal room, or create one from an RFQ offer.
        </p>
      ) : null}
    </div>
  );
}
