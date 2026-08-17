"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

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
          <Link href="/cropchain" className="text-sm font-medium">
            CropChain
          </Link>
          <Link href="/kenya" className="text-sm font-medium">
            Kenya–GCC
          </Link>
          <Link href="/login" className="text-sm font-medium">
            Sign in
          </Link>
          <Link href={ctaHref}>
            <Button size="sm">{ctaLabel}</Button>
          </Link>
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
