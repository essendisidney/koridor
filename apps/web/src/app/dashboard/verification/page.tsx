"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Doc = { id: string; type: string; fileName: string };
type Event = { id: string; type: string; message?: string | null; createdAt: string };
type Case = {
  id: string;
  status: string;
  notes?: string | null;
  reviewNotes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  documents: Doc[];
  events: Event[];
};

export default function VerificationPage() {
  const { accessToken } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      api<Case[]>("/verification/cases/me", { token: accessToken }),
      api<Doc[]>("/documents", { token: accessToken }),
    ])
      .then(([c, d]) => {
        setCases(c);
        setDocs(d);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const openCase = cases.find(
    (c) => c.status === "PENDING" || c.status === "DRAFT",
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await api("/verification/cases", {
        method: "POST",
        token: accessToken,
        body: { notes, documentIds: selected },
      });
      setNotes("");
      setSelected([]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Verification
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Submit a KYB package for Koridor operations to review.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {!openCase ? (
        <form
          onSubmit={submit}
          className="space-y-4 border-t border-[var(--border)] pt-6"
        >
          <p className="text-sm text-[var(--fg-muted)]">
            Attach trade license and tax certificate from{" "}
            <Link href="/dashboard/documents" className="text-[var(--accent)]">
              Documents
            </Link>
            , then submit.
          </p>
          <div className="space-y-2">
            {docs.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)]">
                No documents available. Upload documents first.
              </p>
            ) : (
              docs.map((doc) => (
                <label
                  key={doc.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(doc.id)}
                    onChange={() => toggle(doc.id)}
                  />
                  <span>
                    {doc.fileName}{" "}
                    <span className="text-[var(--fg-muted)]">
                      ({doc.type.replaceAll("_", " ")})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={loading || docs.length === 0}>
            {loading ? "Submitting…" : "Submit for review"}
          </Button>
        </form>
      ) : (
        <p className="border-t border-[var(--border)] pt-6 text-sm text-[var(--fg-muted)]">
          A case is already open ({openCase.status}). Wait for review before
          submitting again.
        </p>
      )}

      <section className="space-y-6 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Case history
        </h2>
        {cases.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No cases yet.</p>
        ) : (
          cases.map((c) => (
            <article key={c.id} className="space-y-2">
              <p className="text-sm font-medium">
                {c.status}
                {c.submittedAt ? ` · submitted ${formatDate(c.submittedAt)}` : ""}
              </p>
              {c.reviewNotes ? (
                <p className="text-sm text-[var(--fg-muted)]">
                  Reviewer: {c.reviewNotes}
                </p>
              ) : null}
              <ul className="space-y-1 border-l border-[var(--border)] pl-4">
                {c.events.map((ev) => (
                  <li key={ev.id} className="text-xs text-[var(--fg-muted)]">
                    {formatDate(ev.createdAt)} — {ev.type.replaceAll("_", " ")}
                    {ev.message ? `: ${ev.message}` : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
