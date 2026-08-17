import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { JourneyStepper } from "@/components/journey-stepper";
import { PathCards } from "@/components/path-cards";
import { JOURNEY_PHASES } from "@/lib/journey";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Choose buyer, Kenyan cooperative, or chamber — then connect, verify, negotiate, and execute on one Trade Passport.",
};

const phases = JOURNEY_PHASES.map((p, i) => ({
  ...p,
  status: i === 0 ? ("current" as const) : ("upcoming" as const),
}));

export default function StartPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav ctaHref="/login" ctaLabel="Sign in" />
      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Step 1 of 4 · Connect
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl">
            Who are you on this corridor?
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--fg-muted)] leading-relaxed">
            Account, then organisation. After you sign in, Home names the single
            next action — verification, a dated RFQ, or the open passport.
          </p>
        </section>

        <JourneyStepper phases={phases} />
        <PathCards />

        <p className="text-sm text-[var(--fg-muted)]">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] underline">
            Sign in
          </Link>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
