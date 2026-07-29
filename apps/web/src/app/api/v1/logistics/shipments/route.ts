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
import { recordTrackingEvent, shipmentReference } from "@/lib/logistics";
import { recordTradeEvent } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.LOGISTICS_READ);
    const membership = await requireOrgMembership(user.id);
    const operate = canOperateLogistics(user);

    const shipments = await prisma.shipment.findMany({
      where: {
        deletedAt: null,
        ...(operate
          ? {
              OR: [
                { providerOrgId: membership.organisationId },
                { providerOrgId: null },
                { buyerOrgId: membership.organisationId },
                { sellerOrgId: membership.organisationId },
              ],
            }
          : {
              OR: [
                { buyerOrgId: membership.organisationId },
                { sellerOrgId: membership.organisationId },
                { providerOrgId: membership.organisationId },
              ],
            }),
      },
      include: {
        buyerOrg: { select: { id: true, name: true, slug: true } },
        sellerOrg: { select: { id: true, name: true, slug: true } },
        providerOrg: { select: { id: true, name: true, slug: true } },
        proofOfDelivery: true,
        trackingEvents: {
          where: { deletedAt: null },
          orderBy: { occurredAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok(shipments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.LOGISTICS_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();
    const action = String(body.action ?? "create");

    if (action === "create") {
      const shipmentRequestId = String(body.shipmentRequestId ?? "");
      if (!shipmentRequestId) {
        return fail("shipmentRequestId is required", 400);
      }

      const request = await prisma.shipmentRequest.findFirst({
        where: { id: shipmentRequestId, deletedAt: null },
        include: { contract: true, shipment: true },
      });
      if (!request) return fail("Shipment request not found", 404);
      if (request.shipment) {
        return fail("Shipment already exists for this request", 400);
      }

      const isParty =
        request.contract.buyerOrgId === membership.organisationId ||
        request.contract.sellerOrgId === membership.organisationId;
      if (!isParty && !canOperateLogistics(user)) {
        return fail("Forbidden", 403);
      }

      const providerOrgId = canOperateLogistics(user)
        ? membership.organisationId
        : body.providerOrgId
          ? String(body.providerOrgId)
          : null;

      const shipment = await prisma.shipment.create({
        data: {
          reference: shipmentReference(),
          shipmentRequestId: request.id,
          contractId: request.contractId,
          buyerOrgId: request.contract.buyerOrgId,
          sellerOrgId: request.contract.sellerOrgId,
          providerOrgId,
          status: providerOrgId ? ShipmentStatus.BOOKED : ShipmentStatus.DRAFT,
          origin: body.origin ? String(body.origin) : request.origin,
          destination: body.destination
            ? String(body.destination)
            : request.destination,
          carrierName: body.carrierName ? String(body.carrierName) : null,
          trackingNumber: body.trackingNumber
            ? String(body.trackingNumber)
            : null,
          bookedAt: providerOrgId ? new Date() : null,
          notes: body.notes ? String(body.notes) : request.notes,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      if (providerOrgId) {
        await prisma.shipmentRequest.update({
          where: { id: request.id },
          data: {
            status: ShipmentRequestStatus.BOOKED,
            updatedBy: user.id,
          },
        });
        await recordTrackingEvent({
          shipmentId: shipment.id,
          status: "BOOKED",
          message: "Shipment booked",
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
            description: shipment.reference,
            actorId: user.id,
            organisationId: membership.organisationId,
            entityType: "Shipment",
            entityId: shipment.id,
          },
        });
      }

      return ok(shipment, { status: 201 });
    }

    return fail("action must be create", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
