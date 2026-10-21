"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, Clock, FileCheck2, Loader2, ShieldAlert, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Doc = { id: string; type: string; fileName: string; createdAt?: string };
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

/** What we ask every business for. Matches the DocumentType enum. */
const REQUIRED_DOCS = [
  {
    type: "BUSINESS_CERTIFICATE",
    title: "Business registration certificate",
    hint: "Certificate of incorporation or business name registration.",
    required: true,
  },
  {
    type: "TAX_CERTIFICATE",
    title: "Tax certificate",
    hint: "KRA PIN certificate, or your country's tax registration.",
    required: true,
  },
  {
    type: "TRADE_LICENSE",
    title: "Export or trade licence",
    hint: "Optional, e.g. HCD export licence or county trade permit.",
    required: false,
  },
] as const;

function prettyEvent(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase().replaceAll("_", " ");
}

export default function VerificationPage() {
  const { accessToken } = useAuth();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      api<Case[]>("/verification/cases/me", { token: accessToken }),
      api<Doc[]>("/documents", { token: accessToken }),
      api<{ verificationStatus?: string }>("/organisations/me", { token: accessToken }),
    ])
      .then(([c, d, o]) => {
        setCases(c);
        setDocs(d);
        setOrgStatus(o.verificationStatus ?? null);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load"));
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(type: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Files must be 10 MB or smaller.");
      return;
    }
    setUploading(type);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("type", type);
      await api("/documents", { method: "POST", token: accessToken, body });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await api("/verification/cases", {
        method: "POST",
        token: accessToken,
        body: { documentIds: docs.map((d) => d.id) },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send for review");
    } finally {
      setSubmitting(false);
    }
  }

  if (cases === null && !error) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-[var(--fg-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your verification…
      </div>
    );
  }

  const latest = cases?.[0];
  const pending = latest?.status === "PENDING";
  const rejected = latest?.status === "REJECTED";
  const verified = orgStatus === "VERIFIED";
  const docFor = (type: string) => docs.find((d) => d.type === type);
  const ready = REQUIRED_DOCS.filter((d) => d.required).every((d) => docFor(d.type));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="eyebrow">Verification</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          {verified ? "Your business is verified" : "Get your business verified"}
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Every business on Koridor is checked before it can trade, so buyers and
          farms know who they&apos;re dealing with.
        </p>
      </div>

      {verified ? (
        <StatusCard tone="good" icon={BadgeCheck} title="Verified">
          You can be matched, send and accept offers, and sign contracts.
        </StatusCard>
      ) : pending ? (
        <StatusCard tone="wait" icon={Clock} title="Under review">
          Sent {latest?.submittedAt ? formatDate(latest.submittedAt) : "recently"}. We&apos;ll
          notify you here as soon as it&apos;s checked.
        </StatusCard>
      ) : rejected ? (
        <StatusCard tone="bad" icon={ShieldAlert} title="Changes needed">
          {latest?.reviewNotes || "Please check your documents and send them again."}
        </StatusCard>
      ) : null}

      {!verified && !pending ? (
        <section className="card divide-y divide-[var(--border)]">
          {REQUIRED_DOCS.map((d) => {
            const doc = docFor(d.type);
            const busy = uploading === d.type;
            return (
              <div key={d.type} className="flex items-center gap-4 p-5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${doc ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--bg)] text-[var(--fg-muted)]"}`}
                >
                  {doc ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {d.title}
                    {d.required ? "" : " (optional)"}
                  </p>
                  <p className="truncate text-xs text-[var(--fg-muted)]">
                    {doc ? doc.fileName : d.hint}
                  </p>
                </div>
                <label
                  className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition ${busy ? "pointer-events-none opacity-60" : "border-[var(--border)] bg-white hover:border-[var(--accent)]/50"}`}
                >
                  {busy ? "Uploading…" : doc ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(e) => upload(d.type, e)}
                  />
                </label>
              </div>
            );
          })}
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--fg-muted)]">
              PDF or photo, up to 10 MB each. Only Koridor reviewers can open them.
            </p>
            <Button onClick={submit} disabled={!ready || submitting}>
              {submitting ? "Sending…" : "Send for review"}
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {cases?.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--fg-muted)]">History</h2>
          <ol className="card divide-y divide-[var(--border)]">
            {cases.flatMap((c) =>
              c.events
                .slice()
                .reverse()
                .map((ev) => (
                  <li key={ev.id} className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
                    <span>{ev.message || prettyEvent(ev.type)}</span>
                    <span className="shrink-0 text-xs text-[var(--fg-muted)]">
                      {formatDate(ev.createdAt)}
                    </span>
                  </li>
                )),
            )}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function StatusCard({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "good" | "wait" | "bad";
  icon: typeof BadgeCheck;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    good: "border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent)]",
    wait: "border-[var(--gold)]/30 bg-[var(--gold-soft)] text-[var(--gold)]",
    bad: "border-[var(--danger)]/25 bg-[#fbeceb] text-[var(--danger)]",
  }[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-5 ${styles}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-[var(--fg)]">{children}</p>
      </div>
    </div>
  );
}
