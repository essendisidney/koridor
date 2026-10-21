"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { START_PATHS } from "@/lib/journey";

export function PathCards() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {START_PATHS.map((path) => (
        <div
          key={path.id}
          className="card flex flex-col p-6"
        >
          <p className="font-[family-name:var(--font-display)] text-2xl">
            {path.title}
          </p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--fg-muted)]">
            {path.body}
          </p>
          <Link href={path.href} className="mt-5">
            <Button className="w-full">{path.cta}</Button>
          </Link>
        </div>
      ))}
    </section>
  );
}
