"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { label } from "@/lib/labels";
import { countryName } from "@/lib/corridors";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { RestrictedMarketNotice } from "@/components/restricted-market-notice";

type Rfq = {
  id: string;
  reference: string;
  title: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  status: string;
  currency: string;
  originCountry?: string | null;
  destinationCountry?: string | null;
  neededBy?: string | null;
  buyerOrg?: { name: string };
  _count?: { offers: number };
};

export default function RfqsPage() {
  const { accessToken, user } = useAuth();
  const isSeller = Boolean(
    user?.roles.some((r) => ["FARMER", "COOPERATIVE", "EXPORTER"].includes(r)),
  );
  const [tab, setTab] = useState<"mine" | "open">("mine");
  const [items, setItems] = useState<Rfq[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Rfq[]>(`/rfqs?scope=${tab}`, { token: accessToken })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load quote requests"),
      );
  }, [accessToken, tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Quote requests
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Requests for prices between buyers and farms, and the offers on each.
        </p>
        <RestrictedMarketNotice className="mt-3" />
      </div>

      <div className="flex gap-2 border-b border-[var(--border)] pb-3">
        <Button
          size="sm"
          variant={tab === "mine" ? "primary" : "secondary"}
          onClick={() => setTab("mine")}
        >
          Mine
        </Button>
        <Button
          size="sm"
          variant={tab === "open" ? "primary" : "secondary"}
          onClick={() => setTab("open")}
        >
          Open market
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="card p-6 text-sm text-[var(--fg-muted)]">Nothing here yet.</p>
        ) : (
          items.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/rfqs/${r.id}`}
              className="card card-hover block p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-[var(--fg-muted)]">{label(r.status)}</p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {Number(r.quantity).toLocaleString()} {r.unit === "MT" ? "t" : r.unit}
                {r.destinationCountry ? ` to ${countryName(r.destinationCountry)}` : ""}
                {r.buyerOrg ? ` · ${r.buyerOrg.name}` : ""}
                {r._count ? ` · ${r._count.offers} ${r._count.offers === 1 ? "offer" : "offers"}` : ""}
              </p>
            </Link>
          ))
        )}
      </div>

      {tab === "mine" && !isSeller ? (
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--fg-muted)]">
            Need something new? Post a request and we&apos;ll find farms for you.
          </p>
          <Link href="/dashboard/requirements/new">
            <Button size="sm">New request</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
