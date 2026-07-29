"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Doc = {
  id: string;
  type: string;
  status: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const DOC_TYPES = [
  "TRADE_LICENSE",
  "TAX_CERTIFICATE",
  "BUSINESS_CERTIFICATE",
  "ID_DOCUMENT",
  "OTHER",
];

export default function DocumentsPage() {
  const { accessToken } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Doc[]>("/documents", { token: accessToken })
      .then(setDocs)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setUploading(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await api<Doc>("/documents", {
        method: "POST",
        token: accessToken,
        body: data,
      });
      form.reset();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function openDoc(id: string) {
    if (!accessToken) return;
    try {
      const { url } = await api<{ url: string }>(`/documents/${id}/download-url`, {
        token: accessToken,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to open file");
    }
  }

  async function removeDoc(id: string) {
    if (!accessToken) return;
    try {
      await api(`/documents/${id}`, { method: "DELETE", token: accessToken });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Documents
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Trade licenses, tax certificates, and supporting evidence for KYB.
        </p>
      </div>

      <form
        onSubmit={onUpload}
        className="grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2"
      >
        <label className="text-sm sm:col-span-1">
          <span className="mb-1.5 block font-medium">Document type</span>
          <select
            name="type"
            required
            className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3"
            defaultValue="TRADE_LICENSE"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="mb-1.5 block font-medium">File (PDF/image, max 10MB)</span>
          <input
            name="file"
            type="file"
            required
            accept=".pdf,image/*,.doc,.docx"
            className="block w-full text-sm"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        {docs.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No documents uploaded yet.</p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-3"
            >
              <div>
                <p className="text-sm font-medium">{doc.fileName}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {doc.type.replaceAll("_", " ")} · {doc.status} ·{" "}
                  {Math.round(doc.sizeBytes / 1024)} KB · {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => openDoc(doc.id)}
                >
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => removeDoc(doc.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
