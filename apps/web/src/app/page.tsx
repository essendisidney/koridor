import Link from "next/link";
import { ArrowRight, BadgeCheck, FileCheck2, Lock, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { ProductCard } from "@/components/product-card";
import { ProductSearch } from "@/components/product-search";
import { BRAND } from "@/lib/brand";
import { PRODUCTS } from "@/lib/products";

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

const PROOF = [
  { value: String(PRODUCTS.length), label: "Export crops" },
  { value: "100%", label: "Escrow-protected" },
  { value: "2 min", label: "To post a request" },
];

export default function LandingPage() {
  const [lead, ...rest] = BRAND.tagline.split(" from ");
  return (
    <div className="min-h-screen">
      <PublicNav />

      <section className="hero-surface">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 md:pb-32 md:pt-28">
          <p className="eyebrow animate-fade-in">Kenya · Direct farm export</p>
          <h1 className="animate-fade-up mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-normal leading-[1.02] tracking-[-0.03em] md:text-7xl">
            {rest.length ? (
              <>
                {lead} from <span className="text-gradient-gold italic">{rest.join(" from ")}</span>
              </>
            ) : (
              BRAND.tagline
            )}
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            style={{ animationDelay: "80ms" }}
          >
            Verified farms, escrow-protected payment, export paperwork done for
            you. Tell us what you need — farms come to you.
          </p>
          <div className="animate-fade-up mt-10" style={{ animationDelay: "160ms" }}>
            <ProductSearch large />
          </div>
          <div
            className="animate-fade-up mt-5 flex flex-wrap gap-3"
            style={{ animationDelay: "220ms" }}
          >
            <Link href="/register?role=BUYER">
              <Button size="lg" variant="gold">
                I want to buy <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register?role=FARMER">
              <Button size="lg" variant="light">
                I want to sell
              </Button>
            </Link>
          </div>
          <dl className="mt-16 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {PROOF.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] text-white">
                  {s.value}
                </dd>
                <p className="mt-1 text-xs text-white/55">{s.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The harvest</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
              Popular products
            </h2>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]"
          >
            See all
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {PRODUCTS.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-[var(--border)] bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 max-w-lg font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
            From request to reefer in three steps
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-4">
                  <span className="font-[family-name:var(--font-display)] text-4xl italic text-[var(--gold)]">
                    0{i + 1}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
                </div>
                <p className="mt-4 text-lg font-medium tracking-[-0.01em]">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <li key={title} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-5 font-medium tracking-[-0.01em]">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="hero-surface overflow-hidden rounded-[1.75rem] px-6 py-12 sm:px-12 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="eyebrow">For growers</p>
            <p className="mt-3 max-w-md font-[family-name:var(--font-display)] text-3xl leading-tight tracking-[-0.02em] md:text-4xl">
              Run a large farm in Kenya?
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              List your harvest once. Get matched to buyers around the world — by
              SMS the moment they post.
            </p>
          </div>
          <Link href="/register?role=FARMER" className="mt-8 inline-block md:mt-0">
            <Button size="lg" variant="gold">
              Start selling <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
