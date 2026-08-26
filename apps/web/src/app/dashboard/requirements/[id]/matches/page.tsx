"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type MatchRow = {
  id: string;
  score: number;
  availableQty: string | number;
  quantityMatched: string | number;
  reasons: string[];
  selectedForRfq: boolean;
  supplierOrg: {
    id: string;
    name: string;
    countryCode: string;
    verificationStatus: string;
    trustProfile?: { trustScore: number } | null;
  };
  supplyLot?: { reference: string; availableQuantity: string | number } | null;
};

type Payload = {
  requirement: {
    id: string;
    commodity: string;
    quantity: string | number;
    unit: string;
    destinationCountry: string;
  };
  matches: MatchRow[];
  aggregation: {
    matchedQuantity: number;
    unmatchedQuantity: number;
    fullyMatched: boolean;
  };
};

export default function RequirementMatchesPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      await api(`/requirements/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action: "rematch" },
      });
      const payload = await api<Payload>(`/requirements/${id}`, {
        token: accessToken,
      });
      setData(payload);
      setSelected(payload.matches.slice(0, 4).map((m) => m.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRfq() {
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/requirements/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action: "select", matchIds: selected },
      });
      const rfq = await api<{ id: string }>(`/requirements/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action: "create_rfq" },
      });
      router.push(`/dashboard/rfqs/${rfq.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "RFQ failed");
    } finally {
      setBusy(false);
    }
  }

  const agg = data?.aggregation;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Koridor matches
        </h1>
        {data ? (
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {data.requirement.commodity} · {data.requirement.quantity}{" "}
            {data.requirement.unit} →{" "}
            {countryName(data.requirement.destinationCountry)}
          </p>
        ) : null}
      </div>

      {agg ? (
        <section className="border border-[var(--border)] bg-white p-5">
          <p className="text-sm">
            Koridor can fulfil{" "}
            <strong>
              {agg.matchedQuantity} {data?.requirement.unit}
            </strong>
            {agg.fullyMatched ? (
              <span className="ml-2 text-[var(--accent)]">Fully matched</span>
            ) : (
              <span className="ml-2 text-[var(--fg-muted)]">
                Gap {agg.unmatchedQuantity} {data?.requirement.unit}
              </span>
            )}
          </p>
        </section>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {(data?.matches ?? []).map((m) => (
          <li key={m.id} className="flex gap-3 py-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(m.id)}
              onChange={(e) => {
                setSelected((prev) =>
                  e.target.checked
                    ? [...prev, m.id]
                    : prev.filter((x) => x !== m.id),
                );
              }}
            />
            <div className="flex-1">
              <p className="font-medium">
                {m.score}% · {m.supplierOrg.name}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {countryName(m.supplierOrg.countryCode)} · Trust{" "}
                {m.supplierOrg.trustProfile?.trustScore ?? "—"} · Available{" "}
                {m.availableQty} · {m.supplierOrg.verificationStatus}
              </p>
              {Array.isArray(m.reasons) && m.reasons.length ? (
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  {m.reasons.join(" · ")}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Button disabled={busy || !selected.length} onClick={() => void createRfq()}>
        {busy ? "Creating RFQ…" : "Create RFQ from selected"}
      </Button>
    </div>
  );
}
