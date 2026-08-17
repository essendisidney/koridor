"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const ROLES = [
  { value: "EXPORTER", label: "Exporter" },
  { value: "BUYER", label: "Buyer" },
  { value: "FARMER", label: "Farmer" },
  { value: "COOPERATIVE", label: "Cooperative" },
  { value: "LOGISTICS_PROVIDER", label: "Logistics Provider" },
  { value: "BANK", label: "Bank" },
  { value: "INSURANCE", label: "Insurance Company" },
  { value: "GOVERNMENT_OFFICER", label: "Government Officer" },
  { value: "CHAMBER_OF_COMMERCE", label: "Chamber of Commerce" },
];

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const roleHint = (params.get("role") || "EXPORTER").toUpperCase();
  const defaultRole = ROLES.some((r) => r.value === roleHint)
    ? roleHint
    : "EXPORTER";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await register({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        email: String(form.get("email")),
        phone: String(form.get("phone") || "") || undefined,
        password: String(form.get("password")),
        role: String(form.get("role")),
      });
      const selected = String(form.get("role"));
      const country = params.get("country");
      const orgType =
        selected === "BUYER"
          ? "BUYER"
          : selected === "FARMER"
            ? "FARMER"
            : selected === "COOPERATIVE"
              ? "COOPERATIVE"
              : selected === "CHAMBER_OF_COMMERCE"
                ? "CHAMBER_OF_COMMERCE"
                : "EXPORTER";
      const qs = new URLSearchParams();
      qs.set("type", orgType);
      if (country) qs.set("country", country.toUpperCase());
      router.push(`/onboarding/organisation?${qs.toString()}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to create account",
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
        Create account
      </h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        {defaultRole === "BUYER"
          ? "Importers in Oman, Saudi Arabia, Iran, and Iraq: register as Buyer, then RFQ Kenyan farm produce."
          : "Register as a participant in the Koridor network — Kenyan supply to Gulf and West Asian buyers."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" name="firstName" required />
          <Input label="Last name" name="lastName" required />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Input label="Phone" name="phone" type="tel" />
        <Select label="Primary role" name="role" required defaultValue={defaultRole}>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Continue"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--fg-muted)]">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-[var(--accent)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
