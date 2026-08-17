import { cn } from "@/lib/utils";
import type { JourneyPhase } from "@/lib/journey";

export function JourneyStepper({
  phases,
  compact = false,
}: {
  phases: JourneyPhase[];
  compact?: boolean;
}) {
  return (
    <ol
      className={cn(
        "grid gap-3",
        phases.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
      )}
    >
      {phases.map((phase, i) => (
        <li key={phase.id} className="min-w-0">
          <p
            className={cn(
              "text-xs uppercase tracking-[0.14em]",
              phase.status === "current"
                ? "text-[var(--accent)]"
                : "text-[var(--fg-muted)]",
            )}
          >
            {i + 1}. {phase.title}
            {phase.status === "complete" ? " · done" : ""}
            {phase.status === "current" ? " · now" : ""}
          </p>
          {compact ? null : (
            <p className="mt-1 text-sm leading-snug text-[var(--fg-muted)]">
              {phase.caption}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
