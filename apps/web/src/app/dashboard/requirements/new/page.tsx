"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KENYA_PRODUCE, WORLD_BUYER_DESTINATIONS, countryName } from "@/lib/corridors";

const STEPS = [
  "Product",
  "Quantity",
  "When",
  "Where",
  "Quality",
  "Terms",
  "Review",
] as const;

export default function NewRequirementPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    commodity: "Avocado",
    variety: "Hass",
    quantity: "500",
    unit: "MT",
    frequency: "MONTHLY",
    deliveryStart: "",
    deliveryEnd: "",
    destinationCountry: "AE",
    destinationCity: "Dubai",
    destinationPort: "Jebel Ali",
    grade: "A",
    sizeSpec: "",
    certifications: "GlobalG.A.P.",
    packaging: "4kg cartons",
    incoterm: "CIF",
    paymentTerms: "LC",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const row = await api<{ id: string }>("/requirements", {
        method: "POST",
        token: accessToken,
        body: {
          ...form,
          quantity: Number(form.quantity),
          certifications: form.certifications
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          publish: true,
          originPreference: "KE",
        },
      });
      await api(`/requirements/${row.id}`, {
        method: "POST",
        token: accessToken,
        body: { action: "rematch" },
      });
      router.push(`/dashboard/requirements/${row.id}/matches`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Post a buying requirement
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <form onSubmit={publish} className="space-y-4 border border-[var(--border)] bg-white p-6">
        {step === 0 ? (
          <>
            <label className="block text-sm">
              Commodity
              <select
                className="mt-1 h-11 w-full rounded-md border border-[var(--border)] px-3"
                value={form.commodity}
                onChange={(e) => set("commodity", e.target.value)}
              >
                {KENYA_PRODUCE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Variety"
              value={form.variety}
              onChange={(e) => set("variety", e.target.value)}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              required
            />
            <Input
              label="Unit"
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
            />
            <label className="block text-sm">
              Frequency
              <select
                className="mt-1 h-11 w-full rounded-md border border-[var(--border)] px-3"
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value)}
              >
                <option value="ONE_OFF">One-off</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Input
              label="Delivery start"
              type="date"
              value={form.deliveryStart}
              onChange={(e) => set("deliveryStart", e.target.value)}
            />
            <Input
              label="Delivery end"
              type="date"
              value={form.deliveryEnd}
              onChange={(e) => set("deliveryEnd", e.target.value)}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <label className="block text-sm">
              Destination country
              <select
                className="mt-1 h-11 w-full rounded-md border border-[var(--border)] px-3"
                value={form.destinationCountry}
                onChange={(e) => set("destinationCountry", e.target.value)}
              >
                {WORLD_BUYER_DESTINATIONS.map((c) => (
                  <option key={c} value={c}>
                    {countryName(c)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="City"
              value={form.destinationCity}
              onChange={(e) => set("destinationCity", e.target.value)}
            />
            <Input
              label="Port"
              value={form.destinationPort}
              onChange={(e) => set("destinationPort", e.target.value)}
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Input
              label="Grade"
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
            />
            <Input
              label="Size / calibre"
              value={form.sizeSpec}
              onChange={(e) => set("sizeSpec", e.target.value)}
            />
            <Input
              label="Certifications (comma-separated)"
              value={form.certifications}
              onChange={(e) => set("certifications", e.target.value)}
            />
            <Input
              label="Packaging"
              value={form.packaging}
              onChange={(e) => set("packaging", e.target.value)}
            />
          </>
        ) : null}

        {step === 5 ? (
          <>
            <Input
              label="Incoterm"
              value={form.incoterm}
              onChange={(e) => set("incoterm", e.target.value)}
            />
            <Input
              label="Payment terms"
              value={form.paymentTerms}
              onChange={(e) => set("paymentTerms", e.target.value)}
            />
            <label className="block text-sm">
              Notes
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] px-3 py-2"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </label>
          </>
        ) : null}

        {step === 6 ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              {form.variety} {form.commodity}
            </p>
            <p>
              {form.quantity} {form.unit} · {form.frequency}
            </p>
            <p>
              {countryName(form.destinationCountry)}
              {form.destinationCity ? ` · ${form.destinationCity}` : ""}
            </p>
            <p>
              {form.grade} · {form.incoterm} · {form.paymentTerms}
            </p>
            <p className="text-[var(--fg-muted)]">
              Market check: Koridor will rematch Kenya supply on publish.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="flex justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Publish requirement"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
