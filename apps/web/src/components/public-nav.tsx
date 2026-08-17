"use client";

import Link from "next/link";
import { SessionCta, SessionTextLink } from "@/components/session-cta";

export function PublicNav({
  ctaHref = "/start",
  ctaLabel = "Get started",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-semibold"
        >
          Koridor
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/cropchain" className="hidden text-sm font-medium sm:inline">
            CropChain
          </Link>
          <Link href="/kenya" className="hidden text-sm font-medium sm:inline">
            Kenya–GCC
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
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <span className="font-[family-name:var(--font-display)] text-base text-white">
          Koridor
        </span>
        <span>Kenya → Oman · Saudi Arabia · Iran · Iraq</span>
        <Link href="/start" className="text-white underline">
          Get started
        </Link>
      </div>
    </footer>
  );
}
