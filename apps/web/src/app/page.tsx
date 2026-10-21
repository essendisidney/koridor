import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  FileCheck2,
  Lock,
  Ship,
  Sparkles,
  Sprout,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/hero-visual";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { ProductCard } from "@/components/product-card";
import { ProductSearch } from "@/components/product-search";
import { BRAND } from "@/lib/brand";
import { countryName, WORLD_BUYER_DESTINATIONS } from "@/lib/corridors";
import { PRODUCTS } from "@/lib/products";

const AUDIENCES = [
  {
    icon: Store,
    title: "Importers & retailers",
    body: "Source direct from estates, compare offers side by side, and pay through escrow.",
    href: "/register?role=BUYER",
    cta: "Start buying",
  },
  {
    icon: Sprout,
    title: "Large farms & estates",
    body: "List your harvest once. Buyers that fit your crop, grade and volume come to you.",
    href: "/register?role=FARMER",
    cta: "Start selling",
  },
  {
    icon: Users,
    title: "Cooperatives",
    body: "Pool members' volume to win container-sized orders you couldn't fill alone.",
    href: "/register?role=COOPERATIVE",
    cta: "Join as a co-op",
  },
];

const FAQ = [
  {
    q: "How do I know a farm is real?",
    a: "Every seller passes business verification before they can quote: registration, tax and export documents are checked by our team.",
  },
  {
    q: "When does the farm get paid?",
    a: "You fund escrow when you accept an offer. The money is released to the farm only after delivery is confirmed.",
  },
  {
    q: "Who handles export paperwork?",
    a: "We prepare and track the phytosanitary certificate, certificate of origin, Halal certificate where required, packing list and commercial invoice.",
  },
  {
    q: "What if one farm can't fill my order?",
    a: "Koridor pools lots from several verified farms with matching grade and certification until your full volume is covered.",
  },
];

export default function LandingPage() {
  const [lead, ...rest] = BRAND.tagline.split(" from ");
  const month = new Date().toLocaleString("en", { month: "long" });
  const inSeason = PRODUCTS.filter((p) => p.seasonMonths.includes(new Date().getMonth() + 1));

  return (
    <div className="min-h-screen">
      <Link
        href="/products"
        className="group flex items-center justify-center gap-2 bg-[#0a1f18] px-4 py-2 text-center text-xs text-white/80 transition hover:text-white"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#e9cf94]" />
        <span>
          {inSeason.length} crops in season this {month} —{" "}
          {inSeason.slice(0, 3).map((p) => p.name.toLowerCase()).join(", ")} shipping now
        </span>
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Link>
      <PublicNav />

      {/* Hero: copy + search on the left, product preview on the right */}
      <section className="hero-surface overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7fd1a8]" />
              Verified Kenyan farms · Escrow on every trade
            </span>
            <h1 className="animate-fade-up mt-6 font-[family-name:var(--font-display)] text-5xl font-normal leading-[1.02] tracking-[-0.03em] md:text-7xl">
              {rest.length ? (
                <>
                  {lead} from{" "}
                  <span className="text-gradient-gold italic">{rest.join(" from ")}</span>
                </>
              ) : (
                BRAND.tagline
              )}
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-lg text-base leading-relaxed text-white/70 md:text-lg"
              style={{ animationDelay: "80ms" }}
            >
              Tell us what you need. Verified farms send offers, payment sits in
              escrow, and we handle the export paperwork.
            </p>
            <div className="animate-fade-up mt-9" style={{ animationDelay: "160ms" }}>
              <ProductSearch large />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/55">
                <span>Popular:</span>
                {PRODUCTS.slice(0, 4).map((p) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-white/75 transition hover:border-white/40 hover:text-white"
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
            <div
              className="animate-fade-up mt-9 flex flex-wrap gap-3"
              style={{ animationDelay: "220ms" }}
            >
              <Link href="/register?role=BUYER">
                <Button size="lg" variant="gold">
                  Get quotes <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register?role=FARMER">
                <Button size="lg" variant="light">
                  I&apos;m a farm
                </Button>
              </Link>
            </div>
          </div>
          <div className="animate-fade-in hidden lg:block" style={{ animationDelay: "200ms" }}>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Destination strip */}
      <section className="border-b border-[var(--border)] bg-white/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 text-xs font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Shipping to
          </p>
          <ul className="no-scrollbar flex gap-x-8 gap-y-2 overflow-x-auto whitespace-nowrap md:flex-wrap">
            {WORLD_BUYER_DESTINATIONS.map((c) => (
              <li
                key={c}
                className="font-[family-name:var(--font-display)] text-lg tracking-[-0.01em] text-[var(--fg)]/70"
              >
                {countryName(c)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Catalogue */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The harvest</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
              Shop by crop
            </h2>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]"
          >
            Browse catalogue
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

      {/* Bento: how a trade runs */}
      <section className="border-y border-[var(--border)] bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
            From request to reefer, without the middlemen
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-6">
            <BentoCard
              className="md:col-span-4"
              step="01"
              title="Post what you need"
              body="Product, volume, destination. Two minutes, no calls."
            >
              <div className="mt-6 grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm sm:grid-cols-3">
                <MockField label="Product" value="Hass avocado" />
                <MockField label="Volume" value="22 MT / month" />
                <MockField label="Deliver to" value="Jebel Ali, UAE" />
              </div>
            </BentoCard>
            <BentoCard
              className="md:col-span-2"
              step="02"
              title="Farms come to you"
              body="We match and alert verified farms by SMS the moment you post."
            >
              <div className="mt-6 flex -space-x-2">
                {["#2f5d3a", "#6b4f2e", "#1f4a3a", "#b5651d"].map((c, i) => (
                  <span
                    key={c}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
                    style={{ background: c }}
                  >
                    {["MK", "NE", "KR", "TH"][i]}
                  </span>
                ))}
                <span className="flex h-9 items-center rounded-full border-2 border-white bg-[var(--accent-soft)] px-3 text-xs font-medium text-[var(--accent)]">
                  +8 offers
                </span>
              </div>
            </BentoCard>
            <BentoCard
              className="md:col-span-2"
              step="03"
              title="Pay into escrow"
              body="Funds release only when delivery is confirmed."
            >
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-[var(--primary)] p-4 text-white">
                <Lock className="h-5 w-5 text-[#e9cf94]" />
                <div>
                  <p className="text-[11px] text-white/60">Held safely</p>
                  <p className="font-[family-name:var(--font-display)] text-xl">$40,700</p>
                </div>
              </div>
            </BentoCard>
            <BentoCard
              className="md:col-span-4"
              step="04"
              title="We ship it and do the paperwork"
              body="Sea and air from Mombasa and Nairobi, tracked to your door."
            >
              <ol className="mt-6 grid grid-cols-4 gap-2 text-[11px] text-[var(--fg-muted)]">
                {["Packed", "Inspected", "Sailed", "Delivered"].map((s, i) => (
                  <li key={s}>
                    <div
                      className={`h-1.5 rounded-full ${i < 3 ? "bg-[var(--accent)]" : "bg-[#f1eee6]"}`}
                    />
                    <p className="mt-2">{s}</p>
                  </li>
                ))}
              </ol>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* Trust row */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
          {[
            { icon: BadgeCheck, title: "Verified farms", body: "Every seller passes business verification." },
            { icon: Lock, title: "Escrow payment", body: "Funds released only on proof of delivery." },
            { icon: FileCheck2, title: "Documents handled", body: "Phyto, certificate of origin, Halal, invoices." },
            { icon: Ship, title: "Tracked shipping", body: "Sea and air, every milestone visible." },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="h-5 w-5 text-[var(--gold)]" />
              <p className="mt-4 font-medium tracking-[-0.01em]">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <p className="eyebrow">Built for</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
          Both sides of the trade
        </h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, title, body, href, cta }) => (
            <li key={title}>
              <Link href={href} className="card card-hover group flex h-full flex-col p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gold-soft)] text-[var(--gold)]">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-6 text-lg font-medium tracking-[-0.01em]">{title}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--fg-muted)]">{body}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--border)] bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] md:text-4xl">
              Good to know
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium tracking-[-0.01em]">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--fg-muted)] transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--fg-muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="hero-surface overflow-hidden rounded-[1.75rem] px-6 py-14 text-center sm:px-12">
          <p className="eyebrow">Ready when you are</p>
          <p className="mx-auto mt-3 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight tracking-[-0.02em] md:text-5xl">
            Your next container, direct from the farm.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register?role=BUYER">
              <Button size="lg" variant="gold">
                Get quotes <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register?role=FARMER">
              <Button size="lg" variant="light">
                Sell your harvest
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function BentoCard({
  className,
  step,
  title,
  body,
  children,
}: {
  className?: string;
  step: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`card flex flex-col p-6 ${className ?? ""}`}>
      <span className="font-[family-name:var(--font-display)] text-sm italic text-[var(--gold)]">
        {step}
      </span>
      <p className="mt-2 text-lg font-medium tracking-[-0.01em]">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{body}</p>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
