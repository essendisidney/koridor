import { prisma } from "@/lib/prisma";
import { tradeReference } from "@/lib/trade";

export function shipmentReference() {
  return tradeReference("SHP");
}

export async function recordTrackingEvent(input: {
  shipmentId: string;
  status: string;
  location?: string;
  message?: string;
  actorId?: string;
  occurredAt?: Date;
}) {
  return prisma.trackingEvent.create({
    data: {
      shipmentId: input.shipmentId,
      status: input.status,
      location: input.location,
      message: input.message,
      actorId: input.actorId,
      occurredAt: input.occurredAt ?? new Date(),
      createdBy: input.actorId,
      updatedBy: input.actorId,
    },
  });
}
