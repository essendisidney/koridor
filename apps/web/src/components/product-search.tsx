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
    <form action="/products" method="get" className="flex w-full max-w-xl gap-2">
      <label className="relative flex-1">
        <span className="sr-only">Search products</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Avocado, tea, coffee, macadamia…"
          className={`w-full rounded-md border border-[var(--border)] bg-white pl-9 pr-3 text-[var(--fg)] outline-none focus:ring-2 focus:ring-[var(--ring)] ${large ? "h-12 text-base" : "h-11 text-sm"}`}
        />
      </label>
      <button
        type="submit"
        className={`rounded-md bg-[var(--accent)] px-5 font-medium text-white hover:bg-[#0c5a57] ${large ? "h-12 text-base" : "h-11 text-sm"}`}
      >
        Search
      </button>
    </form>
  );
}
