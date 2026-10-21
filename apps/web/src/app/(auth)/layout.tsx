import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, FileCheck2, Lock } from "lucide-react";
import { HeroVisual } from "@/components/hero-visual";
import { Logo } from "@/components/public-nav";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1.05fr]">
      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <Link href="/" aria-label="Koridor home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-xs text-[var(--fg-muted)]">
          Verified farms · Escrow payment · Export documents handled
        </p>
      </div>
      <div className="relative isolate hidden overflow-hidden bg-[#0a1f18] text-[#f7f5ef] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Image
          src="/images/misty-tea.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#081a14]/90 via-[#081a14]/70 to-[#081a14]/95" />
        <div>
          <p className="eyebrow">Direct from Kenya</p>
          <p className="mt-4 max-w-md font-[family-name:var(--font-display)] text-4xl leading-tight tracking-[-0.02em]">
            Every trade, from quote to container,{" "}
            <span className="text-gradient-gold italic">in one place.</span>
          </p>
        </div>
        <div className="py-8">
          <HeroVisual />
        </div>
        <ul className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-xs text-white/65">
          <li className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[#e9cf94]" /> Verified sellers
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#e9cf94]" /> Escrow-protected
          </li>
          <li className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-[#e9cf94]" /> Docs handled
          </li>
        </ul>
      </div>
    </div>
  );
}
