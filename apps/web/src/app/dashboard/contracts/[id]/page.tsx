"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Milestone = {
  id: string;
  title: string;
  status: string;
  sequence: number;
  completedAt?: string | null;
};

type Event = { id: string; type: string; message?: string | null; createdAt: string };

type Contract = {
  id: string;
  reference: string;
  title: string;
  status: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  unitPrice: string | number;
  totalValue: string | number;
  currency: string;
  incoterm?: string | null;
  buyerOrgId: string;
  sellerOrgId: string;
  buyerSignedAt?: string | null;
  sellerSignedAt?: string | null;
  buyerOrg: { name: string };
  sellerOrg: { name: string };
  milestones: Milestone[];
  escrowRequests: { id: string; amount: string | number; status: string; currency: string }[];
  shipmentRequests: { id: string; status: string; origin?: string | null; destination?: string | null }[];
  events: Event[];
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<Contract>(`/contracts/${id}`, { token: accessToken })
      .then(setContract)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Not found"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/contracts/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action, ...body },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateMilestone(milestoneId: string, status: string) {
    if (!accessToken || !id) return;
    setBusy(true);
    try {
      await api(`/contracts/${id}/milestones/${milestoneId}`, {
        method: "PATCH",
        token: accessToken,
        body: { status },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!contract) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">
        {error ?? "Loading contract…"}
      </p>
    );
  }

  const orgId = user?.organisationId;
  const isBuyer = orgId === contract.buyerOrgId;
  const isSeller = orgId === contract.sellerOrgId;
  const needsMySignature =
    (isBuyer && !contract.buyerSignedAt) || (isSeller && !contract.sellerSignedAt);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/dashboard/contracts" className="text-sm text-[var(--accent)]">
        ← Contracts
      </Link>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {contract.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {contract.reference} · {contract.status}
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--fg-muted)]">Parties</dt>
          <dd>
            {contract.buyerOrg.name} ↔ {contract.sellerOrg.name}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Commodity</dt>
          <dd>
            {contract.commodity} · {contract.quantity} {contract.unit}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Value</dt>
          <dd>
            {contract.currency} {contract.totalValue} (@ {contract.unitPrice})
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Signatures</dt>
          <dd>
            Buyer {contract.buyerSignedAt ? "✓" : "—"} · Seller{" "}
            {contract.sellerSignedAt ? "✓" : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {needsMySignature ? (
          <Button disabled={busy} onClick={() => act("sign")}>
            Sign contract
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            act("escrow", { amount: Number(contract.totalValue) })
          }
        >
          Request escrow
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            act("shipment", {
              origin: "Origin warehouse",
              destination: "Buyer destination",
            })
          }
        >
          Request shipment
        </Button>
      </div>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Milestones
        </h2>
        {contract.milestones.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-3"
          >
            <div>
              <p className="text-sm font-medium">
                {m.sequence}. {m.title}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {m.status}
                {m.completedAt ? ` · ${formatDate(m.completedAt)}` : ""}
              </p>
            </div>
            {m.status !== "COMPLETED" ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => updateMilestone(m.id, "COMPLETED")}
              >
                Complete
              </Button>
            ) : null}
          </div>
        ))}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Escrow
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Open and fund accounts in{" "}
          <Link href="/dashboard/finance" className="underline">
            Finance
          </Link>
          .
        </p>
        {contract.escrowRequests.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No escrow requests.</p>
        ) : (
          contract.escrowRequests.map((e) => (
            <p key={e.id} className="text-sm text-[var(--fg-muted)]">
              {e.currency} {e.amount} · {e.status}
              <span className="ml-2 font-mono text-xs">{e.id}</span>
            </p>
          ))
        )}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Shipments
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Book and track in{" "}
          <Link href="/dashboard/logistics" className="underline">
            Logistics
          </Link>
          .
        </p>
        {contract.shipmentRequests.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No shipment requests.</p>
        ) : (
          contract.shipmentRequests.map((s) => (
            <p key={s.id} className="text-sm text-[var(--fg-muted)]">
              {s.status}
              {s.origin ? ` · ${s.origin}` : ""}
              {s.destination ? ` → ${s.destination}` : ""}
              <span className="ml-2 font-mono text-xs">{s.id}</span>
            </p>
          ))
        )}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Timeline
        </h2>
        {contract.events.map((ev) => (
          <p key={ev.id} className="text-xs text-[var(--fg-muted)]">
            {formatDate(ev.createdAt)} — {ev.type.replaceAll("_", " ")}
            {ev.message ? `: ${ev.message}` : ""}
          </p>
        ))}
      </section>
    </div>
  );
}
