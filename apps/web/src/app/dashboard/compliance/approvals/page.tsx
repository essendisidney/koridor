"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Cert = {
  id: string;
  reference: string;
  title: string;
  type: string;
  status: string;
  submittedAt?: string | null;
  organisation: { name: string; countryCode: string };
};

export default function ComplianceApprovalsPage() {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed =
    user?.roles.includes("SYSTEM_ADMIN") ||
    user?.permissions?.includes("compliance:review") ||
    user?.permissions?.includes("admin:all");

  useEffect(() => {
    if (user && !allowed) router.replace("/dashboard/compliance");
  }, [user, allowed, router]);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Cert[]>("/compliance/approvals", { token: accessToken })
      .then(setCerts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load queue"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await api(`/compliance/certificates/${id}`, {
        method: "POST",
        token: accessToken,
        body: {
          action: "review",
          decision,
          reviewNotes:
            decision === "APPROVED"
              ? "Approved by government / chamber officer"
              : "Rejected pending additional documentation",
        },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Compliance approvals
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Government / chamber review queue for pending certificates.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        {certs.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No pending certificates.</p>
        ) : (
          certs.map((c) => (
            <article
              key={c.id}
              className="space-y-3 border-b border-[var(--border)] pb-4"
            >
              <div>
                <Link
                  href={`/dashboard/compliance/${c.id}`}
                  className="font-medium text-[var(--accent)]"
                >
                  {c.title}
                </Link>
                <p className="text-xs text-[var(--fg-muted)]">
                  {c.reference} · {c.type.replaceAll("_", " ")} ·{" "}
                  {c.organisation.name} ({c.organisation.countryCode})
                  {c.submittedAt
                    ? ` · submitted ${formatDate(c.submittedAt)}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busyId === c.id}
                  onClick={() => review(c.id, "APPROVED")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === c.id}
                  onClick={() => review(c.id, "REJECTED")}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
