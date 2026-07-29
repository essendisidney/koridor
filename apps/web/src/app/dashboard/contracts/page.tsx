"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Contract = {
  id: string;
  reference: string;
  title: string;
  status: string;
  commodity: string;
  totalValue: string | number;
  currency: string;
  buyerOrg: { name: string };
  sellerOrg: { name: string };
};

export default function ContractsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api<Contract[]>("/contracts", { token: accessToken })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Contracts
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Signed trade agreements, milestones, escrow and shipment requests.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="space-y-2 border-t border-[var(--border)] pt-6">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            No contracts yet. Accept an offer on an RFQ to create one.
          </p>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/contracts/${c.id}`}
              className="block border-b border-[var(--border)] py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-[var(--fg-muted)]">{c.status}</p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {c.reference} · {c.commodity} · {c.currency} {c.totalValue} ·{" "}
                {c.buyerOrg.name} ↔ {c.sellerOrg.name}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
