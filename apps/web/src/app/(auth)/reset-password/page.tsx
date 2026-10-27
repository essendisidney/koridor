"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset", { method: "POST", body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">Choose a new password</h1>
      {done ? (
        <>
          <p className="mt-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3 text-sm">
            Your password is changed. You&apos;ve been signed out everywhere else.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button>Sign in</Button>
          </Link>
        </>
      ) : !token ? (
        <p className="mt-4 text-sm text-[var(--danger)]">
          This link is incomplete.{" "}
          <Link href="/forgot-password" className="underline">
            Ask for a new one
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input label="New password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <Input label="Type it again" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          {error ? (
            <p className="text-sm text-[var(--danger)]">
              {error}{" "}
              <Link href="/forgot-password" className="underline">
                Get a new link
              </Link>
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
