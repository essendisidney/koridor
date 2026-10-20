import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold" | "light";
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
        "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--primary)] text-[var(--primary-fg)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_8px_20px_-10px_rgba(15,46,36,0.7)] hover:bg-[#164034]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-white text-[var(--fg)] shadow-[0_1px_2px_rgba(14,26,21,0.05)] hover:border-[#cfc9ba] hover:bg-[#fbfaf6]",
        variant === "gold" &&
          "bg-gradient-to-b from-[#d4b06a] to-[#b48a3e] text-[#1a1407] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_24px_-10px_rgba(180,138,62,0.8)] hover:brightness-105",
        variant === "light" &&
          "border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/15",
        variant === "ghost" &&
          "bg-transparent text-[var(--fg)] hover:bg-black/5",
        variant === "danger" &&
          "bg-[var(--danger)] text-white hover:brightness-110",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        className,
      )}
      {...props}
    />
  );
}
