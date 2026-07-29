"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ShipmentDetail = {
  id: string;
  reference: string;
  status: string;
  origin?: string | null;
  destination?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  bookedAt?: string | null;
  departedAt?: string | null;
  deliveredAt?: string | null;
  buyerOrg: { name: string };
  sellerOrg: { name: string };
  providerOrg?: { name: string } | null;
  trackingEvents: {
    id: string;
    status: string;
    location?: string | null;
    message?: string | null;
    occurredAt: string;
  }[];
  proofOfDelivery?: {
    receivedByName: string;
    receivedAt: string;
    notes?: string | null;
  } | null;
};

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    api<ShipmentDetail>(`/logistics/shipments/${id}`, { token: accessToken })
      .then(setShipment)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load"),
      );
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/logistics/shipments/${id}`, {
        method: "POST",
        token: accessToken,
        body: { action, ...body },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  if (!shipment && !error) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">Loading shipment…</p>
    );
  }

  if (!shipment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <Link href="/dashboard/logistics" className="text-sm underline">
          Back to logistics
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/dashboard/logistics"
          className="text-xs text-[var(--fg-muted)] underline"
        >
          Logistics
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
          {shipment.reference}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {shipment.status} · {shipment.sellerOrg.name} → {shipment.buyerOrg.name}
          {shipment.providerOrg
            ? ` · via ${shipment.providerOrg.name}`
            : ""}
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="grid gap-3 border-t border-[var(--border)] pt-6 text-sm sm:grid-cols-2">
        <p>
          <span className="text-[var(--fg-muted)]">Origin</span>
          <br />
          {shipment.origin || "—"}
        </p>
        <p>
          <span className="text-[var(--fg-muted)]">Destination</span>
          <br />
          {shipment.destination || "—"}
        </p>
        <p>
          <span className="text-[var(--fg-muted)]">Carrier</span>
          <br />
          {shipment.carrierName || "—"}
        </p>
        <p>
          <span className="text-[var(--fg-muted)]">Tracking</span>
          <br />
          {shipment.trackingNumber || "—"}
        </p>
      </section>

      <section className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-6">
        {shipment.status === "DRAFT" || shipment.status === "BOOKED" ? (
          <Button
            size="sm"
            disabled={loading}
            onClick={() =>
              act("book", {
                carrierName: shipment.carrierName || "Koridor Logistics",
                trackingNumber:
                  shipment.trackingNumber || `TRK-${Date.now().toString(36)}`,
              })
            }
          >
            Book / confirm
          </Button>
        ) : null}
        {shipment.status === "BOOKED" || shipment.status === "IN_TRANSIT" ? (
          <Button
            size="sm"
            disabled={loading}
            onClick={() =>
              act("depart", {
                location: shipment.origin || "Origin hub",
                message: "Departed origin",
              })
            }
          >
            Mark in transit
          </Button>
        ) : null}
      </section>

      <form
        className="space-y-3 border-t border-[var(--border)] pt-6"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          act("track", {
            status: String(form.get("status")),
            location: String(form.get("location") || ""),
            message: String(form.get("message") || ""),
          });
        }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Add tracking event
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Status" name="status" required defaultValue="UPDATE" />
          <Input label="Location" name="location" />
          <Input label="Message" name="message" />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          Record event
        </Button>
      </form>

      {shipment.status !== "DELIVERED" ? (
        <form
          className="space-y-3 border-t border-[var(--border)] pt-6"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            act("deliver", {
              receivedByName: String(form.get("receivedByName")),
              notes: String(form.get("notes") || ""),
              location: shipment.destination || "",
            });
          }}
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Proof of delivery
          </h2>
          <Input label="Received by" name="receivedByName" required />
          <Input label="Notes" name="notes" />
          <Button type="submit" disabled={loading}>
            Confirm delivery
          </Button>
        </form>
      ) : shipment.proofOfDelivery ? (
        <section className="border-t border-[var(--border)] pt-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Proof of delivery
          </h2>
          <p className="mt-2 text-sm">
            Received by {shipment.proofOfDelivery.receivedByName} on{" "}
            {formatDate(shipment.proofOfDelivery.receivedAt)}
          </p>
          {shipment.proofOfDelivery.notes ? (
            <p className="text-sm text-[var(--fg-muted)]">
              {shipment.proofOfDelivery.notes}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Timeline
        </h2>
        {shipment.trackingEvents.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No events yet.</p>
        ) : (
          shipment.trackingEvents.map((ev) => (
            <div
              key={ev.id}
              className="border-b border-[var(--border)] py-2 text-sm"
            >
              <p className="font-medium">
                {ev.status}
                {ev.location ? ` · ${ev.location}` : ""}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {formatDate(ev.occurredAt)}
                {ev.message ? ` · ${ev.message}` : ""}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
