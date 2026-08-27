"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { countryName } from "@/lib/corridors";
import {
  DEAL_ROOM_TABS,
  NEGOTIABLE_FIELDS,
  type DealRoomTabId,
  type DealTimelineStep,
} from "@/lib/deal-room";

type OrgLite = {
  id: string;
  name: string;
  countryCode: string;
  city?: string | null;
  verificationStatus?: string;
  trustProfile?: { trustScore: number } | null;
};

type DealMessage = {
  id: string;
  authorUserId: string;
  body: string;
  kind?: string;
  field?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
};

type Deal = {
  id: string;
  reference: string;
  title: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  status: string;
  value?: string | number | null;
  currency: string;
  role?: "BUYER" | "SUPPLIER";
  buyerOrg: OrgLite;
  sellerOrg: OrgLite;
  messages: DealMessage[];
  timeline?: DealTimelineStep[];
  documents?: {
    id: string;
    type: string;
    status: string;
    fileName: string;
    organisationId: string;
    createdAt: string;
  }[];
  shipments?: {
    id: string;
    reference: string;
    status: string;
    carrierName?: string | null;
    trackingNumber?: string | null;
    origin?: string | null;
    destination?: string | null;
    bookedAt?: string | null;
    departedAt?: string | null;
    deliveredAt?: string | null;
  }[];
  requirement?: {
    id: string;
    reference: string;
    status: string;
    destinationCountry?: string;
    destinationCity?: string | null;
    destinationPort?: string | null;
    deliveryStart?: string | null;
    deliveryEnd?: string | null;
    incoterm?: string | null;
    paymentTerms?: string | null;
    grade?: string | null;
    certifications?: string[];
    verifiedDemand?: boolean;
  } | null;
  rfq?: {
    id: string;
    reference: string;
    status: string;
    targetPrice?: string | number | null;
    currency?: string;
    originCountry?: string | null;
    destinationCountry?: string | null;
    incoterm?: string | null;
    neededBy?: string | null;
  } | null;
  offer?: {
    id: string;
    status: string;
    unitPrice: string | number;
    quantity: string | number;
    unit: string;
    currency: string;
    incoterm?: string | null;
    leadTimeDays?: number | null;
    currentVersion?: number;
    notes?: string | null;
  } | null;
  contract?: {
    id: string;
    reference: string;
    status: string;
    title?: string;
    unitPrice?: string | number | null;
    totalValue?: string | number | null;
    currency?: string;
    incoterm?: string | null;
  } | null;
  trade?: {
    id: string;
    tradeNumber: string;
    status: string;
    currentStage: string;
    completionPct?: number;
    trustScore?: number;
    riskScore?: number;
  } | null;
};

function Timeline({ steps }: { steps: DealTimelineStep[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {steps.map((s) => (
        <li
          key={s.id}
          className="border border-[var(--border)] bg-white/70 px-3 py-3"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            {s.label}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              s.status === "complete"
                ? "text-[var(--accent)]"
                : s.status === "current"
                  ? "text-[var(--fg)]"
                  : "text-[var(--fg-muted)]"
            }`}
          >
            {s.status === "complete"
              ? "✓ Complete"
              : s.status === "current"
                ? "In progress"
                : "Pending"}
          </p>
          {s.detail ? (
            <p className="mt-1 text-xs text-[var(--fg-muted)]">{s.detail}</p>
          ) : null}
          {s.href ? (
            <Link
              href={s.href}
              className="mt-2 inline-block text-xs text-[var(--accent)] underline"
            >
              Open
            </Link>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default function DealRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DealRoomTabId>("overview");
  const [termField, setTermField] = useState("PRICE");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<Deal>(`/deals/${id}`, { token: accessToken })
      .then(setDeal)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Not found"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !id || !body.trim()) return;
    setBusy(true);
    try {
      await api(`/deals/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action: "message", body },
      });
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function proposeTerm(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !id || !toValue.trim()) return;
    setBusy(true);
    try {
      await api(`/deals/${id}`, {
        method: "POST",
        token: accessToken,
        body: {
          action: "term_change",
          field: termField,
          fromValue,
          toValue,
        },
      });
      setFromValue("");
      setToValue("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Term update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!deal && !error) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-72 animate-pulse bg-[var(--border)]" />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 animate-pulse bg-[var(--border)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!deal) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/deals" className="text-sm text-[var(--accent)]">
        ← Deals
      </Link>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          {deal.reference} · {deal.status.replaceAll("_", " ")}
          {deal.role ? ` · You are ${deal.role}` : ""}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
          {deal.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {deal.commodity} · {deal.quantity} {deal.unit}
          {deal.value != null ? ` · ${deal.currency} ${deal.value}` : ""}
        </p>
        <p className="text-xs text-[var(--fg-muted)]">
          {deal.buyerOrg.name} ({countryName(deal.buyerOrg.countryCode)}) ↔{" "}
          {deal.sellerOrg.name} ({countryName(deal.sellerOrg.countryCode)})
        </p>
      </div>

      {deal.timeline?.length ? <Timeline steps={deal.timeline} /> : null}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        {DEAL_ROOM_TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 border border-[var(--border)] bg-white p-5 text-sm">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Deal summary
            </h2>
            <p>
              Status: <strong>{deal.status.replaceAll("_", " ")}</strong>
            </p>
            <p>
              Value:{" "}
              <strong>
                {deal.value != null
                  ? `${deal.currency} ${deal.value}`
                  : "Not set"}
              </strong>
            </p>
            {deal.requirement?.verifiedDemand ? (
              <p className="text-[var(--accent)]">Verified Demand</p>
            ) : null}
            <p className="text-[var(--fg-muted)]">
              Negotiate in Messages, lock Commercial terms, then advance Contract
              and Trade Passport.
            </p>
          </div>
          <div className="space-y-2 border border-[var(--border)] bg-white p-5 text-sm">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Quick links
            </h2>
            {deal.rfq ? (
              <Link className="block text-[var(--accent)] underline" href={`/dashboard/rfqs/${deal.rfq.id}`}>
                RFQ {deal.rfq.reference}
              </Link>
            ) : null}
            {deal.requirement ? (
              <Link className="block text-[var(--accent)] underline" href={`/dashboard/requirements/${deal.requirement.id}`}>
                Requirement {deal.requirement.reference}
              </Link>
            ) : null}
            {deal.trade ? (
              <Link className="block text-[var(--accent)] underline" href={`/dashboard/trades/${deal.trade.id}`}>
                Passport {deal.trade.tradeNumber}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "parties" ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Buyer", org: deal.buyerOrg },
            { label: "Supplier", org: deal.sellerOrg },
          ].map(({ label, org }) => (
            <div
              key={label}
              className="border border-[var(--border)] bg-white p-5"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                {label}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                {org.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                {countryName(org.countryCode)}
                {org.city ? ` · ${org.city}` : ""}
              </p>
              <p className="mt-1 text-sm">
                Verification: {org.verificationStatus ?? "—"}
              </p>
              <p className="text-sm">
                Trust: {org.trustProfile?.trustScore ?? "—"} / 100
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "commercial" ? (
        <section className="space-y-6">
          <dl className="grid gap-3 border border-[var(--border)] bg-white p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--fg-muted)]">Commodity</dt>
              <dd>{deal.commodity}</dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Quantity</dt>
              <dd>
                {deal.quantity} {deal.unit}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Unit price (offer)</dt>
              <dd>
                {deal.offer
                  ? `${deal.offer.currency} ${deal.offer.unitPrice}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Incoterm</dt>
              <dd>
                {deal.offer?.incoterm ??
                  deal.rfq?.incoterm ??
                  deal.requirement?.incoterm ??
                  "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Destination</dt>
              <dd>
                {deal.requirement?.destinationCity
                  ? `${deal.requirement.destinationCity}, `
                  : ""}
                {deal.requirement?.destinationCountry
                  ? countryName(deal.requirement.destinationCountry)
                  : deal.rfq?.destinationCountry
                    ? countryName(deal.rfq.destinationCountry)
                    : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Payment terms</dt>
              <dd>{deal.requirement?.paymentTerms ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Grade / certs</dt>
              <dd>
                {deal.requirement?.grade ?? "—"}
                {deal.requirement?.certifications?.length
                  ? ` · ${deal.requirement.certifications.join(", ")}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Offer version</dt>
              <dd>v{deal.offer?.currentVersion ?? 1}</dd>
            </div>
          </dl>

          <form
            onSubmit={proposeTerm}
            className="space-y-3 border border-[var(--border)] bg-white p-5"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Propose commercial change
            </h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Structured changes are recorded immutably in the negotiation
              history.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="text-[var(--fg-muted)]">Field</span>
                <select
                  className="mt-1 h-11 w-full border border-[var(--border)] px-3"
                  value={termField}
                  onChange={(e) => setTermField(e.target.value)}
                >
                  {NEGOTIABLE_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="From"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                placeholder="Current"
              />
              <Input
                label="To"
                value={toValue}
                onChange={(e) => setToValue(e.target.value)}
                placeholder="Proposed"
                required
              />
            </div>
            <Button type="submit" disabled={busy}>
              Record change
            </Button>
          </form>
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="space-y-4">
          <ul className="space-y-3">
            {deal.messages.map((m) => (
              <li
                key={m.id}
                className="border border-[var(--border)] bg-white px-4 py-3 text-sm"
              >
                {m.kind === "TERM_CHANGE" ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                    Commercial change
                  </p>
                ) : null}
                <p className={m.kind === "TERM_CHANGE" ? "font-medium" : ""}>
                  {m.body}
                </p>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  {m.authorUserId === user?.id ? "You" : "Counterparty"} ·{" "}
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          {!deal.messages.length ? (
            <p className="text-sm text-[var(--fg-muted)]">
              No messages yet. Start negotiation here.
            </p>
          ) : null}
          <form onSubmit={send} className="flex gap-2">
            <input
              className="h-11 flex-1 rounded-md border border-[var(--border)] px-3 text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Negotiate terms…"
            />
            <Button type="submit" disabled={busy}>
              Send
            </Button>
          </form>
        </section>
      ) : null}

      {tab === "contract" ? (
        <section className="space-y-3 border border-[var(--border)] bg-white p-5 text-sm">
          {deal.contract ? (
            <>
              <p className="font-medium">
                {deal.contract.reference} · {deal.contract.status}
              </p>
              <p>
                {deal.contract.title}
                {deal.contract.totalValue != null
                  ? ` · ${deal.contract.currency} ${deal.contract.totalValue}`
                  : ""}
              </p>
              <Link
                href={`/dashboard/contracts/${deal.contract.id}`}
                className="inline-block text-[var(--accent)] underline"
              >
                Open contract workspace
              </Link>
            </>
          ) : (
            <>
              <p className="text-[var(--fg-muted)]">
                No contract linked yet. Accept an offer to mint one, or attach from
                Contracts.
              </p>
              <Link
                href="/dashboard/contracts"
                className="inline-block text-[var(--accent)] underline"
              >
                Open contracts
              </Link>
            </>
          )}
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="space-y-3">
          {(deal.documents ?? []).length ? (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {deal.documents!.map((d) => (
                <li key={d.id} className="flex justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{d.fileName}</p>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {d.type.replaceAll("_", " ")} · {d.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--fg-muted)]">
              No organisation documents attached yet.
            </p>
          )}
          <Link href="/dashboard/documents" className="text-sm text-[var(--accent)] underline">
            Manage documents
          </Link>
        </section>
      ) : null}

      {tab === "logistics" ? (
        <section className="space-y-3">
          {(deal.shipments ?? []).length ? (
            deal.shipments!.map((s) => (
              <div
                key={s.id}
                className="border border-[var(--border)] bg-white px-4 py-3 text-sm"
              >
                <p className="font-medium">
                  {s.reference} · {s.status}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {s.origin ?? "—"} → {s.destination ?? "—"}
                  {s.carrierName ? ` · ${s.carrierName}` : ""}
                  {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--fg-muted)]">
              No shipments linked. Book logistics after contract.
            </p>
          )}
          <Link href="/dashboard/logistics" className="text-sm text-[var(--accent)] underline">
            Open logistics
          </Link>
        </section>
      ) : null}

      {tab === "finance" ? (
        <section className="space-y-3 border border-[var(--border)] bg-white p-5 text-sm">
          <p>
            V1 stores payment milestones and finance requests — Koridor does not
            process payments.
          </p>
          <p className="text-[var(--fg-muted)]">
            Deal value:{" "}
            {deal.value != null ? `${deal.currency} ${deal.value}` : "—"}
          </p>
          <Link href="/dashboard/finance" className="text-[var(--accent)] underline">
            Open capital desk
          </Link>
        </section>
      ) : null}

      {tab === "passport" ? (
        <section className="space-y-3 border border-[var(--border)] bg-white p-5 text-sm">
          {deal.trade ? (
            <>
              <p className="font-medium">
                {deal.trade.tradeNumber} · {deal.trade.status}
              </p>
              <p>
                Stage: {deal.trade.currentStage}
                {deal.trade.completionPct != null
                  ? ` · ${deal.trade.completionPct}%`
                  : ""}
              </p>
              <p className="text-[var(--fg-muted)]">
                Trust {deal.trade.trustScore ?? "—"} · Risk{" "}
                {deal.trade.riskScore ?? "—"}
              </p>
              <Link
                href={`/dashboard/trades/${deal.trade.id}`}
                className="inline-block text-[var(--accent)] underline"
              >
                Open Trade Passport
              </Link>
            </>
          ) : (
            <>
              <p className="text-[var(--fg-muted)]">
                No Trade Passport linked yet. Accepting an offer mints one.
              </p>
              <Link href="/dashboard/trade" className="text-[var(--accent)] underline">
                Open Trade Passports
              </Link>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
