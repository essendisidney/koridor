import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicNav } from "@/components/public-nav";
import { ProductCard } from "@/components/product-card";
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
    <div className="min-h-screen">
      <PublicNav />
      <section className="hero-surface">
        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-14 pt-14 sm:px-6">
          <p className="eyebrow">Catalogue</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] md:text-5xl">
            {q ? `Results for “${q}”` : "Kenya’s finest exports"}
          </h1>
          <ProductSearch defaultValue={q} large />
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {results.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {results.map((p) => (
              <li key={p.slug}>
                <ProductCard product={p} detailed />
              </li>
            ))}
          </ul>
        ) : (
          <div className="card max-w-xl p-8">
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]">
              We don&apos;t list “{q}” yet.
            </p>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              Post a request anyway — we&apos;ll find farms that grow it.
            </p>
            <Link
              href={`/register?role=BUYER&commodity=${encodeURIComponent(q ?? "")}`}
              className="mt-6 inline-block"
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
