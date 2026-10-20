import { Search } from "lucide-react";

/** Plain GET form so search works without JavaScript. */
export function ProductSearch({
  defaultValue,
  large,
}: {
  defaultValue?: string;
  large?: boolean;
}) {
  return (
    <form
      action="/products"
      method="get"
      className={`flex w-full max-w-xl items-center gap-2 rounded-full border bg-white p-1.5 shadow-[var(--shadow-card)] transition focus-within:ring-2 focus-within:ring-[var(--ring)]/40 ${large ? "border-white/20" : "border-[var(--border)]"}`}
    >
      <label className="relative flex-1">
        <span className="sr-only">Search products</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Avocado, tea, coffee, macadamia…"
          className={`w-full rounded-full bg-transparent pl-10 pr-3 text-[var(--fg)] outline-none placeholder:text-[#9aa49e] ${large ? "h-12 text-base" : "h-10 text-sm"}`}
        />
      </label>
      <button
        type="submit"
        className={`rounded-full bg-[var(--primary)] px-6 font-medium text-white transition hover:bg-[#164034] active:scale-[0.98] ${large ? "h-12 text-[15px]" : "h-10 text-sm"}`}
      >
        Search
      </button>
    </form>
  );
}
