"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/country-select";
import { Select } from "@/components/ui/select";
import { KENYA_PRODUCE } from "@/lib/corridors";

type Rfq = {
  id: string;
  reference: string;
  title: string;
  commodity: string;
  quantity: string | number;
  unit: string;
  status: string;
  currency: string;
  buyerOrg?: { name: string };
  _count?: { offers: number };
};

export default function RfqsPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<"mine" | "open">("mine");
  const [items, setItems] = useState<Rfq[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Rfq[]>(`/rfqs?scope=${tab}`, { token: accessToken })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load RFQs"),
      );
  }, [accessToken, tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRfq(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const rfq = await api<Rfq>("/rfqs", {
        method: "POST",
        token: accessToken,
        body: {
          title: String(form.get("title")),
          commodity: String(form.get("commodity")),
          quantity: String(form.get("quantity")),
          unit: String(form.get("unit") || "MT"),
          targetPrice: String(form.get("targetPrice") || ""),
          currency: String(form.get("currency") || "USD"),
          originCountry: String(form.get("originCountry") || ""),
          destinationCountry: String(form.get("destinationCountry") || ""),
          incoterm: String(form.get("incoterm") || ""),
          notes: String(form.get("notes") || ""),
          publish: form.get("publish") === "on",
        },
      });
      window.location.href = `/dashboard/rfqs/${rfq.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          RFQs
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Buyers in Oman, Iran, and Iraq: origin Kenya, destination your
          country. Kenyan exporters answer from Open market.
        </p>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)] pb-3">
        <Button
          size="sm"
          variant={tab === "mine" ? "primary" : "secondary"}
          onClick={() => setTab("mine")}
        >
          My RFQs
        </Button>
        <Button
          size="sm"
          variant={tab === "open" ? "primary" : "secondary"}
          onClick={() => setTab("open")}
        >
          Open market
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No RFQs in this view.</p>
        ) : (
          items.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/rfqs/${r.id}`}
              className="block border-b border-[var(--border)] py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-[var(--fg-muted)]">{r.status}</p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {r.reference} · {r.commodity} · {r.quantity} {r.unit}
                {r.buyerOrg ? ` · ${r.buyerOrg.name}` : ""}
                {r._count ? ` · ${r._count.offers} offers` : ""}
              </p>
            </Link>
          ))
        )}
      </div>

      {tab === "mine" ? (
        <form
          onSubmit={createRfq}
          className="space-y-3 border-t border-[var(--border)] pt-6"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Create RFQ
          </h2>
          <p className="text-sm text-[var(--fg-muted)]">
            Default corridor is Kenya origin to Oman / Iran / Iraq.
          </p>
          <Input label="Title" name="title" required placeholder="Hass avocado — Kenya to Muscat" />
          <Select label="Commodity" name="commodity" required defaultValue="Avocado">
            {KENYA_PRODUCE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="Other">Other</option>
          </Select>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              step="0.01"
              required
            />
            <Input label="Unit" name="unit" defaultValue="MT" />
            <Input label="Currency" name="currency" defaultValue="USD" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Target price"
              name="targetPrice"
              type="number"
              step="0.01"
            />
            <Input label="Incoterm" name="incoterm" placeholder="FOB Mombasa" defaultValue="FOB Mombasa" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CountrySelect
              label="Origin"
              name="originCountry"
              defaultValue="KE"
              required
            />
            <CountrySelect
              label="Destination"
              name="destinationCountry"
              defaultValue="OM"
              required
            />
          </div>
          <Input label="Notes" name="notes" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish" defaultChecked />
            Publish immediately
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create RFQ"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
