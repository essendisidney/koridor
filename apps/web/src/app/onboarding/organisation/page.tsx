"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CountrySelect } from "@/components/country-select";
import { isGulfWestAsiaBuyer } from "@/lib/corridors";

const TYPES = [
  "BUYER",
  "EXPORTER",
  "FARMER",
  "COOPERATIVE",
  "LOGISTICS_PROVIDER",
  "BANK",
  "INSURANCE",
  "GOVERNMENT",
  "CHAMBER_OF_COMMERCE",
  "OTHER",
];

function OnboardingForm() {
  const { accessToken, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const typeHint = (params.get("type") || "EXPORTER").toUpperCase();
  const defaultType = TYPES.includes(typeHint) ? typeHint : "EXPORTER";
  const countryHint = (params.get("country") || "").toUpperCase();
  const defaultCountry =
    countryHint.length === 2
      ? countryHint
      : defaultType === "BUYER"
        ? "OM"
        : "KE";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api("/organisations", {
        method: "POST",
        token: accessToken,
        body: {
          name: String(form.get("name")),
          type: String(form.get("type")),
          countryCode: String(form.get("countryCode")).toUpperCase(),
          city: String(form.get("city") || "") || undefined,
          registrationNumber:
            String(form.get("registrationNumber") || "") || undefined,
          taxId: String(form.get("taxId") || "") || undefined,
          website: String(form.get("website") || "") || undefined,
          description: String(form.get("description") || "") || undefined,
        },
      });
      await refreshProfile();
      const type = String(form.get("type"));
      const country = String(form.get("countryCode")).toUpperCase();
      if (type === "BUYER" && isGulfWestAsiaBuyer(country)) {
        router.push("/dashboard/rfqs");
      } else {
        router.push("/dashboard/registry");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to register organisation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--fg)]">
        Koridor
      </p>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">
        Register your organisation
      </h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Kenyan farms and exporters list as origin KE. Importers in Oman, Iran,
        or Iraq register as Buyer with destination country OM, IR, or IQ — then
        RFQ Kenyan produce.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input label="Legal name" name="name" required />
        <Select
          label="Organisation type"
          name="type"
          required
          defaultValue={defaultType}
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <CountrySelect
            label="Country"
            name="countryCode"
            required
            defaultValue={defaultCountry}
          />
          <Input
            label="City"
            name="city"
            placeholder={
              defaultType === "BUYER" ? "Muscat / Tehran / Baghdad" : "Nairobi"
            }
          />
        </div>
        <Input label="Registration number" name="registrationNumber" />
        <Input label="Tax ID" name="taxId" />
        <Input label="Website" name="website" type="url" />
        <Input label="Description" name="description" />
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Registering…" : "Create organisation"}
        </Button>
      </form>
    </div>
  );
}

export default function OrganisationOnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
