import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BadgeCheck, FileCheck2, Lock, Ship } from "lucide-react";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { ProductSearch } from "@/components/product-search";
import { BRAND } from "@/lib/brand";
import { MONTHS, PRODUCTS } from "@/lib/products";

const STEPS = [
  {
    title: "Tell us what you need",
    body: "Product, volume, destination. Takes two minutes.",
  },
  {
    title: "Get offers from verified farms",
    body: "We match and notify farms instantly — and pool several farms to fill big orders.",
  },
  {
    title: "Pay safely, receive your goods",
    body: "Money sits in escrow until delivery. We handle export documents and shipping.",
  },
];

const TRUST = [
  { icon: BadgeCheck, title: "Verified farms", body: "Every seller passes business verification." },
  { icon: Lock, title: "Escrow payment", body: "Funds released only on proof of delivery." },
  { icon: FileCheck2, title: "Documents handled", body: "Phyto, certificate of origin, Halal, invoices." },
  { icon: Ship, title: "Shipped worldwide", body: "Sea and air from Mombasa and Nairobi, tracked." },
];

export default function LandingPage() {
  const currentMonth = new Date().getMonth() + 1;
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav />

      <section className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-6xl">
            {BRAND.tagline}
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--fg-muted)] md:text-lg">
            Verified farms, escrow-protected payment, export paperwork done for
            you. Tell us what you need — farms come to you.
          </p>
          <div className="mt-8">
            <ProductSearch large />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/register?role=BUYER">
              <Button size="lg">I want to buy</Button>
            </Link>
            <Link href="/register?role=FARMER">
              <Button size="lg" variant="secondary">
                I want to sell
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold md:text-3xl">
            Popular products
          </h2>
          <Link href="/products" className="text-sm font-medium text-[var(--accent)]">
            See all →
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {PRODUCTS.map((p) => {
            const inSeason = p.seasonMonths.includes(currentMonth);
            return (
              <li key={p.slug}>
                <Link
                  href={`/products/${p.slug}`}
                  className="block h-full rounded-lg border border-[var(--border)] bg-white p-4 transition hover:border-[var(--accent)]"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">
                    ${p.fobUsdPerKg[0]}–{p.fobUsdPerKg[1]}/kg FOB
                  </p>
                  <p
                    className={`mt-3 inline-block rounded px-2 py-0.5 text-xs ${inSeason ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[#eef2f5] text-[var(--fg-muted)]"}`}
                  >
                    {inSeason ? "In season now" : `Season: ${MONTHS[p.seasonMonths[0] - 1]}–${MONTHS[p.seasonMonths[p.seasonMonths.length - 1] - 1]}`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-y border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold md:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <p className="mt-3 font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ul className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="h-5 w-5 text-[var(--accent)]" />
              <p className="mt-2 font-medium">{title}</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[var(--primary)] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Run a large farm in Kenya?
            </p>
            <p className="mt-1 text-sm text-white/75">
              List your harvest once. Get matched to buyers around the world.
            </p>
          </div>
          <Link href="/register?role=FARMER">
            <Button size="lg" variant="secondary">
              Start selling
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
