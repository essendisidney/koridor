"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Readiness = {
  pct: number;
  items: { key: string; label: string; ok: boolean; stub?: boolean }[];
  missing: string[];
};

type Completion = {
  pct: number;
  complete: boolean;
  milestoneCount: number;
  completedCount: number;
};

type TradeDetail = {
  id: string;
  tradeNumber: string;
  title: string;
  status: string;
  currentStage: string;
  completionPct: number;
  riskScore: number;
  trustScore: number;
  commodity: string;
  quantity: string | number;
  unit: string;
  value?: string | number | null;
  currency: string;
  originCountry?: string | null;
  destinationCountry?: string | null;
  corridor?: string | null;
  incoterms?: string | null;
  createdAt: string;
  updatedAt: string;
  buyerOrg: { id: string; name: string; slug: string; verificationStatus: string };
  sellerOrg?: {
    id: string;
    name: string;
    slug: string;
    verificationStatus: string;
  } | null;
  participants: {
    id: string;
    role: string;
    organisation: { name: string; slug: string; type: string };
  }[];
  milestones: {
    id: string;
    code: string;
    title: string;
    status: string;
    sequence: number;
    requiredEvidenceTypes: string[];
    evidence: { id: string; type: string; title: string }[];
  }[];
  timeline: {
    id: string;
    type: string;
    message?: string | null;
    createdAt: string;
  }[];
  contracts: {
    id: string;
    reference: string;
    status: string;
    escrowRequests: {
      id: string;
      amount: string | number;
      status: string;
      currency: string;
      escrowAccount?: { id: string; reference: string; status: string } | null;
    }[];
    shipmentRequests: {
      id: string;
      status: string;
      shipment?: {
        id: string;
        reference: string;
        status: string;
      } | null;
    }[];
  }[];
  certificates: {
    id: string;
    reference: string;
    title: string;
    status: string;
    type: string;
  }[];
  readiness: Readiness;
  completion: Completion;
  executable?: {
    executable: boolean;
    readyToExecute?: boolean;
    settled?: boolean;
    pct: number;
    pillars: Record<
      string,
      { ok: boolean; passed: number; total: number }
    >;
    tests: {
      id: string;
      pillar: string;
      question: string;
      ok: boolean;
      detail: string;
      href?: string;
      blocking?: boolean;
    }[];
    nextAction: string;
  };
};

const EVIDENCE_TYPES = [
  "CONTRACT_PDF",
  "DIGITAL_SIGNATURE",
  "DOCUMENT",
  "CERTIFICATE",
  "INSPECTION_REPORT",
  "BILL_OF_LADING",
  "PHOTO",
  "GPS_EVENT",
  "CARRIER_CONFIRMATION",
  "PROOF_OF_DELIVERY",
  "PAYMENT_PROOF",
  "OTHER",
];

export default function TradeWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<TradeDetail>(`/trades/${id}`, { token: accessToken })
      .then(setTrade)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/trades/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action, ...body },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  if (!trade && !error) {
    return <p className="text-sm text-[var(--fg-muted)]">Loading passport…</p>;
  }

  if (!trade) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <Link href="/dashboard/trade" className="text-sm underline">
          Back to trades
        </Link>
      </div>
    );
  }

  const contract = trade.contracts[0];
  const nextTest = trade.executable?.tests.find((t) => !t.ok);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs text-[var(--fg-muted)]">
          <Link href="/dashboard" className="underline">
            Home
          </Link>
          {" · "}
          <Link href="/dashboard/trade" className="underline">
            Passports
          </Link>
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Step 4 of 4 · Execute
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
          {trade.tradeNumber}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {trade.title} · {trade.originCountry || "—"} →{" "}
          {trade.destinationCountry || "—"} · {trade.commodity} ·{" "}
          {trade.quantity} {trade.unit}
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {trade.executable ? (
        <section className="space-y-4 border border-[var(--border)] bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
                This lot
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
                {trade.executable.settled
                  ? "Settled on this passport"
                  : trade.executable.readyToExecute || trade.executable.executable
                    ? "Ready to execute"
                    : "Close the open tests"}
              </h2>
            </div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--accent)]">
              {trade.executable.pct}%
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.min(100, trade.executable.pct)}%` }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {(["trust", "rules", "events", "finance"] as const).map((key) => {
              const p = trade.executable!.pillars[key];
              return (
                <div key={key}>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                    {key}
                  </p>
                  <p className="text-sm font-medium">
                    {p?.ok ? "Ready" : "Open"} · {p?.passed}/{p?.total}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-sm">{trade.executable.nextAction}</p>
          {nextTest && !nextTest.ok ? (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-sm font-medium">{nextTest.question}</p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                {nextTest.detail}
              </p>
              {nextTest.href ? (
                <Link href={nextTest.href} className="mt-3 inline-block">
                  <Button size="sm">Fix this</Button>
                </Link>
              ) : null}
            </div>
          ) : null}
          <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {trade.executable.tests.map((t) => (
              <li key={t.id} className="py-2 text-sm">
                <p>
                  <span className="mr-2">{t.ok ? "✓" : "○"}</span>
                  {t.question}
                  {t.blocking && !t.ok ? (
                    <span className="ml-2 text-xs text-[var(--danger)]">
                      Required
                    </span>
                  ) : null}
                </p>
                {!t.ok ? (
                  <p className="pl-6 text-xs text-[var(--fg-muted)]">
                    {t.detail}
                    {t.href ? (
                      <>
                        {" "}
                        <Link href={t.href} className="text-[var(--accent)] underline">
                          Fix
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="text-sm text-[var(--fg-muted)]">
          Corridor {trade.corridor || "—"} ·{" "}
          {trade.incoterms || "Incoterms TBD"}
          {trade.value != null ? ` · ${trade.currency} ${trade.value}` : ""}
        </p>
      </section>

      <details className="border-t border-[var(--border)] pt-4">
        <summary className="cursor-pointer text-sm font-medium">
          Operator tools
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={loading} onClick={() => act("advance")}>
            Advance stage
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => act("recompute")}
          >
            Recompute
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => act("dispute", { notes: "Marked disputed" })}
          >
            Dispute
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => act("cancel", { notes: "Cancelled" })}
          >
            Cancel
          </Button>
        </div>
      </details>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Parties
        </h2>
        {trade.participants.map((p) => (
          <p key={p.id} className="text-sm">
            {p.role.replaceAll("_", " ")} · {p.organisation.name} (
            {p.organisation.type})
          </p>
        ))}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Milestones
        </h2>
        {trade.milestones.map((m) => {
          const have = new Set(m.evidence.map((e) => e.type));
          const missing = m.requiredEvidenceTypes.filter((t) => !have.has(t));
          return (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2"
          >
            <div>
              <p className="text-sm font-medium">
                {m.sequence}. {m.title}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {m.status}
                {m.evidence.length ? ` · ${m.evidence.length} evidence` : ""}
              </p>
              {missing.length > 0 && m.status !== "COMPLETED" ? (
                <p className="mt-0.5 text-xs text-[var(--danger)]">
                  Missing: {missing.join(", ")}
                </p>
              ) : null}
            </div>
            {m.status !== "COMPLETED" ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={loading}
                onClick={() => act("complete_milestone", { code: m.code })}
              >
                Complete
              </Button>
            ) : (
              <span className="text-xs text-[var(--fg-muted)]">Done</span>
            )}
          </div>
          );
        })}
      </section>

      <form
        id="evidence"
        className="space-y-3 border-t border-[var(--border)] pt-6"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          act("attach_evidence", {
            type: String(form.get("type")),
            title: String(form.get("title")),
            milestoneCode: String(form.get("milestoneCode") || ""),
            referenceRef: String(form.get("referenceRef") || ""),
            contentHash: String(form.get("contentHash") || ""),
          });
        }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Attach evidence
        </h2>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Type</span>
          <select
            name="type"
            className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3"
            defaultValue="DOCUMENT"
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <Input label="Title" name="title" required />
        <Input
          label="Milestone code"
          name="milestoneCode"
          placeholder="CONTRACT_SIGNED"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Reference" name="referenceRef" />
          <Input label="Content hash" name="contentHash" />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          Attach
        </Button>
      </form>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Finance
        </h2>
        {!contract ? (
          <p className="text-sm text-[var(--fg-muted)]">No linked contract.</p>
        ) : (
          <>
            <Link
              href={`/dashboard/contracts/${contract.id}`}
              className="text-sm underline"
            >
              {contract.reference} · {contract.status}
            </Link>
            {contract.escrowRequests.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)]">No escrow yet.</p>
            ) : (
              contract.escrowRequests.map((e) => (
                <p key={e.id} className="text-sm text-[var(--fg-muted)]">
                  Escrow {e.currency} {e.amount} · {e.status}
                  {e.escrowAccount
                    ? ` · ${e.escrowAccount.reference} ${e.escrowAccount.status}`
                    : ""}
                </p>
              ))
            )}
            <Link href="/dashboard/finance" className="text-sm underline">
              Open Finance
            </Link>
          </>
        )}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Logistics
        </h2>
        {!contract || contract.shipmentRequests.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No shipments yet.</p>
        ) : (
          contract.shipmentRequests.map((s) => (
            <p key={s.id} className="text-sm">
              Request {s.status}
              {s.shipment ? (
                <>
                  {" · "}
                  <Link
                    href={`/dashboard/logistics/${s.shipment.id}`}
                    className="underline"
                  >
                    {s.shipment.reference}
                  </Link>{" "}
                  ({s.shipment.status})
                </>
              ) : null}
            </p>
          ))
        )}
        <Link href="/dashboard/logistics" className="text-sm underline">
          Open Logistics
        </Link>
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Compliance
        </h2>
        {trade.certificates.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No certificates linked.</p>
        ) : (
          trade.certificates.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/compliance/${c.id}`}
              className="block text-sm"
            >
              {c.reference} · {c.title} · {c.status}
            </Link>
          ))
        )}
        <Link href="/dashboard/compliance" className="text-sm underline">
          Open Compliance
        </Link>
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Timeline
        </h2>
        {trade.timeline.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No events yet.</p>
        ) : (
          trade.timeline.map((ev) => (
            <p key={ev.id} className="text-xs text-[var(--fg-muted)]">
              {formatDate(ev.createdAt)} — {ev.type.replaceAll("_", " ")}
              {ev.message ? `: ${ev.message}` : ""}
            </p>
          ))
        )}
      </section>
    </div>
  );
}
