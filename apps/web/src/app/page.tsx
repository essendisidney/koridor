import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-white">
            Koridor
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-white/85 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-white text-[var(--primary)] hover:bg-white/90"
              >
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=2400&q=80')",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--hero-overlay)" }}
        />
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-6 pb-20 pt-28 md:pb-28">
          <p className="animate-fade-up font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-white md:text-7xl lg:text-8xl">
            Koridor
          </p>
          <div className="animate-draw-line mt-5 h-px w-28 bg-[var(--accent)] delay-150" />
          <h1 className="animate-fade-up mt-6 max-w-2xl text-2xl font-medium leading-snug text-white delay-100 md:text-3xl">
            The operating system for cross-border trade.
          </h1>
          <p className="animate-fade-up mt-4 max-w-xl text-base leading-relaxed text-white/80 delay-200 md:text-lg">
            Trusted digital infrastructure connecting producers, exporters,
            buyers, banks, insurers, logistics, and governments across African
            trade corridors.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 delay-300">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-[var(--accent)] text-white hover:bg-[#0c5a57]"
              >
                Create organisation
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="secondary"
                className="border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                Access platform
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)] md:text-4xl">
              Infrastructure, not another marketplace.
            </h2>
            <p className="mt-4 max-w-lg text-[var(--fg-muted)] leading-relaxed">
              Koridor is built for verification, contracts, compliance,
              settlement, and logistics orchestration — the rails that make
              trade trustworthy at scale.
            </p>
          </div>
          <ul className="space-y-5 text-sm leading-relaxed text-[var(--fg)]">
            <li className="border-l-2 border-[var(--accent)] pl-4">
              Organisation identity, roles, and audit-ready access control
            </li>
            <li className="border-l-2 border-[var(--accent)] pl-4">
              Trust engine foundations for KYB, KYC, and registries
            </li>
            <li className="border-l-2 border-[var(--accent)] pl-4">
              Modular architecture for trade, finance, compliance, and logistics
            </li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[#0b1f33] text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between">
          <span className="font-[family-name:var(--font-display)] text-base text-white">
            Koridor
          </span>
          <span>© {new Date().getFullYear()} Koridor. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
