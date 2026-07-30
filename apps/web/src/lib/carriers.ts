import { tradeReference } from "@/lib/trade";

export type CarrierBooking = {
  carrierName: string;
  trackingNumber: string;
  externalId?: string;
  labelUrl?: string;
  provider: string;
};

export type CarrierTrackUpdate = {
  status: string;
  location?: string;
  message?: string;
  occurredAt: Date;
  rawStatus?: string;
};

export interface CarrierProvider {
  name: string;
  book(input: {
    shipmentId: string;
    reference: string;
    origin?: string | null;
    destination?: string | null;
    carrierName?: string | null;
    trackingNumber?: string | null;
  }): Promise<CarrierBooking>;
  track(input: {
    trackingNumber: string;
    carrierName?: string | null;
  }): Promise<CarrierTrackUpdate[]>;
}

const manualProvider: CarrierProvider = {
  name: "manual",
  async book(input) {
    const trackingNumber =
      input.trackingNumber?.trim() ||
      `TRK-${Date.now().toString(36).toUpperCase()}`;
    return {
      carrierName: input.carrierName?.trim() || "Koridor Logistics",
      trackingNumber,
      provider: "manual",
      externalId: input.reference,
    };
  },
  async track(input) {
    return [
      {
        status: "UPDATE",
        message: `Manual carrier — no live feed for ${input.trackingNumber}`,
        occurredAt: new Date(),
      },
    ];
  },
};

const aftershipProvider: CarrierProvider = {
  name: "aftership",
  async book(input) {
    const apiKey = process.env.AFTERSHIP_API_KEY?.trim();
    if (!apiKey) throw new Error("AFTERSHIP_API_KEY is not configured");

    const trackingNumber =
      input.trackingNumber?.trim() || tradeReference("TRK").replace("TRD-", "");
    const slug =
      process.env.AFTERSHIP_CARRIER_SLUG?.trim() ||
      inferAftershipSlug(input.carrierName);

    const body: Record<string, unknown> = {
      tracking: {
        tracking_number: trackingNumber,
        ...(slug ? { slug } : {}),
        custom_fields: {
          koridor_shipment_id: input.shipmentId,
          koridor_reference: input.reference,
        },
      },
    };

    const res = await fetch("https://api.aftership.com/tracking/2024-01/trackings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "as-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      data?: {
        tracking?: {
          id?: string;
          tracking_number?: string;
          slug?: string;
          courier_tracking_link?: string;
        };
      };
      meta?: { message?: string };
    };

    // 409 = already exists — treat as success
    if (!res.ok && res.status !== 409) {
      throw new Error(json.meta?.message ?? "AfterShip booking failed");
    }

    const tracking = json.data?.tracking;
    return {
      carrierName:
        input.carrierName?.trim() ||
        tracking?.slug?.replaceAll("-", " ") ||
        "AfterShip carrier",
      trackingNumber: tracking?.tracking_number || trackingNumber,
      externalId: tracking?.id,
      labelUrl: tracking?.courier_tracking_link,
      provider: "aftership",
    };
  },
  async track(input) {
    const apiKey = process.env.AFTERSHIP_API_KEY?.trim();
    if (!apiKey) throw new Error("AFTERSHIP_API_KEY is not configured");

    const slug =
      process.env.AFTERSHIP_CARRIER_SLUG?.trim() ||
      inferAftershipSlug(input.carrierName);
    const path = slug
      ? `https://api.aftership.com/tracking/2024-01/trackings/${encodeURIComponent(slug)}/${encodeURIComponent(input.trackingNumber)}`
      : `https://api.aftership.com/tracking/2024-01/trackings?tracking_numbers=${encodeURIComponent(input.trackingNumber)}`;

    const res = await fetch(path, {
      headers: { "as-api-key": apiKey },
    });
    const json = (await res.json()) as {
      data?: {
        tracking?: {
          tag?: string;
          checkpoints?: {
            tag?: string;
            location?: string;
            message?: string;
            checkpoint_time?: string;
          }[];
        };
        trackings?: {
          tag?: string;
          checkpoints?: {
            tag?: string;
            location?: string;
            message?: string;
            checkpoint_time?: string;
          }[];
        }[];
      };
      meta?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json.meta?.message ?? "AfterShip track failed");
    }

    const tracking =
      json.data?.tracking ??
      json.data?.trackings?.[0];
    const checkpoints = tracking?.checkpoints ?? [];
    if (checkpoints.length === 0 && tracking?.tag) {
      return [
        {
          status: mapAftershipTag(tracking.tag),
          rawStatus: tracking.tag,
          message: tracking.tag,
          occurredAt: new Date(),
        },
      ];
    }

    return checkpoints.map((c) => ({
      status: mapAftershipTag(c.tag ?? "InfoReceived"),
      rawStatus: c.tag,
      location: c.location,
      message: c.message,
      occurredAt: c.checkpoint_time
        ? new Date(c.checkpoint_time)
        : new Date(),
    }));
  },
};

function inferAftershipSlug(carrierName?: string | null) {
  if (!carrierName) return undefined;
  const n = carrierName.toLowerCase();
  if (n.includes("dhl")) return "dhl";
  if (n.includes("fedex")) return "fedex";
  if (n.includes("ups")) return "ups";
  if (n.includes("usps")) return "usps";
  if (n.includes("aramex")) return "aramex";
  return undefined;
}

function mapAftershipTag(tag: string) {
  switch (tag) {
    case "Delivered":
      return "DELIVERED";
    case "InTransit":
    case "OutForDelivery":
      return "IN_TRANSIT";
    case "AvailableForPickup":
      return "AT_PICKUP";
    case "Exception":
    case "AttemptFail":
      return "EXCEPTION";
    case "InfoReceived":
      return "BOOKED";
    default:
      return tag.toUpperCase();
  }
}

export function carriersProviderName() {
  const configured = process.env.CARRIER_PROVIDER?.trim().toLowerCase();
  if (configured) return configured;
  if (process.env.AFTERSHIP_API_KEY?.trim()) return "aftership";
  return "manual";
}

export function getCarrierProvider(): CarrierProvider {
  const name = carriersProviderName();
  if (name === "aftership") return aftershipProvider;
  return manualProvider;
}
