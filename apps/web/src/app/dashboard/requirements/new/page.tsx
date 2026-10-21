"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KENYA_PRODUCE, WORLD_BUYER_DESTINATIONS, countryName } from "@/lib/corridors";
import { RestrictedMarketNotice } from "@/components/restricted-market-notice";

const selectClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

/** One page: the essentials first, trade details optional. */
export default function NewRequirementPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    commodity: "Avocado",
    variety: "",
    quantity: "",
    unit: "MT",
    frequency: "ONE_OFF",
    deliveryStart: "",
    deliveryEnd: "",
    destinationCountry: "AE",
    destinationCity: "",
    destinationPort: "",
    grade: "",
    sizeSpec: "",
    certifications: "",
    packaging: "",
    incoterm: "",
    paymentTerms: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Arriving from a product page ("Get quotes") pre-fills the product.
  useEffect(() => {
    const commodity = new URLSearchParams(window.location.search).get("commodity");
    if (commodity) setForm((f) => ({ ...f, commodity }));
  }, []);

  const produce: string[] = KENYA_PRODUCE.includes(form.commodity as (typeof KENYA_PRODUCE)[number])
    ? [...KENYA_PRODUCE]
    : [form.commodity, ...KENYA_PRODUCE];

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      // Publishing runs matching and notifies farms; no second call needed.
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
      router.push(`/dashboard/requirements/${row.id}/matches`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="eyebrow">New request</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          What do you want to buy?
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Verified Kenyan farms that fit get your request straight away and send
          you offers.
        </p>
        <RestrictedMarketNotice className="mt-4" />
      </div>

      <form onSubmit={publish} className="card space-y-6 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Product
            <select
              className={selectClass}
              value={form.commodity}
              onChange={(e) => set("commodity", e.target.value)}
            >
              {produce.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Variety (optional)"
            placeholder="e.g. Hass"
            value={form.variety}
            onChange={(e) => set("variety", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Quantity (tonnes)"
            type="number"
            min={1}
            placeholder="e.g. 22"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            required
          />
          <label className="block text-sm font-medium">
            How often
            <select
              className={selectClass}
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value)}
            >
              <option value="ONE_OFF">Just once</option>
              <option value="MONTHLY">Every month</option>
              <option value="QUARTERLY">Every quarter</option>
              <option value="ANNUAL">Every year</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Deliver to
            <select
              className={selectClass}
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
            label="City or port (optional)"
            placeholder="e.g. Jebel Ali"
            value={form.destinationPort}
            onChange={(e) => set("destinationPort", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Earliest delivery (optional)"
            type="date"
            value={form.deliveryStart}
            onChange={(e) => set("deliveryStart", e.target.value)}
          />
          <Input
            label="Latest delivery (optional)"
            type="date"
            value={form.deliveryEnd}
            onChange={(e) => set("deliveryEnd", e.target.value)}
          />
        </div>

        <details className="group rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
            More details: quality, certificates, payment
            <ChevronDown className="h-4 w-4 text-[var(--fg-muted)] transition group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Grade"
              placeholder="e.g. A / Class 1"
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
            />
            <Input
              label="Size"
              placeholder="e.g. 16–22 count"
              value={form.sizeSpec}
              onChange={(e) => set("sizeSpec", e.target.value)}
            />
            <Input
              label="Certificates needed"
              placeholder="e.g. GlobalG.A.P., Halal"
              value={form.certifications}
              onChange={(e) => set("certifications", e.target.value)}
            />
            <Input
              label="Packaging"
              placeholder="e.g. 4 kg cartons"
              value={form.packaging}
              onChange={(e) => set("packaging", e.target.value)}
            />
            <label className="block text-sm font-medium">
              Delivery terms
              <select
                className={selectClass}
                value={form.incoterm}
                onChange={(e) => set("incoterm", e.target.value)}
              >
                <option value="">No preference</option>
                <option value="FOB">FOB: you arrange shipping from Kenya</option>
                <option value="CFR">CFR: farm pays freight to your port</option>
                <option value="CIF">CIF: freight and insurance to your port</option>
                <option value="DAP">DAP: delivered to your door</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Payment
              <select
                className={selectClass}
                value={form.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
              >
                <option value="">Koridor escrow (default)</option>
                <option value="LC">Letter of credit</option>
                <option value="CAD">Cash against documents</option>
              </select>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Anything else farms should know
              <textarea
                className="mt-1.5 min-h-24 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </label>
          </div>
        </details>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--fg-muted)]">
            You only commit when you accept an offer.
          </p>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Finding farms…" : "Get offers from farms"}
          </Button>
        </div>
      </form>
    </div>
  );
}
