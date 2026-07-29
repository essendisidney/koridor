import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={inputId}>
      {label ? (
        <span className="font-medium text-[var(--fg)]">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-11 rounded-md border border-[var(--border)] bg-white px-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          error && "border-[var(--danger)]",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
