import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { productImage } from "@/components/product-card";
import { OPEN_DEMAND_STATUSES } from "@/lib/match-engine";
import { prisma } from "@/lib/prisma";
import { countryName } from "@/lib/corridors";
import { MONTHS, productBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = productBySlug(slug);
  if (!p) return {};
  return {
    title: `Buy Kenyan ${p.name}`,
    description: `${p.blurb} Verified farms, escrow payment, export documents handled.`,
  };
}

async function loadMarket(terms: string[]) {
  const commodityOr = terms.map((t) => ({
    commodity: { contains: t, mode: "insensitive" as const },
  }));
  try {
    const [lots, demand] = await Promise.all([
      prisma.supplyLot.findMany({
        where: {
          deletedAt: null,
          status: { in: ["DECLARED", "VERIFIED", "EXPORT_ELIGIBLE"] },
          availableQuantity: { gt: 0 },
          OR: commodityOr,
        },
        include: {
          supplierOrg: {
            select: { name: true, slug: true, city: true, verificationStatus: true },
          },
        },
        orderBy: { availableQuantity: "desc" },
        take: 12,
      }),
      prisma.buyerRequirement.findMany({
        where: {
          deletedAt: null,
          status: { in: OPEN_DEMAND_STATUSES },
          OR: commodityOr,
        },
        select: {
          id: true,
          quantity: true,
          unit: true,
          destinationCountry: true,
          verifiedDemand: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
    ]);
    return { lots, demand, error: false };
  } catch {
    return { lots: [], demand: [], error: true };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = productBySlug(slug);
  if (!p) notFound();
  const { lots, demand, error } = await loadMarket(p.match);
  const totalAvailable = lots.reduce((s, l) => s + Number(l.availableQuantity), 0);
  const buyHref = `/register?role=BUYER&commodity=${encodeURIComponent(p.name)}`;

  return (
    <div className="min-h-screen">
      <PublicNav ctaHref={buyHref} />
      <section className="relative isolate overflow-hidden bg-[#0a1f18] text-[#f7f5ef]">
        <Image
          src={productImage(p.slug)}
          alt={`Kenyan ${p.name}`}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,26,20,0.92)_0%,rgba(8,26,20,0.7)_55%,rgba(8,26,20,0.35)_100%)]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-20 pt-16 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> All products
            </Link>
            <p className="eyebrow mt-6">Direct from Kenya</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-[-0.03em] md:text-6xl">
              Kenyan <span className="text-gradient-gold italic">{p.name}</span>
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-white/70">{p.blurb}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={buyHref}>
              <Button size="lg" variant="gold">Get quotes</Button>
            </Link>
            <Link href="/register?role=FARMER">
              <Button size="lg" variant="light">
                I grow this
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <main className="relative z-10 mx-auto -mt-8 max-w-6xl space-y-8 px-4 pb-20 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Indicative price" value={`$${p.fobUsdPerKg[0]}–${p.fobUsdPerKg[1]}/kg`} note="FOB Kenya" />
          <Stat
            label="Available now"
            value={error ? "—" : `${Math.round(totalAvailable).toLocaleString()} MT`}
            note={error ? "Live data unavailable" : `${lots.length} listed lots`}
          />
          <Stat
            label="Buyers sourcing"
            value={error ? "—" : String(demand.length)}
            note="Open requests"
          />
        </section>

        <section className="card p-6">
          <p className="eyebrow">Harvest calendar · typical</p>
          <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {MONTHS.map((m, i) => {
              const on = p.seasonMonths.includes(i + 1);
              return (
                <div
                  key={i}
                  className={`rounded-lg py-2.5 text-center text-xs font-medium ${on ? "bg-[var(--accent)] text-white shadow-[0_6px_14px_-8px_rgba(29,107,79,0.9)]" : "bg-[#f1eee6] text-[var(--fg-muted)]"}`}
                >
                  {m}
                </div>
              );
            })}
          </div>
          <dl className="mt-6 grid gap-5 border-t border-[var(--border)] pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--fg-muted)]">Varieties</dt>
              <dd>{p.varieties.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Packaging</dt>
              <dd>{p.packaging}</dd>
            </div>
            <div>
              <dt className="text-[var(--fg-muted)]">Common certifications</dt>
              <dd>{p.certifications.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[-0.02em]">Farms selling now</h2>
            {lots.length ? (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {lots.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="flex items-center gap-1 font-medium">
                        {l.supplierOrg.name}
                        {l.supplierOrg.verificationStatus === "VERIFIED" ? (
                          <BadgeCheck className="h-4 w-4 text-[var(--accent)]" aria-label="Verified" />
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {[l.variety, l.grade && `Grade ${l.grade}`, l.originRegion ?? l.supplierOrg.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-medium">
                      {Number(l.availableQuantity).toLocaleString()} {l.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--fg-muted)]">
                No lots listed right now — post a request and we&apos;ll notify farms that grow it.
              </p>
            )}
          </div>
          <div className="card p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[-0.02em]">Buyers looking for {p.name.toLowerCase()}</h2>
            {demand.length ? (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {demand.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      {countryName(d.destinationCountry)}
                      {d.verifiedDemand ? (
                        <span className="ml-2 text-xs text-[var(--accent)]">Verified buyer</span>
                      ) : null}
                    </span>
                    <span className="font-medium">
                      {Number(d.quantity).toLocaleString()} {d.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--fg-muted)]">No open requests yet.</p>
            )}
            <Link
              href="/register?role=FARMER"
              className="mt-4 inline-block text-sm font-medium text-[var(--accent)]"
            >
              Sell to these buyers →
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-[var(--fg-muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em]">{value}</p>
      <p className="mt-1 text-xs text-[var(--fg-muted)]">{note}</p>
    </div>
  );
}
