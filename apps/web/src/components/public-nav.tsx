"use client";

import Link from "next/link";
import { SessionCta, SessionTextLink } from "@/components/session-cta";
import { BRAND } from "@/lib/brand";

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#d4b06a] to-[#9c7430] font-[family-name:var(--font-display)] text-sm font-semibold text-[#1a1407] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]"
      >
        K
      </span>
      <span
        className={`font-[family-name:var(--font-display)] text-xl font-medium tracking-[-0.02em] ${light ? "text-white" : ""}`}
      >
        {BRAND.name}
      </span>
    </span>
  );
}

export function PublicNav({
  ctaHref = "/register?role=BUYER",
  ctaLabel = "Get quotes",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-[var(--border)]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label={`${BRAND.name} home`}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/products"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--fg-muted)] transition hover:text-[var(--fg)] sm:inline"
          >
            Products
          </Link>
          <Link
            href="/register?role=FARMER"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--fg-muted)] transition hover:text-[var(--fg)] sm:inline"
          >
            Sell
          </Link>
          <SessionTextLink className="rounded-full px-3 py-2 text-sm font-medium text-[var(--fg-muted)] transition hover:text-[var(--fg)]" />
          <SessionCta guestHref={ctaHref} guestLabel={ctaLabel} />
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="hero-surface overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo light />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Kenyan farms to buyers worldwide. Verified sellers, escrow payment,
              export paperwork handled.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div className="space-y-3">
              <p className="eyebrow">Buy</p>
              <Link href="/products" className="block text-white/75 hover:text-white">
                Products
              </Link>
              <Link href="/register?role=BUYER" className="block text-white/75 hover:text-white">
                Request a quote
              </Link>
            </div>
            <div className="space-y-3">
              <p className="eyebrow">Sell</p>
              <Link href="/register?role=FARMER" className="block text-white/75 hover:text-white">
                Sell on {BRAND.name}
              </Link>
              <Link href="/login" className="block text-white/75 hover:text-white">
                Sign in
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <span>Nairobi · Mombasa · Photos via Unsplash</span>
        </div>
      </div>
    </footer>
  );
}
