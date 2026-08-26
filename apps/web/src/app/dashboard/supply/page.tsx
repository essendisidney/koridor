"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KENYA_PRODUCE } from "@/lib/corridors";

type Lot = {
  id: string;
  reference: string;
  commodity: string;
  availableQuantity: string | number;
  quantity: string | number;
  unit: string;
  status: string;
  originRegion?: string | null;
  grade?: string | null;
};

export default function SupplyPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Lot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [commodity, setCommodity] = useState("Avocado");
  const [quantity, setQuantity] = useState("200");
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!accessToken) return;
    api<Lot[]>("/supply-lots", { token: accessToken })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed"),
      );
  };

  useEffect(() => {
    load();
  }, [accessToken]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    try {
      await api("/supply-lots", {
        method: "POST",
        token: accessToken,
        body: {
          commodity,
          quantity: Number(quantity),
          availableQuantity: Number(quantity),
          originCountry: "KE",
          certifications: ["GlobalG.A.P."],
          grade: "A",
        },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          My supply
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Declare capacity Koridor can match to verified demand.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 border border-[var(--border)] bg-white p-5 sm:grid-cols-3"
      >
        <label className="text-sm sm:col-span-1">
          Commodity
          <select
            className="mt-1 h-11 w-full rounded-md border border-[var(--border)] px-3"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
          >
            {KENYA_PRODUCE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Available MT"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="w-full">
            Add lot
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {rows.map((r) => (
          <li key={r.id} className="py-4">
            <p className="font-medium">
              {r.commodity} · {r.availableQuantity} {r.unit}
            </p>
            <p className="text-xs text-[var(--fg-muted)]">
              {r.reference} · {r.status}
              {r.grade ? ` · Grade ${r.grade}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
