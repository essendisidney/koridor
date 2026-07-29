"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Rfq = { id: string; title: string; status: string; reference: string };
type Contract = {
  id: string;
  title: string;
  status: string;
  reference: string;
  totalValue: string | number;
  currency: string;
};

export default function TradePage() {
  const { accessToken } = useAuth();
  const [mine, setMine] = useState<Rfq[]>([]);
  const [open, setOpen] = useState<Rfq[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      api<Rfq[]>("/rfqs?scope=mine", { token: accessToken }),
      api<Rfq[]>("/rfqs?scope=open", { token: accessToken }),
      api<Contract[]>("/contracts", { token: accessToken }),
    ])
      .then(([m, o, c]) => {
        setMine(Array.isArray(m) ? m.slice(0, 5) : []);
        setOpen(Array.isArray(o) ? o.slice(0, 5) : []);
        setContracts(Array.isArray(c) ? c.slice(0, 5) : []);
      })
      .catch(() => {
        setMine([]);
        setOpen([]);
        setContracts([]);
      });
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Trade
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            RFQs, offers, contracts, milestones, escrow and shipment requests.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/rfqs">
            <Button size="sm">RFQs</Button>
          </Link>
          <Link href="/dashboard/contracts">
            <Button size="sm" variant="secondary">
              Contracts
            </Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-6 border-t border-[var(--border)] pt-6 md:grid-cols-3">
        <Stat label="My RFQs" value={String(mine.length)} />
        <Stat label="Open market RFQs" value={String(open.length)} />
        <Stat label="Contracts" value={String(contracts.length)} />
      </section>

      <Section title="My RFQs" href="/dashboard/rfqs">
        {mine.length === 0 ? (
          <Empty text="No RFQs yet. Create one to source goods." />
        ) : (
          mine.map((r) => (
            <Row
              key={r.id}
              href={`/dashboard/rfqs/${r.id}`}
              title={r.title}
              meta={`${r.reference} · ${r.status}`}
            />
          ))
        )}
      </Section>

      <Section title="Open RFQs" href="/dashboard/rfqs?tab=open">
        {open.length === 0 ? (
          <Empty text="No open RFQs from other organisations." />
        ) : (
          open.map((r) => (
            <Row
              key={r.id}
              href={`/dashboard/rfqs/${r.id}`}
              title={r.title}
              meta={`${r.reference} · ${r.status}`}
            />
          ))
        )}
      </Section>

      <Section title="Contracts" href="/dashboard/contracts">
        {contracts.length === 0 ? (
          <Empty text="No contracts yet. Accept an offer to form one." />
        ) : (
          contracts.map((c) => (
            <Row
              key={c.id}
              href={`/dashboard/contracts/${c.id}`}
              title={c.title}
              meta={`${c.reference} · ${c.status} · ${c.currency} ${c.totalValue}`}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {title}
        </h2>
        <Link href={href} className="text-sm text-[var(--accent)]">
          View all
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="block border-b border-[var(--border)] py-3 transition hover:bg-[var(--bg-muted)]/40"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[var(--fg-muted)]">{meta}</p>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[var(--fg-muted)]">{text}</p>;
}
