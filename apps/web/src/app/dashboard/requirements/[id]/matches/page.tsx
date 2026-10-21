"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, Check, Loader2, RefreshCw, Sprout, Star } from "lucide-react";
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
  status?: string;
  supplierOrg: {
    id: string;
    name: string;
    countryCode: string;
    city?: string | null;
    verificationStatus: string;
    trustProfile?: { trustScore: number } | null;
  };
  supplyLot?: { reference: string; availableQuantity: string | number } | null;
  supplierReviews?: { average: number | null; count: number };
};

type Payload = {
  requirement: {
    id: string;
    reference?: string;
    commodity: string;
    quantity: string | number;
    unit: string;
    destinationCountry: string;
    status?: string;
  };
  matches: MatchRow[];
  aggregation: {
    matchedQuantity: number;
    unmatchedQuantity: number;
    fullyMatched: boolean;
  };
};

const fmt = (n: number | string) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function RequirementMatchesPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const payload = await api<Payload>(`/requirements/${id}`, { token: accessToken });
      setData(payload);
      setSelected((prev) =>
        prev.length
          ? prev.filter((x) => payload.matches.some((m) => m.id === x))
          : payload.matches.filter((m) => Number(m.availableQty) > 0).slice(0, 4).map((m) => m.id),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load matches");
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Matching already runs when the request is posted and whenever a farm
  // lists produce; this is only for buyers who want to check right now.
  async function refresh() {
    if (!accessToken || !id) return;
    setRefreshing(true);
    try {
      await api(`/requirements/${id}`, { method: "POST", token: accessToken, body: { action: "rematch" } });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not refresh");
    } finally {
      setRefreshing(false);
    }
  }

  async function askForQuotes() {
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
      setError(e instanceof ApiError ? e.message : "Could not send the quote request");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-[var(--fg-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding farms…
      </div>
    );
  }

  const req = data?.requirement;
  const matches = data?.matches ?? [];
  const selectedVolume = matches
    .filter((m) => selected.includes(m.id))
    .reduce((s, m) => s + Number(m.availableQty || 0), 0);
  const wanted = Number(req?.quantity ?? 0);
  const coverPct = wanted ? Math.min(100, Math.round((selectedVolume / wanted) * 100)) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/requirements" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
            ← My requests
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            Farms for your {req?.commodity.toLowerCase()}
          </h1>
          {req ? (
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {fmt(req.quantity)} {req.unit === "MT" ? "tonnes" : req.unit} to{" "}
              {countryName(req.destinationCountry)}
              {req.reference ? ` · ${req.reference}` : ""}
            </p>
          ) : null}
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Check for new farms
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {matches.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sprout className="h-6 w-6" />
          </span>
          <p className="text-lg font-semibold">No verified farm has this listed yet</p>
          <p className="max-w-md text-sm text-[var(--fg-muted)]">
            Your request stays open. As soon as a verified farm lists matching
            produce, we&apos;ll match it and let you know here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => {
            const on = selected.includes(m.id);
            const prospect = Number(m.availableQty) <= 0;
            const verified = m.supplierOrg.verificationStatus === "VERIFIED";
            const reviews = m.supplierReviews;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                  }
                  aria-pressed={on}
                  className={`card flex w-full items-start gap-4 p-5 text-left transition ${on ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20" : "hover:border-[var(--accent)]/40"}`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-white"}`}
                  >
                    {on ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{m.supplierOrg.name}</span>
                      {verified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : null}
                      {reviews?.count && reviews.average != null ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                          <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                          {reviews.average.toFixed(1)} ({reviews.count})
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--fg-muted)]">New on Koridor</span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--fg-muted)]">
                      {[m.supplierOrg.city, countryName(m.supplierOrg.countryCode)].filter(Boolean).join(", ")}
                      {" · "}
                      {prospect ? "Volume not confirmed yet" : `${fmt(m.availableQty)} t available`}
                    </span>
                    {m.reasons?.length ? (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {m.reasons.slice(0, 5).map((r) => (
                          <span key={r} className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--fg-muted)]">
                            {r}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-2xl font-bold tracking-tight">{m.score}%</span>
                    <span className="text-xs text-[var(--fg-muted)]">match</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {matches.length ? (
        <div className="sticky bottom-20 z-20 lg:bottom-4">
          <div className="card flex flex-col gap-3 p-4 shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {selected.length} {selected.length === 1 ? "farm" : "farms"} selected · {fmt(selectedVolume)} of{" "}
                {fmt(wanted)} t
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f1eee6]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${coverPct}%` }}
                />
              </div>
            </div>
            <Button disabled={busy || !selected.length} onClick={() => void askForQuotes()}>
              {busy ? "Sending…" : "Ask for quotes"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
