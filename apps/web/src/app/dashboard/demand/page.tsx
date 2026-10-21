"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type Req = {
  id: string;
  reference: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  destinationCountry: string;
  verifiedDemand: boolean;
  status: string;
  buyerOrg?: { name: string; countryCode: string; verificationStatus: string };
  match?: { score: number; reasons: string[]; status: string };
  openRfqId?: string | null;
};

export default function BuyerDemandPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Req[]>([]);
  const [forMe, setForMe] = useState<Req[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      api<Req[]>("/requirements?scope=for-me", { token: accessToken }),
      api<Req[]>("/requirements?scope=public", { token: accessToken }),
    ])
      .then(([mine, all]) => {
        setForMe(mine);
        const matchedIds = new Set(mine.map((r) => r.id));
        setRows(all.filter((r) => !matchedIds.has(r.id)));
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed"),
      );
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Buyers looking for your products
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Real buyers abroad who need what you grow. Reply to their quote requests to win the order.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {forMe.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            Matched to your supply
          </h2>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {forMe.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">
                    {r.commodity} · {r.quantity} {r.unit}
                    {r.match ? (
                      <span className="ml-2 text-xs text-[var(--fg-muted)]">
                        {r.match.score}% match
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {countryName(r.destinationCountry)} · {r.reference}
                    {r.verifiedDemand ? " · Verified Demand" : ""}
                  </p>
                  {r.match?.reasons?.length ? (
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      {r.match.reasons.slice(0, 3).join(" · ")}
                    </p>
                  ) : null}
                </div>
                {r.openRfqId ? (
                  <Link href={`/dashboard/rfqs/${r.openRfqId}`}>
                    <Button>Send offer</Button>
                  </Link>
                ) : (
                  <span className="text-xs text-[var(--fg-muted)]">
                    The buyer is choosing farms. We&apos;ll text you when they ask you for a quote.
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {forMe.length ? (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
          All open demand
        </h2>
      ) : null}
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <p className="font-medium">
                {r.commodity} · {r.quantity} {r.unit}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {countryName(r.destinationCountry)} · {r.reference}
                {r.verifiedDemand ? " · Verified Demand" : ""}
              </p>
            </div>
            <Link href="/dashboard/rfqs?scope=open">
              <Button variant="secondary">Quote requests</Button>
            </Link>
          </li>
        ))}
      </ul>
      {!rows.length && !error ? (
        <p className="text-sm text-[var(--fg-muted)]">
          No published requirements yet.
        </p>
      ) : null}
    </div>
  );
}
