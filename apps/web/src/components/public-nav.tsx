"use client";

import Link from "next/link";
import { SessionCta, SessionTextLink } from "@/components/session-cta";
import { BRAND } from "@/lib/brand";

export function PublicNav({
  ctaHref = "/register?role=BUYER",
  ctaLabel = "Get quotes",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-semibold"
        >
          {BRAND.name}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/products" className="hidden text-sm font-medium sm:inline">
            Products
          </Link>
          <Link
            href="/register?role=FARMER"
            className="hidden text-sm font-medium sm:inline"
          >
            Sell
          </Link>
          <SessionTextLink className="text-sm font-medium" />
          <SessionCta guestHref={ctaHref} guestLabel={ctaLabel} />
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[#0b1f33] text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:px-6 md:flex-row md:items-center md:justify-between">
        <span className="font-[family-name:var(--font-display)] text-base text-white">
          {BRAND.name}
        </span>
        <span>Kenyan farms → buyers worldwide</span>
        <div className="flex gap-4">
          <Link href="/products" className="text-white underline">
            Products
          </Link>
          <Link href="/register?role=FARMER" className="text-white underline">
            Sell on {BRAND.name}
          </Link>
        </div>
      </div>
    </footer>
  );
}
