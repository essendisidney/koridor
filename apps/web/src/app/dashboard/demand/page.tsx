"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type Req = {
  id: string;
  reference: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  destinationCountry: string;
  verifiedDemand: boolean;
  status: string;
  buyerOrg?: { name: string; countryCode: string; verificationStatus: string };
};

export default function BuyerDemandPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Req[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api<Req[]>("/requirements?scope=public", { token: accessToken })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed"),
      );
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Buyers looking for your products
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Verified international demand. Respond through open RFQs.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <p className="font-medium">
                {r.commodity} · {r.quantity} {r.unit}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {countryName(r.destinationCountry)} · {r.reference}
                {r.verifiedDemand ? " · Verified Demand" : ""}
              </p>
            </div>
            <Link href="/dashboard/rfqs?scope=open">
              <Button variant="secondary">Open RFQs</Button>
            </Link>
          </li>
        ))}
      </ul>
      {!rows.length && !error ? (
        <p className="text-sm text-[var(--fg-muted)]">
          No published requirements yet.
        </p>
      ) : null}
    </div>
  );
}
