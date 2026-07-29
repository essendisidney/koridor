"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

export default function AuditPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api<AuditLog[]>("/audit", { token: accessToken })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => {
        setError(err?.message ?? "Unable to load audit logs");
        setItems([]);
      });
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Audit logs
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Immutable security and compliance trail for sensitive actions.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[#f7f9fb] text-xs uppercase tracking-[0.1em] text-[var(--fg-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{item.action}</td>
                  <td className="px-4 py-3">
                    {item.entityType}
                    {item.entityId ? ` · ${item.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3">{item.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
