import { NextRequest } from "next/server";
import { ActivityType, MilestoneStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordTradeEvent } from "@/lib/trade";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id, milestoneId } = await ctx.params;
    const body = await req.json();
    const status = String(body.status ?? "").toUpperCase() as MilestoneStatus;

    if (!Object.values(MilestoneStatus).includes(status)) {
      return fail("Invalid milestone status", 400);
    }

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

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, contractId: id, deletedAt: null },
    });
    if (!milestone) return fail("Milestone not found", 404);

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status,
        completedAt: status === MilestoneStatus.COMPLETED ? new Date() : null,
        updatedBy: user.id,
      },
    });

    await recordTradeEvent({
      type: "MILESTONE_UPDATED",
      message: `${milestone.title} → ${status}`,
      actorId: user.id,
      contractId: id,
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.MILESTONE_UPDATED,
        title: "Milestone updated",
        description: `${milestone.title}: ${status}`,
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "Milestone",
        entityId: milestoneId,
      },
    });

    return ok(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
