import { RESTRICTED_MARKET_NOTICE } from "@/lib/sanctions";

export function RestrictedMarketNotice({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`border-l-2 border-[var(--warning)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--fg-muted)] ${className}`}
    >
      <span className="font-medium text-[var(--fg)]">Sanctions notice. </span>
      {RESTRICTED_MARKET_NOTICE}
    </p>
  );
}
