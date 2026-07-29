import { NextRequest } from "next/server";
import {
  ActivityType,
  ContractStatus,
  MilestoneStatus,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { decimalNumber, recordTradeEvent } from "@/lib/trade";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function loadContractForOrg(id: string, organisationId: string) {
  return prisma.contract.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [{ buyerOrgId: organisationId }, { sellerOrgId: organisationId }],
    },
    include: {
      buyerOrg: { select: { id: true, name: true, slug: true } },
      sellerOrg: { select: { id: true, name: true, slug: true } },
      milestones: {
        where: { deletedAt: null },
        orderBy: { sequence: "asc" },
      },
      escrowRequests: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      shipmentRequests: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      events: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const contract = await loadContractForOrg(id, membership.organisationId);
    if (!contract) return fail("Contract not found", 404);
    return ok(contract);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const body = await req.json();
    const action = String(body.action ?? "").toLowerCase();

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { buyerOrgId: membership.organisationId },
          { sellerOrgId: membership.organisationId },
        ],
      },
    });
    if (!contract) return fail("Contract not found", 404);

    if (action === "sign") {
      const isBuyer = contract.buyerOrgId === membership.organisationId;
      const isSeller = contract.sellerOrgId === membership.organisationId;
      const data: {
        buyerSignedAt?: Date;
        sellerSignedAt?: Date;
        status?: ContractStatus;
        activatedAt?: Date;
        updatedBy: string;
      } = { updatedBy: user.id };

      if (isBuyer) data.buyerSignedAt = new Date();
      if (isSeller) data.sellerSignedAt = new Date();

      const buyerSigned = isBuyer || Boolean(contract.buyerSignedAt);
      const sellerSigned = isSeller || Boolean(contract.sellerSignedAt);
      if (buyerSigned && sellerSigned) {
        data.status = ContractStatus.ACTIVE;
        data.activatedAt = new Date();
      } else {
        data.status = ContractStatus.PENDING_SIGNATURES;
      }

      const updated = await prisma.contract.update({
        where: { id },
        data,
        include: { milestones: { where: { deletedAt: null }, orderBy: { sequence: "asc" } } },
      });

      if (data.status === ContractStatus.ACTIVE) {
        await prisma.milestone.updateMany({
          where: { contractId: id, sequence: 1, deletedAt: null },
          data: {
            status: MilestoneStatus.COMPLETED,
            completedAt: new Date(),
            updatedBy: user.id,
          },
        });
      }

      await recordTradeEvent({
        type: "CONTRACT_SIGNED",
        message: isBuyer ? "Buyer signed" : "Seller signed",
        actorId: user.id,
        contractId: id,
        rfqId: contract.rfqId ?? undefined,
      });

      await prisma.activity.create({
        data: {
          type: ActivityType.CONTRACT_SIGNED,
          title: "Contract signature",
          description: contract.reference,
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "Contract",
          entityId: id,
        },
      });

      return ok(updated);
    }

    if (action === "escrow") {
      const amount = decimalNumber(body.amount, Number(contract.totalValue));
      const escrow = await prisma.escrowRequest.create({
        data: {
          contractId: id,
          amount,
          currency: contract.currency,
          notes: body.notes ? String(body.notes) : null,
          requestedById: user.id,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
      await recordTradeEvent({
        type: "ESCROW_REQUESTED",
        message: `Escrow ${amount} ${contract.currency}`,
        actorId: user.id,
        contractId: id,
      });
      await prisma.activity.create({
        data: {
          type: ActivityType.ESCROW_REQUESTED,
          title: "Escrow requested",
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "EscrowRequest",
          entityId: escrow.id,
        },
      });
      return ok(escrow, { status: 201 });
    }

    if (action === "shipment") {
      const shipment = await prisma.shipmentRequest.create({
        data: {
          contractId: id,
          origin: body.origin ? String(body.origin) : null,
          destination: body.destination ? String(body.destination) : null,
          readyDate: body.readyDate ? new Date(String(body.readyDate)) : null,
          notes: body.notes ? String(body.notes) : null,
          requestedById: user.id,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
      await recordTradeEvent({
        type: "SHIPMENT_REQUESTED",
        message: "Shipment requested",
        actorId: user.id,
        contractId: id,
      });
      await prisma.activity.create({
        data: {
          type: ActivityType.SHIPMENT_REQUESTED,
          title: "Shipment requested",
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "ShipmentRequest",
          entityId: shipment.id,
        },
      });
      return ok(shipment, { status: 201 });
    }

    return fail("action must be sign, escrow, or shipment", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
