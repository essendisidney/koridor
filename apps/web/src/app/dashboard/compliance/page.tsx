"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CERT_TYPES = [
  "CERTIFICATE_OF_ORIGIN",
  "EXPORT_PERMIT",
  "IMPORT_DOCUMENT",
  "PACKING_LIST",
  "COMMERCIAL_INVOICE",
  "INSPECTION_CERTIFICATE",
  "HALAL_CERTIFICATE",
  "OTHER",
];

type Cert = {
  id: string;
  reference: string;
  title: string;
  type: string;
  status: string;
  expiresAt?: string | null;
  expiryStatus?: string;
  commodity?: string | null;
};

type ExpirySummary = {
  summary: {
    expired: number;
    expiringSoon: number;
    valid: number;
    pending: number;
  };
};

export default function CompliancePage() {
  const { accessToken } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [expiry, setExpiry] = useState<ExpirySummary["summary"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      api<Cert[]>("/compliance/certificates", { token: accessToken }),
      api<ExpirySummary>("/compliance/expiry", { token: accessToken }),
    ])
      .then(([c, e]) => {
        setCerts(c);
        setExpiry(e.summary);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const cert = await api<Cert>("/compliance/certificates", {
        method: "POST",
        token: accessToken,
        body: {
          type: String(form.get("type")),
          title: String(form.get("title")),
          commodity: String(form.get("commodity") || ""),
          quantity: String(form.get("quantity") || ""),
          unit: String(form.get("unit") || "MT"),
          issuingCountry: String(form.get("issuingCountry") || ""),
          destinationCountry: String(form.get("destinationCountry") || ""),
          expiresAt: String(form.get("expiresAt") || ""),
          notes: String(form.get("notes") || ""),
          submit: form.get("submit") === "on",
        },
      });
      window.location.href = `/dashboard/compliance/${cert.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Compliance
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Certificates, permits, packing lists, expiry tracking, and approvals.
          </p>
        </div>
      </div>

      {expiry ? (
        <section className="grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-4">
          <Stat label="Valid" value={String(expiry.valid)} />
          <Stat label="Expiring ≤30d" value={String(expiry.expiringSoon)} />
          <Stat label="Expired" value={String(expiry.expired)} />
          <Stat label="Pending" value={String(expiry.pending)} />
        </section>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Certificates
        </h2>
        {certs.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No certificates yet.</p>
        ) : (
          certs.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/compliance/${c.id}`}
              className="block border-b border-[var(--border)] py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-[var(--fg-muted)]">{c.status}</p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {c.reference} · {c.type.replaceAll("_", " ")}
                {c.expiresAt ? ` · expires ${formatDate(c.expiresAt)}` : ""}
                {c.expiryStatus ? ` · ${c.expiryStatus}` : ""}
              </p>
            </Link>
          ))
        )}
      </section>

      <form
        onSubmit={create}
        className="space-y-3 border-t border-[var(--border)] pt-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Generate certificate
        </h2>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Type</span>
          <select
            name="type"
            required
            className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3"
            defaultValue="CERTIFICATE_OF_ORIGIN"
          >
            {CERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <Input label="Title" name="title" required />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Commodity" name="commodity" />
          <Input label="Quantity" name="quantity" type="number" step="0.01" />
          <Input label="Unit" name="unit" defaultValue="MT" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Issuing country" name="issuingCountry" maxLength={2} />
          <Input
            label="Destination country"
            name="destinationCountry"
            maxLength={2}
          />
          <Input label="Expires" name="expiresAt" type="date" />
        </div>
        <Input label="Notes" name="notes" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="submit" />
          Submit for government approval immediately
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create certificate"}
        </Button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
        {value}
      </p>
    </div>
  );
}
