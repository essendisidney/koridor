import { NextRequest } from "next/server";
import {
  ActivityType,
  ShipmentRequestStatus,
  ShipmentStatus,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  canOperateLogistics,
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordTrackingEvent } from "@/lib/logistics";
import { getCarrierProvider, carriersProviderName } from "@/lib/carriers";
import { recordTradeEvent } from "@/lib/trade";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function loadShipment(id: string) {
  return prisma.shipment.findFirst({
    where: { id, deletedAt: null },
    include: {
      buyerOrg: { select: { id: true, name: true, slug: true } },
      sellerOrg: { select: { id: true, name: true, slug: true } },
      providerOrg: { select: { id: true, name: true, slug: true } },
      proofOfDelivery: true,
      trackingEvents: {
        where: { deletedAt: null },
        orderBy: { occurredAt: "desc" },
      },
      shipmentRequest: true,
    },
  });
}

function canAccess(
  shipment: NonNullable<Awaited<ReturnType<typeof loadShipment>>>,
  organisationId: string,
  operate: boolean,
) {
  return (
    operate ||
    shipment.buyerOrgId === organisationId ||
    shipment.sellerOrgId === organisationId ||
    shipment.providerOrgId === organisationId
  );
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.LOGISTICS_READ);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const shipment = await loadShipment(id);
    if (!shipment) return fail("Shipment not found", 404);
    if (
      !canAccess(
        shipment,
        membership.organisationId,
        canOperateLogistics(user),
      )
    ) {
      return fail("Forbidden", 403);
    }
    return ok(shipment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.LOGISTICS_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const body = await req.json();
    const action = String(body.action ?? "");

    const shipment = await loadShipment(id);
    if (!shipment) return fail("Shipment not found", 404);

    const operate = canOperateLogistics(user);
    const isProvider =
      shipment.providerOrgId === membership.organisationId ||
      (!shipment.providerOrgId && operate);
    const isParty =
      shipment.buyerOrgId === membership.organisationId ||
      shipment.sellerOrgId === membership.organisationId;

    if (!canAccess(shipment, membership.organisationId, operate)) {
      return fail("Forbidden", 403);
    }

    if (action === "book") {
      if (!isProvider && !operate && !isParty) return fail("Forbidden", 403);
      if (
        shipment.status !== ShipmentStatus.DRAFT &&
        shipment.status !== ShipmentStatus.BOOKED
      ) {
        return fail("Shipment cannot be booked in current status", 400);
      }

      const providerOrgId =
        shipment.providerOrgId ??
        (operate ? membership.organisationId : null);
      if (!providerOrgId && !body.providerOrgId) {
        return fail("providerOrgId is required", 400);
      }

      const carrier = getCarrierProvider();
      const booking = await carrier.book({
        shipmentId: shipment.id,
        reference: shipment.reference,
        origin: shipment.origin,
        destination: shipment.destination,
        carrierName: body.carrierName
          ? String(body.carrierName)
          : shipment.carrierName,
        trackingNumber: body.trackingNumber
          ? String(body.trackingNumber)
          : shipment.trackingNumber,
      });

      const updated = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ShipmentStatus.BOOKED,
          providerOrgId: providerOrgId ?? String(body.providerOrgId),
          carrierName: booking.carrierName,
          trackingNumber: booking.trackingNumber,
          notes: booking.labelUrl
            ? `${shipment.notes ? `${shipment.notes}\n` : ""}Label: ${booking.labelUrl}`
            : shipment.notes,
          bookedAt: shipment.bookedAt ?? new Date(),
          updatedBy: user.id,
        },
      });

      await prisma.shipmentRequest.update({
        where: { id: shipment.shipmentRequestId },
        data: {
          status: ShipmentRequestStatus.BOOKED,
          updatedBy: user.id,
        },
      });

      await recordTrackingEvent({
        shipmentId: shipment.id,
        status: "BOOKED",
        location: body.location
          ? String(body.location)
          : shipment.origin ?? undefined,
        message: body.message
          ? String(body.message)
          : `Shipment booked via ${booking.provider}`,
        actorId: user.id,
      });

      await recordTradeEvent({
        type: "SHIPMENT_BOOKED",
        message: `Shipment ${shipment.reference} booked`,
        actorId: user.id,
        contractId: shipment.contractId,
      });

      await prisma.activity.create({
        data: {
          type: ActivityType.SHIPMENT_BOOKED,
          title: "Shipment booked",
          description: `${shipment.reference} · ${booking.provider}`,
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "Shipment",
          entityId: shipment.id,
        },
      });

      return ok({ ...updated, carrierProvider: carriersProviderName() });
    }

    if (action === "depart") {
      if (!isProvider && !operate) return fail("Forbidden", 403);
      if (
        shipment.status !== ShipmentStatus.BOOKED &&
        shipment.status !== ShipmentStatus.IN_TRANSIT
      ) {
        return fail("Shipment must be booked before transit", 400);
      }

      const updated = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ShipmentStatus.IN_TRANSIT,
          departedAt: shipment.departedAt ?? new Date(),
          trackingNumber: body.trackingNumber
            ? String(body.trackingNumber)
            : shipment.trackingNumber,
          updatedBy: user.id,
        },
      });

      await prisma.shipmentRequest.update({
        where: { id: shipment.shipmentRequestId },
        data: {
          status: ShipmentRequestStatus.IN_TRANSIT,
          updatedBy: user.id,
        },
      });

      await recordTrackingEvent({
        shipmentId: shipment.id,
        status: "IN_TRANSIT",
        location: body.location ? String(body.location) : undefined,
        message: body.message ? String(body.message) : "In transit",
        actorId: user.id,
      });

      await recordTradeEvent({
        type: "SHIPMENT_IN_TRANSIT",
        message: `Shipment ${shipment.reference} in transit`,
        actorId: user.id,
        contractId: shipment.contractId,
      });

      await prisma.activity.create({
        data: {
          type: ActivityType.SHIPMENT_IN_TRANSIT,
          title: "Shipment in transit",
          description: shipment.reference,
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "Shipment",
          entityId: shipment.id,
        },
      });

      return ok(updated);
    }

    if (action === "track") {
      if (!isProvider && !operate && !isParty) return fail("Forbidden", 403);
      const status = String(body.status ?? "UPDATE").trim();
      if (!status) return fail("status is required", 400);

      const event = await recordTrackingEvent({
        shipmentId: shipment.id,
        status,
        location: body.location ? String(body.location) : undefined,
        message: body.message ? String(body.message) : undefined,
        actorId: user.id,
      });

      return ok(event, { status: 201 });
    }

    if (action === "sync_tracking") {
      if (!isProvider && !operate && !isParty) return fail("Forbidden", 403);
      if (!shipment.trackingNumber) {
        return fail("Shipment has no tracking number", 400);
      }

      const carrier = getCarrierProvider();
      const updates = await carrier.track({
        trackingNumber: shipment.trackingNumber,
        carrierName: shipment.carrierName,
      });

      const created = [];
      for (const u of updates) {
        const dup = await prisma.trackingEvent.findFirst({
          where: {
            shipmentId: shipment.id,
            status: u.status,
            message: u.message ?? null,
            deletedAt: null,
            occurredAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
        });
        if (dup) continue;
        created.push(
          await recordTrackingEvent({
            shipmentId: shipment.id,
            status: u.status,
            location: u.location,
            message: u.message ?? u.rawStatus,
            actorId: user.id,
            occurredAt: u.occurredAt,
          }),
        );
      }

      const latest = updates[updates.length - 1];
      if (
        latest?.status === "IN_TRANSIT" &&
        shipment.status === ShipmentStatus.BOOKED
      ) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: ShipmentStatus.IN_TRANSIT,
            departedAt: shipment.departedAt ?? new Date(),
            updatedBy: user.id,
          },
        });
      }

      return ok({
        provider: carriersProviderName(),
        imported: created.length,
        events: created,
      });
    }

    if (action === "deliver") {
      if (!isProvider && !operate && !isParty) return fail("Forbidden", 403);
      if (shipment.status === ShipmentStatus.DELIVERED) {
        return fail("Already delivered", 400);
      }
      if (
        shipment.status !== ShipmentStatus.IN_TRANSIT &&
        shipment.status !== ShipmentStatus.BOOKED
      ) {
        return fail("Shipment is not ready for delivery", 400);
      }

      const receivedByName = String(body.receivedByName ?? "").trim();
      if (!receivedByName) return fail("receivedByName is required", 400);

      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: ShipmentStatus.DELIVERED,
            deliveredAt: new Date(),
            updatedBy: user.id,
          },
        });

        await tx.shipmentRequest.update({
          where: { id: shipment.shipmentRequestId },
          data: {
            status: ShipmentRequestStatus.DELIVERED,
            updatedBy: user.id,
          },
        });

        const pod = await tx.proofOfDelivery.upsert({
          where: { shipmentId: shipment.id },
          update: {
            receivedByName,
            receivedAt: body.receivedAt
              ? new Date(String(body.receivedAt))
              : new Date(),
            notes: body.notes ? String(body.notes) : null,
            signatureRef: body.signatureRef
              ? String(body.signatureRef)
              : null,
            updatedBy: user.id,
            deletedAt: null,
          },
          create: {
            shipmentId: shipment.id,
            receivedByName,
            receivedAt: body.receivedAt
              ? new Date(String(body.receivedAt))
              : new Date(),
            notes: body.notes ? String(body.notes) : null,
            signatureRef: body.signatureRef
              ? String(body.signatureRef)
              : null,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });

        return { shipment: s, proofOfDelivery: pod };
      });

      await recordTrackingEvent({
        shipmentId: shipment.id,
        status: "DELIVERED",
        location: body.location
          ? String(body.location)
          : shipment.destination ?? undefined,
        message: `Delivered to ${receivedByName}`,
        actorId: user.id,
      });

      await recordTradeEvent({
        type: "SHIPMENT_DELIVERED",
        message: `Shipment ${shipment.reference} delivered`,
        actorId: user.id,
        contractId: shipment.contractId,
      });

      await prisma.activity.create({
        data: {
          type: ActivityType.SHIPMENT_DELIVERED,
          title: "Shipment delivered",
          description: shipment.reference,
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "Shipment",
          entityId: shipment.id,
        },
      });

      return ok(updated);
    }

    return fail(
      "action must be book, depart, track, sync_tracking, or deliver",
      400,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
