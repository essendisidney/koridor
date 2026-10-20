import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MONTHS, type Product } from "@/lib/products";

/** Per-product tile colours: deep, earthy tones that sit well on ivory. */
const TONES: Record<string, [string, string]> = {
  avocado: ["#2f5d3a", "#6f9a4f"],
  tea: ["#1f4a3a", "#4f8a5d"],
  coffee: ["#4a2e22", "#8a5a3c"],
  macadamia: ["#6b4f2e", "#b8925a"],
  mango: ["#b5651d", "#e3a33b"],
  "french-beans": ["#3d5a2a", "#7ea24a"],
  "cut-flowers": ["#8a2f4f", "#d0708e"],
  spices: ["#8a3b1f", "#c9772e"],
};

function tone(slug: string): [string, string] {
  return TONES[slug] ?? ["#0f2e24", "#1d6b4f"];
}

function seasonLabel(p: Product, month: number) {
  if (p.seasonMonths.length === 12) return "Year-round";
  if (p.seasonMonths.includes(month)) return "In season";
  const first = MONTHS[p.seasonMonths[0] - 1];
  const last = MONTHS[p.seasonMonths[p.seasonMonths.length - 1] - 1];
  return `${first}–${last}`;
}

export function ProductCard({ product: p, detailed }: { product: Product; detailed?: boolean }) {
  const [from, to] = tone(p.slug);
  const month = new Date().getMonth() + 1;
  const live = p.seasonMonths.includes(month);
  return (
    <Link
      href={`/products/${p.slug}`}
      className="card card-hover group flex h-full flex-col overflow-hidden"
    >
      <div
        className="relative flex h-28 items-end justify-between p-4"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        <span className="font-[family-name:var(--font-display)] text-5xl leading-none text-white/90">
          {p.name.charAt(0)}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur ${live ? "bg-white/90 text-[var(--accent)]" : "bg-black/20 text-white/90"}`}
        >
          {live ? "● " : ""}
          {seasonLabel(p, month)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium tracking-[-0.01em]">{p.name}</p>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
        </div>
        {detailed ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{p.blurb}</p>
        ) : null}
        <p className="mt-auto pt-3 text-xs text-[var(--fg-muted)]">
          <span className="font-semibold text-[var(--fg)]">
            ${p.fobUsdPerKg[0]}–{p.fobUsdPerKg[1]}
          </span>
          /kg FOB{detailed ? ` · ${p.varieties.slice(0, 2).join(", ")}` : ""}
        </p>
      </div>
    </Link>
  );
}
