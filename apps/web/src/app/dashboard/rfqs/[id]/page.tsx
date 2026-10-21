"use client";

import Link from "next/link";
import { Fragment, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildOfferComparisonRow,
  sortOfferRows,
  type OfferComparisonRow,
  type OfferSortKey,
} from "@/lib/offer-comparison";

type OfferVersion = {
  version: number;
  unitPrice: string | number;
  quantity: string | number;
  currency: string;
  createdAt: string;
};

type Offer = {
  id: string;
  unitPrice: string | number;
  quantity: string | number;
  unit: string;
  currency: string;
  status: string;
  notes?: string | null;
  leadTimeDays?: number | null;
  validUntil?: string | null;
  currentVersion?: number;
  versions?: OfferVersion[];
  sellerOrg: {
    id: string;
    name: string;
    trustProfile?: { trustScore: number } | null;
  };
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
  requirementId?: string | null;
  targetPrice?: string | number | null;
  destinationCountry?: string | null;
  incoterm?: string | null;
  notes?: string | null;
  buyerOrgId: string;
  buyerOrg: { id: string; name: string };
  offers: Offer[];
  comparison?: OfferComparisonRow[];
  events: Event[];
};

const RFQ_STATUS: Record<string, string> = {
  DRAFT: "Not sent yet",
  OPEN: "Collecting offers",
  CLOSED: "Closed",
  AWARDED: "Offer accepted",
  CANCELLED: "Cancelled",
};

const OFFER_STATUS: Record<string, string> = {
  PENDING: "Waiting for decision",
  ACCEPTED: "Accepted",
  REJECTED: "Not chosen",
  WITHDRAWN: "Withdrawn",
};

const SORT_OPTIONS: { value: OfferSortKey; label: string }[] = [
  { value: "best_match", label: "Best match" },
  { value: "lowest_landed_cost", label: "Lowest cost delivered" },
  { value: "highest_trust", label: "Most trusted" },
  { value: "earliest_delivery", label: "Earliest delivery" },
];

export default function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<OfferSortKey>("best_match");
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState("");
  const [draftQty, setDraftQty] = useState("");

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

  const sortedOffers = useMemo(() => {
    if (!rfq?.offers.length) return [];
    const rows = rfq.offers.map((o) =>
      buildOfferComparisonRow({
        offer: o,
        destinationCountry: rfq.destinationCountry,
        matchScore:
          rfq.comparison?.find((c) => c.offerId === o.id)?.matchScore ?? 0,
      }),
    );
    return sortOfferRows(rows, sort);
  }, [rfq, sort]);

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
      const res = await api<{ id?: string; dealId?: string }>(`/rfqs/${id}/offers`, {
        method: "PATCH",
        token: accessToken,
        body: { offerId, decision },
      });
      if (decision === "ACCEPTED") {
        const dealId =
          res.dealId ??
          (
            await api<{ id: string }>("/deals", {
              method: "POST",
              token: accessToken,
              body: { offerId },
            })
          ).id;
        window.location.href = `/dashboard/deals/${dealId}`;
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
        {error ?? "Loading quote request…"}
      </p>
    );
  }

  const myOffer = rfq.offers.find(
    (o) => o.sellerOrg.id === user?.organisationId,
  );
  const perTonne = ["MT", "TONNE", "TON"].includes(String(rfq.unit).toUpperCase());
  const priceNum = Number(draftPrice || 0);
  const qtyNum = Number(draftQty || rfq.quantity || 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link href="/dashboard/rfqs" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        ← Quote requests
      </Link>
      <div>
        <p className="eyebrow">Quote request · {RFQ_STATUS[rfq.status] ?? rfq.status}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          {rfq.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {rfq.buyerOrg.name} · {rfq.reference}
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <dl className="card grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[var(--fg-muted)]">Product</dt>
          <dd>{rfq.commodity}</dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Quantity</dt>
          <dd>
            {Number(rfq.quantity).toLocaleString()} {perTonne ? "tonnes" : rfq.unit}
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
          <dt className="text-[var(--fg-muted)]">Delivery terms</dt>
          <dd>{rfq.incoterm ?? "—"}</dd>
        </div>
      </dl>

      {isBuyer ? (
        <div className="flex gap-2">
          {rfq.status === "DRAFT" ? (
            <Button disabled={busy} onClick={() => publishOrClose("publish")}>
              Send to farms
            </Button>
          ) : null}
          {rfq.status === "OPEN" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => publishOrClose("close")}
            >
              Stop taking offers
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isBuyer && rfq.status === "OPEN" ? (
        <form
          onSubmit={submitOffer}
          className="card space-y-4 p-6"
        >
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {myOffer ? "Update your offer" : "Send your offer"}
          </h2>
          {myOffer ? (
            <p className="text-xs text-[var(--fg-muted)]">
              Version {myOffer.currentVersion ?? 1}. The buyer can see earlier versions.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label={perTonne ? "Price per tonne (USD)" : `Price per ${rfq.unit} (USD)`}
              name="unitPrice"
              type="number"
              step="0.01"
              min={perTonne ? 20 : 0.01}
              placeholder={perTonne ? "e.g. 1850" : undefined}
              required
              defaultValue={myOffer ? String(myOffer.unitPrice) : undefined}
              onChange={(e) => setDraftPrice(e.target.value)}
            />
            <Input
              label={perTonne ? "Tonnes you can supply" : "Quantity"}
              name="quantity"
              type="number"
              step="0.01"
              defaultValue={String(myOffer?.quantity ?? rfq.quantity)}
              onChange={(e) => setDraftQty(e.target.value)}
            />
            <Input
              label="Ready in (days)"
              name="leadTimeDays"
              type="number"
              defaultValue={
                myOffer?.leadTimeDays != null
                  ? String(myOffer.leadTimeDays)
                  : undefined
              }
            />
          </div>
          <Input
            label="Note to the buyer (optional)"
            name="notes"
            defaultValue={myOffer?.notes ?? undefined}
          />
          {perTonne && priceNum > 0 ? (
            <p className="rounded-xl bg-[var(--bg)] px-4 py-3 text-sm">
              ${(priceNum / 1000).toFixed(2)} per kg · total{" "}
              <strong>${Math.round(priceNum * qtyNum).toLocaleString()}</strong> for{" "}
              {qtyNum.toLocaleString()} t
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {myOffer ? "Send updated offer" : "Send offer"}
          </Button>
        </form>
      ) : null}

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Offers
            </h2>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              &ldquo;Delivered&rdquo; adds estimated packing, transport, freight and
              insurance to your port. It&apos;s a guide, not a quote.
            </p>
          </div>
          {isBuyer && rfq.offers.length > 1 ? (
            <label className="text-xs text-[var(--fg-muted)]">
              Sort by{" "}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as OfferSortKey)}
                className="ml-1 border border-[var(--border)] bg-white px-2 py-1 text-sm text-[var(--fg)]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {rfq.offers.length === 0 ? (
          <p className="card p-6 text-sm text-[var(--fg-muted)]">No offers yet. We&apos;ve notified the farms; offers appear here as they come in.</p>
        ) : isBuyer ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3 py-2">Farm</th>
                  <th className="px-3 py-2">Volume</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Delivered (est.)</th>
                  <th className="px-3 py-2">Trust</th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Ready in</th>
                  <th className="px-3 py-2">Valid until</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sortedOffers.map((row) => {
                  const offer = rfq.offers.find((o) => o.id === row.offerId)!;
                  return (
                    <Fragment key={row.offerId}>
                      <tr className="border-b border-[var(--border)]">
                        <td className="px-3 py-3 font-medium">
                          {row.supplierName}
                          {row.versionCount > 1 ? (
                            <span className="ml-2 text-xs text-[var(--fg-muted)]">
                              v{row.version}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {row.quantity} {row.unit}
                        </td>
                        <td className="px-3 py-3">
                          {row.currency} {Number(row.unitPrice).toLocaleString()}/{row.unit === "MT" ? "t" : row.unit}
                          {row.unit === "MT" ? (
                            <span className="block text-xs text-[var(--fg-muted)]">
                              ${(Number(row.unitPrice) / 1000).toFixed(2)}/kg
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-[var(--accent)]">
                          ~${row.estimatedLandedCostPerKg.toFixed(2)}/kg
                        </td>
                        <td className="px-3 py-3">{row.trustScore}</td>
                        <td className="px-3 py-3">
                          {row.matchScore ? `${row.matchScore}%` : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {row.leadTimeDays != null
                            ? `${row.leadTimeDays} days`
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {row.validUntil
                            ? formatDate(row.validUntil.toISOString())
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {offer.status === "PENDING" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => decide(row.offerId, "ACCEPTED")}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() => decide(row.offerId, "REJECTED")}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-[var(--fg-muted)]">
                                {OFFER_STATUS[offer.status] ?? offer.status}
                              </span>
                            )}
                            {(offer.versions?.length ?? 0) > 1 ? (
                              <button
                                type="button"
                                className="text-xs text-[var(--accent)] underline"
                                onClick={() =>
                                  setExpandedOffer((cur) =>
                                    cur === row.offerId ? null : row.offerId,
                                  )
                                }
                              >
                                History
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expandedOffer === row.offerId &&
                      offer.versions?.length ? (
                        <tr key={`${row.offerId}-history`}>
                          <td colSpan={9} className="bg-[var(--surface-muted)] px-3 py-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                              Offer version history
                            </p>
                            <ul className="space-y-1 text-xs">
                              {offer.versions.map((v) => (
                                <li key={v.version}>
                                  v{v.version} · {v.currency} {v.unitPrice}/
                                  {offer.unit} · {v.quantity} {offer.unit} ·{" "}
                                  {formatDate(v.createdAt)}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          rfq.offers.map((o) => (
            <div
              key={o.id}
              className="border-b border-[var(--border)] py-3"
            >
              <p className="text-sm font-medium">
                {o.currency} {Number(o.unitPrice).toLocaleString()}/{o.unit === "MT" ? "t" : o.unit} · version {o.currentVersion ?? 1}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {Number(o.quantity).toLocaleString()} {o.unit === "MT" ? "t" : o.unit} ·{" "}
                {OFFER_STATUS[o.status] ?? o.status}
              </p>
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
            {formatDate(ev.createdAt)} —{" "}
            {ev.type.charAt(0) + ev.type.slice(1).toLowerCase().replaceAll("_", " ")}
            {ev.message ? `: ${ev.message}` : ""}
          </p>
        ))}
      </section>
    </div>
  );
}
