import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { JourneyStepper } from "@/components/journey-stepper";
import { JOURNEY_PHASES, START_PATHS } from "@/lib/journey";

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
            Kenya–GCC corridor
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl">
            One path. Four steps. One Trade Passport.
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--fg-muted)] leading-relaxed">
            What you see here is what you do after you sign in. Pick who you
            are, create the account, register the organisation, then the
            workspace tells you the single next action.
          </p>
        </section>

        <JourneyStepper phases={phases} />

        <section className="grid gap-4 md:grid-cols-3">
          {START_PATHS.map((path) => (
            <div
              key={path.id}
              className="flex flex-col border border-[var(--border)] bg-white p-5"
            >
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {path.title}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                {path.body}
              </p>
              <Link href={path.href} className="mt-5">
                <Button className="w-full">{path.cta}</Button>
              </Link>
            </div>
          ))}
        </section>

        <p className="text-sm text-[var(--fg-muted)]">
          Already on the corridor?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] underline">
            Sign in
          </Link>{" "}
          and you land on the same next step.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
