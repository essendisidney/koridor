import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { JourneyStepper } from "@/components/journey-stepper";
import { PathCards } from "@/components/path-cards";
import { JOURNEY_PHASES } from "@/lib/journey";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Create a Koridor account as a buyer, a Kenyan farm, or a cooperative.",
};

const phases = JOURNEY_PHASES.map((p, i) => ({
  ...p,
  status: i === 0 ? ("current" as const) : ("upcoming" as const),
}));

export default function StartPage() {
  return (
    <div className="min-h-screen">
      <PublicNav ctaHref="/login" ctaLabel="Sign in" />
      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <section>
          <p className="eyebrow">Get started</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl md:text-5xl">
            How will you use Koridor?
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--fg-muted)]">
            Pick one to create your account. After you sign in, your home page
            always shows the next thing to do.
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
