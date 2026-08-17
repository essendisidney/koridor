import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JourneyStepper } from "@/components/journey-stepper";
import { JOURNEY_PHASES } from "@/lib/journey";

const phases = JOURNEY_PHASES.map((p, i) => ({
  ...p,
  status: (i === 0 ? "current" : "upcoming") as "current" | "upcoming",
}));

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
              href="/cropchain"
              className="hidden text-sm font-medium text-white/85 transition hover:text-white sm:inline"
            >
              CropChain
            </Link>
            <Link
              href="/kenya"
              className="hidden text-sm font-medium text-white/85 transition hover:text-white sm:inline"
            >
              Kenya–GCC
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/85 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link href="/start">
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
            Kenyan farms to buyers in Oman, Saudi Arabia, Iran, and Iraq — one
            corridor, one Trade Passport, four steps from landing to settlement.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 delay-300">
            <Link href="/start">
              <Button
                size="lg"
                className="bg-[var(--accent)] text-white hover:bg-[#0c5a57]"
              >
                Begin the corridor
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="secondary"
                className="border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl space-y-10 px-6 py-20">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)] md:text-4xl">
              What you do, in order.
            </h2>
            <p className="mt-4 max-w-lg text-[var(--fg-muted)] leading-relaxed">
              The public site, sign-in, and workspace use the same sequence. You
              never hunt twenty menus for the next move.
            </p>
          </div>
          <JourneyStepper phases={phases} />
          <div className="flex flex-wrap gap-3">
            <Link href="/start">
              <Button>Choose your role</Button>
            </Link>
            <Link href="/cropchain">
              <Button variant="secondary">CropChain Africa</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[#0b1f33] text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between">
          <span className="font-[family-name:var(--font-display)] text-base text-white">
            Koridor
          </span>
          <span>Kenya → Oman · Saudi Arabia · Iran · Iraq</span>
          <Link href="/start" className="text-white underline">
            Get started
          </Link>
        </div>
      </footer>
    </div>
  );
}
