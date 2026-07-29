"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link
        href="/"
        className="mb-8 inline-block font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--fg)] lg:hidden"
      >
        Koridor
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Access your organisation workspace.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--fg-muted)]">
        New to Koridor?{" "}
        <Link href="/register" className="font-medium text-[var(--accent)]">
          Create an account
        </Link>
      </p>
      <p className="mt-4 rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--fg)]">
        Demo: exporter@demo.koridor.io / Demo123!
      </p>
    </div>
  );
}
