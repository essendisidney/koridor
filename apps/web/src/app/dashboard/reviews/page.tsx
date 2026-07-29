"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Case = {
  id: string;
  status: string;
  notes?: string | null;
  submittedAt?: string | null;
  organisation: {
    name: string;
    slug: string;
    type: string;
    countryCode: string;
  };
  documents: { id: string; fileName: string; type: string }[];
};

export default function ReviewsPage() {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.roles.includes("SYSTEM_ADMIN")) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Case[]>("/verification/cases?status=PENDING", { token: accessToken })
      .then(setCases)
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
    setError(null);
    try {
      await api(`/verification/cases/${id}/review`, {
        method: "POST",
        token: accessToken,
        body: {
          decision,
          reviewNotes:
            decision === "APPROVED"
              ? "Approved by Koridor operations"
              : "Insufficient documentation",
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
          Reviews
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Pending KYB verification cases.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        {cases.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No pending cases.</p>
        ) : (
          cases.map((c) => (
            <article
              key={c.id}
              className="space-y-3 border-b border-[var(--border)] pb-4"
            >
              <div>
                <p className="font-medium">{c.organisation.name}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {c.organisation.type.replaceAll("_", " ")} ·{" "}
                  {c.organisation.countryCode} · submitted{" "}
                  {c.submittedAt ? formatDate(c.submittedAt) : "—"}
                </p>
              </div>
              {c.notes ? (
                <p className="text-sm text-[var(--fg-muted)]">{c.notes}</p>
              ) : null}
              <ul className="text-sm text-[var(--fg-muted)]">
                {c.documents.map((d) => (
                  <li key={d.id}>
                    {d.fileName} ({d.type.replaceAll("_", " ")})
                  </li>
                ))}
              </ul>
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
