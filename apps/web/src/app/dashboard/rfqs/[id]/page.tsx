"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Offer = {
  id: string;
  unitPrice: string | number;
  quantity: string | number;
  unit: string;
  currency: string;
  status: string;
  notes?: string | null;
  sellerOrg: { id: string; name: string };
};

type Event = { id: string; type: string; message?: string | null; createdAt: string };

type Rfq = {
  id: string;
  reference: string;
  title: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  status: string;
  currency: string;
  targetPrice?: string | number | null;
  incoterm?: string | null;
  notes?: string | null;
  buyerOrgId: string;
  buyerOrg: { id: string; name: string };
  offers: Offer[];
  events: Event[];
};

export default function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<Rfq>(`/rfqs/${id}`, { token: accessToken })
      .then(setRfq)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Not found"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const isBuyer = Boolean(
    rfq && user?.organisationId && rfq.buyerOrgId === user.organisationId,
  );

  async function publishOrClose(action: "publish" | "close") {
    if (!accessToken || !id) return;
    setBusy(true);
    try {
      await api(`/rfqs/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitOffer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api(`/rfqs/${id}/offers`, {
        method: "POST",
        token: accessToken,
        body: {
          unitPrice: String(form.get("unitPrice")),
          quantity: String(form.get("quantity") || rfq?.quantity || ""),
          currency: String(form.get("currency") || rfq?.currency || "USD"),
          leadTimeDays: String(form.get("leadTimeDays") || ""),
          notes: String(form.get("notes") || ""),
        },
      });
      e.currentTarget.reset();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Offer failed");
    } finally {
      setBusy(false);
    }
  }

  async function decide(offerId: string, decision: "ACCEPTED" | "REJECTED") {
    if (!accessToken || !id) return;
    setBusy(true);
    try {
      const result = await api<{ id?: string }>(`/rfqs/${id}/offers`, {
        method: "PATCH",
        token: accessToken,
        body: { offerId, decision },
      });
      if (decision === "ACCEPTED" && result?.id) {
        window.location.href = `/dashboard/contracts/${result.id}`;
        return;
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  if (!rfq) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">
        {error ?? "Loading RFQ…"}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/dashboard/rfqs" className="text-sm text-[var(--accent)]">
        ← RFQs
      </Link>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {rfq.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {rfq.reference} · {rfq.status} · {rfq.buyerOrg.name}
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--fg-muted)]">Commodity</dt>
          <dd>{rfq.commodity}</dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Quantity</dt>
          <dd>
            {rfq.quantity} {rfq.unit}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Target price</dt>
          <dd>
            {rfq.targetPrice
              ? `${rfq.currency} ${rfq.targetPrice}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Incoterm</dt>
          <dd>{rfq.incoterm ?? "—"}</dd>
        </div>
      </dl>

      {isBuyer ? (
        <div className="flex gap-2">
          {rfq.status === "DRAFT" ? (
            <Button disabled={busy} onClick={() => publishOrClose("publish")}>
              Publish
            </Button>
          ) : null}
          {rfq.status === "OPEN" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => publishOrClose("close")}
            >
              Close RFQ
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isBuyer && rfq.status === "OPEN" ? (
        <form
          onSubmit={submitOffer}
          className="space-y-3 border-t border-[var(--border)] pt-6"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Submit offer
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Unit price" name="unitPrice" type="number" step="0.01" required />
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              step="0.01"
              defaultValue={String(rfq.quantity)}
            />
            <Input label="Lead time (days)" name="leadTimeDays" type="number" />
          </div>
          <Input label="Notes" name="notes" />
          <Button type="submit" disabled={busy}>
            Submit offer
          </Button>
        </form>
      ) : null}

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Offers
        </h2>
        {rfq.offers.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No offers yet.</p>
        ) : (
          rfq.offers.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {o.sellerOrg.name} · {o.currency} {o.unitPrice}/{o.unit}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {o.quantity} {o.unit} · {o.status}
                  {o.notes ? ` · ${o.notes}` : ""}
                </p>
              </div>
              {isBuyer && o.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => decide(o.id, "ACCEPTED")}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => decide(o.id, "REJECTED")}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Timeline
        </h2>
        {rfq.events.map((ev) => (
          <p key={ev.id} className="text-xs text-[var(--fg-muted)]">
            {formatDate(ev.createdAt)} — {ev.type.replaceAll("_", " ")}
            {ev.message ? `: ${ev.message}` : ""}
          </p>
        ))}
      </section>
    </div>
  );
}
