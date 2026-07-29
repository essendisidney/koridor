"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Shipment = {
  id: string;
  reference: string;
  status: string;
  origin?: string | null;
  destination?: string | null;
  trackingNumber?: string | null;
  carrierName?: string | null;
  buyerOrg: { name: string };
  sellerOrg: { name: string };
  providerOrg?: { name: string } | null;
};

export default function LogisticsPage() {
  const { accessToken } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    api<Shipment[]>("/logistics/shipments", { token: accessToken })
      .then(setShipments)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function createFromRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const shipment = await api<Shipment>("/logistics/shipments", {
        method: "POST",
        token: accessToken,
        body: {
          action: "create",
          shipmentRequestId: String(form.get("shipmentRequestId")),
          carrierName: String(form.get("carrierName") || ""),
          trackingNumber: String(form.get("trackingNumber") || ""),
          origin: String(form.get("origin") || ""),
          destination: String(form.get("destination") || ""),
        },
      });
      window.location.href = `/dashboard/logistics/${shipment.id}`;
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
          Logistics
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Shipments, tracking events, and proof of delivery.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Shipments
        </h2>
        {shipments.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            No shipments yet. Request shipment on a{" "}
            <Link href="/dashboard/contracts" className="underline">
              contract
            </Link>
            , then book it below.
          </p>
        ) : (
          shipments.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/logistics/${s.id}`}
              className="block border-b border-[var(--border)] py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{s.reference}</p>
                <p className="text-xs text-[var(--fg-muted)]">{s.status}</p>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                {s.origin || "—"} → {s.destination || "—"}
                {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                {" · "}
                {s.sellerOrg.name} → {s.buyerOrg.name}
              </p>
            </Link>
          ))
        )}
      </section>

      <form
        onSubmit={createFromRequest}
        className="space-y-3 border-t border-[var(--border)] pt-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Book from shipment request
        </h2>
        <Input
          label="Shipment request id"
          name="shipmentRequestId"
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Carrier" name="carrierName" />
          <Input label="Tracking number" name="trackingNumber" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Origin" name="origin" />
          <Input label="Destination" name="destination" />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create shipment"}
        </Button>
      </form>
    </div>
  );
}
