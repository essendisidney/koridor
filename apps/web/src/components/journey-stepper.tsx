import { cn } from "@/lib/utils";
import type { JourneyPhase } from "@/lib/journey";

export function JourneyStepper({
  phases,
  compact = false,
}: {
  phases: JourneyPhase[];
  compact?: boolean;
}) {
  const currentIdx = Math.max(
    0,
    phases.findIndex((p) => p.status === "current"),
  );
  const allDone = phases.every((p) => p.status === "complete");
  const pct = allDone
    ? 100
    : Math.round((currentIdx / Math.max(1, phases.length - 1)) * 100);

  return (
    <div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol
        className={cn(
          "grid gap-4",
          phases.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {phases.map((phase, i) => (
          <li key={phase.id} className="min-w-0">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  phase.status === "complete" &&
                    "bg-[var(--accent)] text-white",
                  phase.status === "current" &&
                    "bg-[var(--accent-soft)] text-[var(--accent)] ring-2 ring-[var(--accent)]",
                  phase.status === "upcoming" &&
                    "border border-[var(--border)] bg-white text-[var(--fg-muted)]",
                )}
              >
                {phase.status === "complete" ? "✓" : i + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    phase.status === "upcoming"
                      ? "text-[var(--fg-muted)]"
                      : "text-[var(--fg)]",
                  )}
                >
                  {phase.title}
                  {phase.status === "current" ? (
                    <span className="ml-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent)]">
                      Now
                    </span>
                  ) : null}
                </p>
                {compact ? null : (
                  <p className="mt-1 text-sm leading-snug text-[var(--fg-muted)]">
                    {phase.caption}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
