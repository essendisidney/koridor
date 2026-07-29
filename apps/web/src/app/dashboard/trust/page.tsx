"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TrustMe = {
  trustScore: number;
  scoreBreakdown: {
    profileCompleteness?: number;
    requiredDocuments?: number;
    verificationStatus?: number;
    memberKyc?: number;
    total?: number;
  };
  lastScoredAt?: string | null;
  organisation: {
    name: string;
    verificationStatus: string;
    type: string;
    countryCode?: string;
    city?: string | null;
  };
};

type KycProfile = {
  status: string;
  idDocumentType?: string | null;
  idNumberLast4?: string | null;
  countryCode?: string | null;
} | null;

type Case = {
  id: string;
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  documents: { id: string }[];
};

type Doc = { id: string; type: string; status: string; fileName: string };

export default function TrustPage() {
  const { accessToken } = useAuth();
  const [trust, setTrust] = useState<TrustMe | null>(null);
  const [kyc, setKyc] = useState<KycProfile>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      api<TrustMe>("/trust/me", { token: accessToken }),
      api<KycProfile>("/kyc/me", { token: accessToken }),
      api<Case[]>("/verification/cases/me", { token: accessToken }).catch(
        () => [] as Case[],
      ),
      api<Doc[]>("/documents", { token: accessToken }).catch(() => [] as Doc[]),
    ])
      .then(([t, k, c, d]) => {
        setTrust(t);
        setKyc(k);
        setCases(Array.isArray(c) ? c : []);
        setDocs(Array.isArray(d) ? d : []);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Unable to load identity"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshScore() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const t = await api<TrustMe>("/trust/me", {
        method: "PATCH",
        token: accessToken,
      });
      setTrust(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refresh failed");
    } finally {
      setSaving(false);
    }
  }

  async function submitKyc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setKycError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const profile = await api<KycProfile>("/kyc/me", {
        method: "POST",
        token: accessToken,
        body: {
          idDocumentType: String(form.get("idDocumentType")),
          idNumber: String(form.get("idNumber")),
          countryCode: String(form.get("countryCode")),
        },
      });
      setKyc(profile);
      await refreshScore();
      load();
    } catch (err) {
      setKycError(err instanceof ApiError ? err.message : "KYC submit failed");
    } finally {
      setSaving(false);
    }
  }

  const breakdown = trust?.scoreBreakdown ?? {};
  const openCase = cases.find(
    (c) => c.status === "PENDING" || c.status === "DRAFT",
  );
  const approvedCase = cases.find((c) => c.status === "APPROVED");
  const approvedDocs = docs.filter((d) => d.status === "APPROVED").length;

  const checklist = [
    {
      key: "org",
      label: "Organisation profile",
      ok: Boolean(trust?.organisation.name),
      href: "/dashboard/organisation",
    },
    {
      key: "docs",
      label: "Supporting documents uploaded",
      ok: docs.length > 0,
      href: "/dashboard/documents",
    },
    {
      key: "docs_approved",
      label: "At least one document approved",
      ok: approvedDocs > 0,
      href: "/dashboard/documents",
    },
    {
      key: "kyb",
      label: "KYB verification case",
      ok: Boolean(openCase || approvedCase),
      href: "/dashboard/verification",
    },
    {
      key: "verified",
      label: "Organisation VERIFIED",
      ok: trust?.organisation.verificationStatus === "VERIFIED",
      href: "/dashboard/verification",
    },
    {
      key: "kyc",
      label: "Member KYC submitted",
      ok: Boolean(kyc && kyc.status !== "NONE"),
      href: "#member-kyc",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Identity passport
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Trust score, KYB case, documents, and member KYC — one place to become
            trade-ready.
          </p>
        </div>
        <Button variant="secondary" onClick={refreshScore} disabled={saving}>
          Recalculate
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {trust ? (
        <section className="space-y-4 border-t border-[var(--border)] pt-6">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                Trust score
              </p>
              <p className="font-[family-name:var(--font-display)] text-6xl font-semibold text-[var(--accent)]">
                {trust.trustScore}
              </p>
            </div>
            <div className="pb-2 text-sm text-[var(--fg-muted)]">
              <p className="font-medium text-[var(--fg)]">{trust.organisation.name}</p>
              <p>
                {trust.organisation.verificationStatus.replaceAll("_", " ")} ·{" "}
                {trust.organisation.type.replaceAll("_", " ")}
              </p>
              <p>
                {[trust.organisation.city, trust.organisation.countryCode]
                  .filter(Boolean)
                  .join(", ") || "Location TBD"}
              </p>
              {trust.lastScoredAt ? (
                <p className="text-xs">Scored {formatDate(trust.lastScoredAt)}</p>
              ) : null}
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-[var(--border)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${Math.min(100, trust.trustScore)}%` }}
            />
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Profile completeness", breakdown.profileCompleteness, 25],
              ["Required documents", breakdown.requiredDocuments, 25],
              ["Verification status", breakdown.verificationStatus, 30],
              ["Member KYC", breakdown.memberKyc, 20],
            ].map(([label, value, max]) => (
              <div key={String(label)} className="text-sm">
                <dt className="text-[var(--fg-muted)]">{label}</dt>
                <dd className="font-medium">
                  {value ?? 0} / {max}
                </dd>
                <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[var(--border)]">
                  <div
                    className="h-full bg-[var(--accent)]/80"
                    style={{
                      width: `${Math.min(100, ((Number(value) || 0) / Number(max)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Identity checklist
        </h2>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
          {checklist.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                <span className="mr-2">{item.ok ? "✓" : "○"}</span>
                {item.label}
              </span>
              <Link href={item.href} className="text-xs text-[var(--accent)] underline">
                {item.ok ? "View" : "Fix"}
              </Link>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/dashboard/documents">
            <Button variant="secondary" size="sm">
              Documents ({docs.length})
            </Button>
          </Link>
          <Link href="/dashboard/verification">
            <Button size="sm">
              {openCase
                ? `KYB ${openCase.status}`
                : approvedCase
                  ? "KYB approved"
                  : "Start KYB"}
            </Button>
          </Link>
          <Link href="/dashboard/registry">
            <Button variant="secondary" size="sm">
              Registry
            </Button>
          </Link>
        </div>
      </section>

      <section id="member-kyc" className="space-y-4 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Member KYC
        </h2>
        {kyc ? (
          <p className="text-sm text-[var(--fg-muted)]">
            Status: <span className="text-[var(--fg)]">{kyc.status}</span>
            {kyc.idDocumentType
              ? ` · ${kyc.idDocumentType.replaceAll("_", " ")}`
              : ""}
            {kyc.idNumberLast4 ? ` · ****${kyc.idNumberLast4}` : ""}
            {kyc.countryCode ? ` · ${kyc.countryCode}` : ""}
          </p>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            No KYC profile yet. Submit an identity document for review.
          </p>
        )}
        <form onSubmit={submitKyc} className="grid max-w-lg gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">ID type</span>
            <select
              name="idDocumentType"
              required
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3"
              defaultValue="NATIONAL_ID"
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVERS_LICENSE">Driver&apos;s license</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">ID number</span>
            <input
              name="idNumber"
              required
              minLength={4}
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Country (ISO-2)</span>
            <input
              name="countryCode"
              required
              maxLength={2}
              defaultValue="KE"
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 uppercase"
            />
          </label>
          {kycError ? (
            <p className="text-sm text-[var(--danger)]">{kycError}</p>
          ) : null}
          <Button type="submit" disabled={saving}>
            Submit KYC
          </Button>
        </form>
      </section>
    </div>
  );
}
