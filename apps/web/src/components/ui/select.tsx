import { cn } from "@/lib/utils";
import { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export function Select({ className, label, error, id, children, ...props }: Props) {
  const selectId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={selectId}>
      {label ? (
        <span className="font-medium text-[var(--fg)]">{label}</span>
      ) : null}
      <select
        id={selectId}
        className={cn(
          "h-11 rounded-md border border-[var(--border)] bg-white px-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          error && "border-[var(--danger)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
