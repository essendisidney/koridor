import { BadgeCheck, Lock, Ship } from "lucide-react";

/**
 * Product-UI collage for the homepage hero: what a buyer actually sees
 * (matched quote → escrow → shipment). Purely illustrative, no live data.
 */
export function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto h-[420px] w-full max-w-[460px] select-none">
      {/* Quote card */}
      <div className="animate-float absolute left-0 top-4 w-[300px] rounded-2xl border border-white/10 bg-white p-5 text-[var(--fg)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--fg-muted)]">New quote</p>
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
            3 farms matched
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f5d3a] to-[#6f9a4f] font-[family-name:var(--font-display)] text-xl text-white">
            A
          </span>
          <div>
            <p className="font-medium">Hass avocado · Grade A</p>
            <p className="text-xs text-[var(--fg-muted)]">40ft reefer · 22 MT · CIF Jebel Ali</p>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-[var(--border)] pt-4">
          <div>
            <p className="text-[11px] text-[var(--fg-muted)]">Best offer</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]">
              $1.85<span className="text-sm text-[var(--fg-muted)]">/kg</span>
            </p>
          </div>
          <span className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white">
            Accept
          </span>
        </div>
      </div>

      {/* Escrow card */}
      <div
        className="animate-float absolute right-0 top-[170px] w-[230px] rounded-2xl border border-white/15 bg-[#123a2d] p-4 text-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)]"
        style={{ animationDelay: "-2s" }}
      >
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Lock className="h-3.5 w-3.5 text-[#e9cf94]" /> Escrow funded
        </div>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em]">
          $40,700
        </p>
        <p className="mt-1 text-[11px] text-white/55">Released on proof of delivery</p>
      </div>

      {/* Shipment card */}
      <div
        className="animate-float absolute bottom-0 left-8 w-[320px] rounded-2xl border border-white/10 bg-white p-4 text-[var(--fg)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]"
        style={{ animationDelay: "-4s" }}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Ship className="h-3.5 w-3.5 text-[var(--accent)]" /> Mombasa → Jebel Ali
          </span>
          <span className="text-[var(--fg-muted)]">Day 9 of 14</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f1eee6]">
          <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-[var(--accent)] to-[#d4b06a]" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
          <BadgeCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
          Phyto · Certificate of origin · Invoice ready
        </div>
      </div>
    </div>
  );
}
