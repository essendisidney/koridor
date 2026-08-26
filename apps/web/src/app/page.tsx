import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JourneyStepper } from "@/components/journey-stepper";
import { PathCards } from "@/components/path-cards";
import { SessionCta, SessionTextLink } from "@/components/session-cta";
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
            <SessionTextLink className="text-sm font-medium text-white/85 transition hover:text-white" />
            <SessionCta
              guestHref="/start"
              guestLabel="Get started"
              continueLabel="Continue"
              className="bg-white text-[var(--primary)] hover:bg-white/90"
            />
          </nav>
        </div>
      </header>

      <section className="relative min-h-[88vh] overflow-hidden">
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
        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28 md:pb-24">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent-soft)]">
            The world&apos;s demand. Africa&apos;s supply. One Koridor.
          </p>
          <h1 className="animate-fade-up mt-3 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Trade Africa with the world.
          </h1>
          <p className="animate-fade-up mt-4 max-w-xl text-base leading-relaxed text-white/80 delay-200 md:text-lg">
            Post what you need. Koridor finds, aggregates, verifies, and
            executes Kenyan supply through one Trade Passport — starting GCC,
            Europe, and Asia.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 delay-300">
            <SessionCta
              size="lg"
              guestHref="/register?role=BUYER"
              guestLabel="Post a buying requirement"
              continueLabel="Post a requirement"
              continueHref="/dashboard/requirements/new"
              className="bg-[var(--accent)] text-white hover:bg-[#0c5a57]"
            />
            <Link href="/discover">
              <Button
                size="lg"
                variant="secondary"
                className="border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                Discover demand
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)] md:text-4xl">
              The same four steps after you sign in.
            </h2>
            <p className="mt-4 max-w-lg text-[var(--fg-muted)] leading-relaxed">
              Account, organisation, verification, dated offtake, then the
              passport through Halal, credit, Mombasa, and settlement.
            </p>
          </div>
          <JourneyStepper phases={phases} />
        </div>
      </section>

      <section
        id="who"
        className="border-t border-[var(--border)] bg-[var(--bg)]"
      >
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-16">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Who are you on this corridor?
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[var(--fg-muted)]">
              Pick once. Role and country travel into account and organisation
              setup.
            </p>
          </div>
          <PathCards />
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[#0b1f33] text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between">
          <span className="font-[family-name:var(--font-display)] text-base text-white">
            Koridor
          </span>
          <span>Kenya → GCC · Europe · Asia</span>
          <Link href="/start" className="text-white underline">
            Get started
          </Link>
        </div>
      </footer>
    </div>
  );
}
