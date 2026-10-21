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

  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function openDoc(docId: string) {
    if (!accessToken) return;
    // Open the tab first so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open("about:blank", "_blank");
    try {
      const { url } = await api<{ url: string }>(`/documents/${docId}/download-url`, {
        token: accessToken,
      });
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      tab?.close();
      setError(err instanceof ApiError ? err.message : "Could not open document");
    }
  }

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    if (!accessToken) return;
    const reason = (reasons[id] ?? "").trim();
    if (decision === "REJECTED" && !reason) {
      setError("Write what the business needs to fix before rejecting.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api(`/verification/cases/${id}/review`, {
        method: "POST",
        token: accessToken,
        body: {
          decision,
          reviewNotes: decision === "APPROVED" ? reason || "Approved" : reason,
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
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Businesses waiting for verification
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Open each document, then approve, or reject with a note telling them what to fix.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-4">
        {cases.length === 0 ? (
          <p className="card p-6 text-sm text-[var(--fg-muted)]">Nobody is waiting. You&apos;re all caught up.</p>
        ) : (
          cases.map((c) => (
            <article
              key={c.id}
              className="card space-y-4 p-6"
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
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] text-sm">
                {c.documents.length === 0 ? (
                  <li className="px-4 py-3 text-[var(--fg-muted)]">No documents attached.</li>
                ) : null}
                {c.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.fileName}</span>
                      <span className="text-xs text-[var(--fg-muted)]">
                        {d.type.charAt(0) + d.type.slice(1).toLowerCase().replaceAll("_", " ")}
                      </span>
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => openDoc(d.id)}>
                      View
                    </Button>
                  </li>
                ))}
              </ul>
              <textarea
                placeholder="Note to the business (required if rejecting)"
                value={reasons[c.id] ?? ""}
                onChange={(e) => setReasons((r) => ({ ...r, [c.id]: e.target.value }))}
                className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
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
