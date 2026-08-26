"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type Payload = {
  requirement: {
    id: string;
    reference: string;
    commodity: string;
    variety?: string | null;
    quantity: string | number;
    unit: string;
    frequency: string;
    destinationCountry: string;
    destinationCity?: string | null;
    grade?: string | null;
    certifications: string[];
    incoterm?: string | null;
    paymentTerms?: string | null;
    status: string;
    verifiedDemand: boolean;
    matchedQuantity: string | number;
    notes?: string | null;
  };
  aggregation: {
    matchedQuantity: number;
    unmatchedQuantity: number;
    fullyMatched: boolean;
  };
  matches: unknown[];
};

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<Payload>(`/requirements/${id}`, { token: accessToken })
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Not found"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const r = data?.requirement;
  const qty = Number(r?.quantity ?? 0);
  const matched = Number(data?.aggregation.matchedQuantity ?? r?.matchedQuantity ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!r && !error ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : null}
      {r ? (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              {r.reference}
              {r.verifiedDemand ? " · Verified Demand" : ""}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {r.variety ? `${r.variety} ` : ""}
              {r.commodity}
            </h1>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {countryName(r.destinationCountry)}
              {r.destinationCity ? ` · ${r.destinationCity}` : ""} · {r.quantity}{" "}
              {r.unit} · {r.frequency} · {r.status}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-xs text-[var(--fg-muted)]">Matched</p>
              <p className="text-2xl font-semibold">
                {matched} {r.unit}
              </p>
            </div>
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-xs text-[var(--fg-muted)]">Unmatched</p>
              <p className="text-2xl font-semibold">
                {Math.max(0, qty - matched)} {r.unit}
              </p>
            </div>
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-xs text-[var(--fg-muted)]">Suppliers</p>
              <p className="text-2xl font-semibold">
                {data?.matches.length ?? 0}
              </p>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/requirements/${r.id}/matches`}>
              <Button>View matches</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                if (!accessToken) return;
                api(`/requirements/${r.id}`, {
                  method: "POST",
                  token: accessToken,
                  body: { action: "rematch" },
                }).then(load);
              }}
            >
              Rematch
            </Button>
          </div>

          <section className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--fg-muted)]">Grade</span> {r.grade ?? "—"}
            </p>
            <p>
              <span className="text-[var(--fg-muted)]">Certs</span>{" "}
              {r.certifications?.join(", ") || "—"}
            </p>
            <p>
              <span className="text-[var(--fg-muted)]">Terms</span>{" "}
              {r.incoterm ?? "—"} · {r.paymentTerms ?? "—"}
            </p>
            {r.notes ? <p className="text-[var(--fg-muted)]">{r.notes}</p> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
