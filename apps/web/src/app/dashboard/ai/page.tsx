"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Insight = {
  id: string;
  kind: string;
  title: string;
  body: string;
  severity?: string;
  score?: number | null;
};

type Job = {
  id: string;
  type: string;
  status: string;
  model?: string | null;
  prompt?: string | null;
  result?: unknown;
  insights?: Insight[];
  createdAt?: string;
};

export default function AiPage() {
  const { accessToken } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [prompt, setPrompt] = useState("");
  const [tradeId, setTradeId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [active, setActive] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await api<Job[]>("/ai/jobs", { token: accessToken });
      setJobs(Array.isArray(res) ? res : []);
    } catch {
      setJobs([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: string, body: Record<string, unknown>) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const job = await api<Job>("/ai/jobs", {
        method: "POST",
        token: accessToken,
        body: { action, ...body },
      });
      setActive(job);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
          AI assistant
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Document analysis, trade risk scoring, and ops Q&amp;A. Uses Koridor
          heuristics by default; OpenAI when <code>OPENAI_API_KEY</code> is set.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3 border-y border-[var(--border)] bg-white/70 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Ask
        </h2>
        <textarea
          className="min-h-[90px] w-full border border-[var(--border)] bg-white px-3 py-2 text-sm"
          placeholder="e.g. How does escrow release work? What blocks readiness?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 border border-[var(--border)] bg-white px-3 py-2 text-sm"
            placeholder="Optional trade id"
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
          />
          <Button
            disabled={loading || !prompt.trim()}
            onClick={() =>
              void run("assistant", {
                prompt,
                tradeId: tradeId || undefined,
              })
            }
          >
            Ask assistant
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Score trade risk
          </h2>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-[var(--border)] bg-white px-3 py-2 text-sm"
              placeholder="Trade UUID"
              value={tradeId}
              onChange={(e) => setTradeId(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={loading || !tradeId.trim()}
              onClick={() => void run("score_trade", { tradeId })}
            >
              Score
            </Button>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Analyze document
          </h2>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-[var(--border)] bg-white px-3 py-2 text-sm"
              placeholder="Document UUID"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={loading || !documentId.trim()}
              onClick={() => void run("analyze_document", { documentId })}
            >
              Analyze
            </Button>
          </div>
        </section>
      </div>

      {active ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Latest result · {active.type} · {active.model ?? "heuristic"}
          </h2>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
            {(active.insights ?? []).map((i) => (
              <div key={i.id} className="px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                  {i.kind} · {i.severity ?? "info"}
                  {i.score != null ? ` · ${i.score}` : ""}
                </p>
                <p className="mt-1 font-medium text-[var(--fg)]">{i.title}</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{i.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Recent jobs
        </h2>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
          {jobs.length === 0 ? (
            <p className="py-6 text-sm text-[var(--fg-muted)]">
              No persisted jobs yet (tables optional until migration).
            </p>
          ) : (
            jobs.map((j) => (
              <button
                key={j.id}
                type="button"
                className="block w-full px-4 py-3 text-left hover:bg-black/[0.02]"
                onClick={() => setActive(j)}
              >
                <p className="text-sm font-medium text-[var(--fg)]">
                  {j.type} · {j.status}
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {(j.insights ?? []).length} insights · {j.model}
                </p>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
