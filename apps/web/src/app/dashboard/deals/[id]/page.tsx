"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/corridors";

type Deal = {
  id: string;
  reference: string;
  title: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  status: string;
  value?: string | number | null;
  currency: string;
  buyerOrg: { name: string; countryCode: string };
  sellerOrg: { name: string; countryCode: string };
  messages: { id: string; authorUserId: string; body: string; createdAt: string }[];
  rfq?: { id: string; reference: string } | null;
  contract?: { id: string; reference: string; status: string } | null;
  trade?: { id: string; tradeNumber: string; status: string; currentStage: string } | null;
};

export default function DealRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<
    "overview" | "messages" | "links"
  >("overview");

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<Deal>(`/deals/${id}`, { token: accessToken })
      .then(setDeal)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Not found"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !id || !body.trim()) return;
    await api(`/deals/${id}`, {
      method: "POST",
      token: accessToken,
      body: { action: "message", body },
    });
    setBody("");
    load();
  }

  if (!deal && !error) {
    return <p className="text-sm text-[var(--fg-muted)]">Loading deal room…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {deal ? (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              {deal.reference} · {deal.status}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {deal.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {deal.commodity} · {deal.quantity} {deal.unit}
              {deal.value != null ? ` · ${deal.currency} ${deal.value}` : ""}
            </p>
            <p className="text-xs text-[var(--fg-muted)]">
              {deal.buyerOrg.name} ({countryName(deal.buyerOrg.countryCode)}) ↔{" "}
              {deal.sellerOrg.name} ({countryName(deal.sellerOrg.countryCode)})
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["overview", "messages", "links"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "primary" : "secondary"}
                onClick={() => setTab(t)}
              >
                {t}
              </Button>
            ))}
          </div>

          {tab === "overview" ? (
            <section className="space-y-2 text-sm border border-[var(--border)] bg-white p-5">
              <p>
                Parties and commercial terms live here. Use Messages to
                negotiate, then link Contract and Trade Passport.
              </p>
              <p className="text-[var(--fg-muted)]">
                Signed in as {user?.email}
              </p>
            </section>
          ) : null}

          {tab === "messages" ? (
            <section className="space-y-4">
              <ul className="space-y-3">
                {deal.messages.map((m) => (
                  <li
                    key={m.id}
                    className="border border-[var(--border)] bg-white px-4 py-3 text-sm"
                  >
                    {m.body}
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
              <form onSubmit={send} className="flex gap-2">
                <input
                  className="h-11 flex-1 rounded-md border border-[var(--border)] px-3 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Negotiate terms…"
                />
                <Button type="submit">Send</Button>
              </form>
            </section>
          ) : null}

          {tab === "links" ? (
            <section className="space-y-3 text-sm">
              {deal.rfq ? (
                <Link
                  className="block text-[var(--accent)] underline"
                  href={`/dashboard/rfqs/${deal.rfq.id}`}
                >
                  RFQ {deal.rfq.reference}
                </Link>
              ) : null}
              {deal.contract ? (
                <Link
                  className="block text-[var(--accent)] underline"
                  href={`/dashboard/contracts/${deal.contract.id}`}
                >
                  Contract {deal.contract.reference} · {deal.contract.status}
                </Link>
              ) : (
                <Link
                  className="block text-[var(--accent)] underline"
                  href="/dashboard/contracts"
                >
                  Open contracts
                </Link>
              )}
              {deal.trade ? (
                <Link
                  className="block text-[var(--accent)] underline"
                  href={`/dashboard/trades/${deal.trade.id}`}
                >
                  Passport {deal.trade.tradeNumber} · {deal.trade.currentStage}
                </Link>
              ) : (
                <Link
                  className="block text-[var(--accent)] underline"
                  href="/dashboard/trade"
                >
                  Open Trade Passports
                </Link>
              )}
              <Link
                className="block text-[var(--accent)] underline"
                href="/dashboard/documents"
              >
                Documents
              </Link>
              <Link
                className="block text-[var(--accent)] underline"
                href="/dashboard/finance"
              >
                Capital / finance
              </Link>
              <Link
                className="block text-[var(--accent)] underline"
                href="/dashboard/logistics"
              >
                Logistics
              </Link>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
