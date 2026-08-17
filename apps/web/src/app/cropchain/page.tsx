import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";

export const metadata: Metadata = {
  title: "CropChain Africa",
  description:
    "Order-first Kenya–GCC food security corridor on Koridor: connect, verify, negotiate, execute — one transaction through to settlement.",
};

const STEPS = [
  {
    title: "Connect",
    body: "Gulf and Iranian buyers meet Kenyan cooperatives, exporters, KNCCI members, and county producer groups — not 5,000 one-off farmers.",
  },
  {
    title: "Verify",
    body: "KYB, KYC, registry, Halal and certificate of origin sit on the organisation before a seed is financed.",
  },
  {
    title: "Negotiate",
    body: "RFQ with a delivery window (needed-by). Price and volume are locked while the crop is still in the ground.",
  },
  {
    title: "Execute",
    body: "Trade Passport binds documents, escrow or in-kind credit, Mombasa shipping, and settlement to the same lot.",
  },
];

const PILLARS = [
  {
    title: "Trust",
    body: "Buyer and supplier are identifiable, verified, and authorised before goods or money move.",
  },
  {
    title: "Rules",
    body: "Quantity, price, Incoterms, Halal, and origin are known before non-compliance stops the lot.",
  },
  {
    title: "Events",
    body: "Documents and logistics stay on the passport — not in email, WhatsApp, or a side spreadsheet.",
  },
  {
    title: "Finance",
    body: "A funder sees bankability and a locked offtake; settlement releases against delivery evidence.",
  },
];

export default function CropChainPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav ctaHref="/start" ctaLabel="Begin" />

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            CropChain Africa · food security hub
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl">
            Bring signed foreign orders to Kenyan farmers before they plant.
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--fg-muted)] leading-relaxed">
            GCC capital and food-security demand. East African soil. The missing
            piece is not another marketplace — it is one executable corridor.
            Koridor is the operating system; CropChain is the Kenya–Gulf
            program on it.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="border border-[var(--border)] bg-white p-5">
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {s.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
                {s.body}
              </p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Why each side says yes
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border border-[var(--border)] bg-white p-5">
              <p className="font-medium">Farmer / cooperative</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)] leading-relaxed">
                Guaranteed price before planting, inputs on credit against the
                purchase order, payment on delivery — not a broker at the gate
                after harvest.
              </p>
            </div>
            <div className="border border-[var(--border)] bg-white p-5">
              <p className="font-medium">Gulf / Iranian buyer</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)] leading-relaxed">
                One institutional counterparty, one quality standard, dated
                delivery into Sohar, Jeddah, Bandar Abbas, or Umm Qasr — not
                5,000 fragmented smallholders.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            What makes the corridor executable
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <div key={p.title} className="border-l-2 border-[var(--accent)] pl-4">
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)] leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            One corridor. One transaction type.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
            Kenya horticulture, tea, and coffee → Oman, Saudi Arabia, Iran, and
            Iraq. Pre-sold B2B offtake. Cooperatives (including KTDA-linked
            factories) onboarded county by county. Chambers vet producer groups.
            In-kind credit against the locked order. Settlement only when
            inspection and delivery evidence land on the passport.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/start">
              <Button>Begin the corridor</Button>
            </Link>
            <Link href="/kenya">
              <Button variant="secondary">Kenya–GCC directory</Button>
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
