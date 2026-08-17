"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { postAuthPath, safeNextPath } from "@/lib/journey";

function LoginForm() {
  const { login, user, loading: authLoading, accessToken } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !accessToken || !user) return;
    router.replace(safeNextPath(params.get("next")) ?? postAuthPath(user));
  }, [authLoading, accessToken, user, params, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const authed = await login(
        String(form.get("email")),
        String(form.get("password")),
      );
      router.push(safeNextPath(params.get("next")) ?? postAuthPath(authed));
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
        You land on the next incomplete step — organisation setup, verification,
        RFQ, or the open Trade Passport.
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
          {loading ? "Signing in…" : "Continue"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--fg-muted)]">
        New to Koridor?{" "}
        <Link href="/start" className="font-medium text-[var(--accent)]">
          Begin the corridor
        </Link>
      </p>
      <p className="mt-4 rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--fg)]">
        Demo supplier: exporter@demo.koridor.io / Demo123!
        <br />
        Demo GCC buyer: oman@demo.koridor.io / Demo123!
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
