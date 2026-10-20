import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { ProductSearch } from "@/components/product-search";
import { searchProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Products",
  description: "Buy Kenyan avocado, tea, coffee, macadamia, mango, beans, flowers and spices direct from verified farms.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = searchProducts(q);
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
            {q ? `Results for “${q}”` : "All products"}
          </h1>
          <ProductSearch defaultValue={q} />
        </div>
        {results.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {results.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/products/${p.slug}`}
                  className="block h-full rounded-lg border border-[var(--border)] bg-white p-5 transition hover:border-[var(--accent)]"
                >
                  <p className="text-lg font-medium">{p.name}</p>
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">{p.blurb}</p>
                  <p className="mt-3 text-xs text-[var(--fg-muted)]">
                    ${p.fobUsdPerKg[0]}–{p.fobUsdPerKg[1]}/kg FOB · {p.varieties.slice(0, 2).join(", ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-white p-6">
            <p className="font-medium">We don&apos;t list “{q}” yet.</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Post a request anyway — we&apos;ll find farms that grow it.
            </p>
            <Link
              href={`/register?role=BUYER&commodity=${encodeURIComponent(q ?? "")}`}
              className="mt-4 inline-block"
            >
              <Button>Request {q}</Button>
            </Link>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
