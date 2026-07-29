"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Payload = {
  documentTitle?: string;
  organisationName?: string;
  type?: string;
  commodity?: string | null;
  quantity?: number | null;
  unit?: string | null;
  issuingCountry?: string | null;
  destinationCountry?: string | null;
  contractReference?: string | null;
  notes?: string | null;
  clauses?: string[];
  generatedAt?: string;
};

type Event = { id: string; type: string; message?: string | null; createdAt: string };

type Cert = {
  id: string;
  reference: string;
  title: string;
  type: string;
  status: string;
  expiresAt?: string | null;
  issuedAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  expiryStatus?: string;
  commodity?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  notes?: string | null;
  payload: Payload;
  organisation: { name: string; countryCode: string };
  contract?: { id: string; reference: string; title: string } | null;
  events: Event[];
};

export default function ComplianceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [cert, setCert] = useState<Cert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canReview =
    user?.roles.includes("SYSTEM_ADMIN") ||
    user?.permissions?.includes("compliance:review") ||
    user?.permissions?.includes("admin:all");

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<Cert>(`/compliance/certificates/${id}`, { token: accessToken })
      .then(setCert)
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
      await api(`/compliance/certificates/${id}`, {
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

  if (!cert) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">
        {error ?? "Loading certificate…"}
      </p>
    );
  }

  const payload = cert.payload ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/dashboard/compliance" className="text-sm text-[var(--accent)]">
        ← Compliance
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            {cert.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {cert.reference} · {cert.status}
            {cert.expiryStatus ? ` · ${cert.expiryStatus}` : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => window.print()}
        >
          Print / export
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {(cert.status === "DRAFT" || cert.status === "REJECTED") && (
          <Button disabled={busy} onClick={() => act("submit")}>
            Submit for approval
          </Button>
        )}
        {canReview && cert.status === "PENDING_APPROVAL" ? (
          <>
            <Button
              disabled={busy}
              onClick={() =>
                act("review", {
                  decision: "APPROVED",
                  reviewNotes: "Approved by compliance officer",
                })
              }
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                act("review", {
                  decision: "REJECTED",
                  reviewNotes: "Insufficient supporting detail",
                })
              }
            >
              Reject
            </Button>
          </>
        ) : null}
      </div>

      <article
        id="certificate-document"
        className="space-y-4 border border-[var(--border)] bg-white p-8 print:border-0"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          Koridor compliance document
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {payload.documentTitle ?? cert.title}
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Ref {cert.reference} · {cert.type.replaceAll("_", " ")}
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--fg-muted)]">Organisation</dt>
            <dd>{payload.organisationName ?? cert.organisation.name}</dd>
          </div>
          <div>
            <dt className="text-[var(--fg-muted)]">Commodity</dt>
            <dd>
              {payload.commodity ?? cert.commodity ?? "—"}
              {payload.quantity != null
                ? ` · ${payload.quantity} ${payload.unit ?? ""}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--fg-muted)]">Route</dt>
            <dd>
              {payload.issuingCountry ?? "—"} →{" "}
              {payload.destinationCountry ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--fg-muted)]">Validity</dt>
            <dd>
              Issued {cert.issuedAt ? formatDate(cert.issuedAt) : "—"} · Expires{" "}
              {cert.expiresAt ? formatDate(cert.expiresAt) : "—"}
            </dd>
          </div>
          {cert.contract ? (
            <div className="sm:col-span-2">
              <dt className="text-[var(--fg-muted)]">Linked contract</dt>
              <dd>
                <Link
                  href={`/dashboard/contracts/${cert.contract.id}`}
                  className="text-[var(--accent)]"
                >
                  {cert.contract.reference} — {cert.contract.title}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
        {payload.clauses?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--fg-muted)]">
            {payload.clauses.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
        {cert.notes || payload.notes ? (
          <p className="text-sm">{cert.notes ?? payload.notes}</p>
        ) : null}
      </article>

      <section className="space-y-2 border-t border-[var(--border)] pt-6 print:hidden">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Timeline
        </h2>
        {cert.events.map((ev) => (
          <p key={ev.id} className="text-xs text-[var(--fg-muted)]">
            {formatDate(ev.createdAt)} — {ev.type.replaceAll("_", " ")}
            {ev.message ? `: ${ev.message}` : ""}
          </p>
        ))}
      </section>
    </div>
  );
}
