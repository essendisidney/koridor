import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[#16324d]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-white text-[var(--fg)] hover:bg-[#f7f9fb]",
        variant === "ghost" &&
          "bg-transparent text-[var(--fg)] hover:bg-black/5",
        variant === "danger" &&
          "bg-[var(--danger)] text-white hover:bg-[#7f1d1d]",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className,
      )}
      {...props}
    />
  );
}
