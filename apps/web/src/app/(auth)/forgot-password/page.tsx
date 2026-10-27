"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/forgot", {
        method: "POST",
        body: { email: String(new FormData(e.currentTarget).get("email") ?? "") },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">Forgot your password?</h1>
      {sent ? (
        <p className="mt-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3 text-sm">
          If that email has a Koridor account, we&apos;ve sent a reset link by email
          and to the phone number on the account. It works for 30 minutes.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Enter your account email. We&apos;ll send you a link to choose a new password.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-[var(--fg-muted)]">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-[var(--accent)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
