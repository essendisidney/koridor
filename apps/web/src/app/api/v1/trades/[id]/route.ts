import { NextRequest } from "next/server";
import {
  TradeEvidenceType,
  TradeMilestoneStatus,
  TradeStatus,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordTradeEvent } from "@/lib/trade";
import {
  completeMilestoneIfReady,
  computeCompletion,
  computeReadiness,
  nextStatus,
  recomputeTradeScores,
  STATUS_STAGE,
  syncMilestonesFromWorld,
} from "@/lib/trade-passport";
import { scoreExecutableCorridorSafe } from "@/lib/corridor-completion";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function assertTradeAccess(tradeId: string, organisationId: string) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      deletedAt: null,
      OR: [
        { buyerOrgId: organisationId },
        { sellerOrgId: organisationId },
        {
          participants: {
            some: { organisationId, deletedAt: null },
          },
        },
      ],
    },
  });
  if (!trade) throw new Error("Trade not found");
  return trade;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;

    await assertTradeAccess(id, membership.organisationId);
    await syncMilestonesFromWorld(id, user.id);
    await recomputeTradeScores(id, user.id);

    const trade = await prisma.trade.findFirst({
      where: { id, deletedAt: null },
      include: {
        buyerOrg: {
          select: {
            id: true,
            name: true,
            slug: true,
            verificationStatus: true,
            type: true,
          },
        },
        sellerOrg: {
          select: {
            id: true,
            name: true,
            slug: true,
            verificationStatus: true,
            type: true,
          },
        },
        participants: {
          where: { deletedAt: null },
          include: {
            organisation: {
              select: { id: true, name: true, slug: true, type: true },
            },
          },
        },
        milestones: {
          where: { deletedAt: null },
          orderBy: { sequence: "asc" },
          include: {
            evidence: { where: { deletedAt: null }, orderBy: { capturedAt: "desc" } },
          },
        },
        evidence: {
          where: { deletedAt: null },
          orderBy: { capturedAt: "desc" },
          take: 50,
        },
        timeline: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        contracts: {
          where: { deletedAt: null },
          include: {
            escrowRequests: {
              where: { deletedAt: null },
              include: { escrowAccount: true },
            },
            shipmentRequests: {
              where: { deletedAt: null },
              include: {
                shipment: {
                  include: {
                    proofOfDelivery: true,
                    trackingEvents: {
                      where: { deletedAt: null },
                      orderBy: { occurredAt: "desc" },
                      take: 5,
                    },
                  },
                },
              },
            },
          },
        },
        certificates: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        rfqs: { where: { deletedAt: null }, take: 5 },
      },
    });
    if (!trade) return fail("Trade not found", 404);

    const [readiness, completion, executable] = await Promise.all([
      computeReadiness(id),
      computeCompletion(id),
      scoreExecutableCorridorSafe(id),
    ]);

    return ok({ ...trade, readiness, completion, executable });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized"
        ? 401
        : message === "Trade not found"
          ? 404
          : 400,
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const body = await req.json();
    const action = String(body.action ?? "");

    const trade = await assertTradeAccess(id, membership.organisationId);

    if (action === "recompute") {
      await syncMilestonesFromWorld(id, user.id);
      const updated = await recomputeTradeScores(id, user.id);
      const readiness = await computeReadiness(id);
      const completion = await computeCompletion(id);
      const executable = await scoreExecutableCorridorSafe(id);
      return ok({ trade: updated, readiness, completion, executable });
    }

    if (action === "advance") {
      if (
        trade.status === TradeStatus.CANCELLED ||
        trade.status === TradeStatus.DISPUTED
      ) {
        return fail("Cannot advance a cancelled or disputed trade", 400);
      }
      const nxt = nextStatus(trade.status);
      if (!nxt) return fail("Trade cannot advance further", 400);

      const updated = await prisma.trade.update({
        where: { id },
        data: {
          status: nxt,
          currentStage: STATUS_STAGE[nxt],
          completedAt: nxt === TradeStatus.COMPLETED ? new Date() : null,
          updatedBy: user.id,
        },
      });

      await recordTradeEvent({
        type: nxt === TradeStatus.COMPLETED ? "TRADE_COMPLETED" : "TRADE_ADVANCED",
        message: `Advanced to ${STATUS_STAGE[nxt]}`,
        actorId: user.id,
        tradeId: id,
      });

      await recomputeTradeScores(id, user.id);
      return ok(updated);
    }

    if (action === "cancel") {
      const updated = await prisma.trade.update({
        where: { id },
        data: {
          status: TradeStatus.CANCELLED,
          currentStage: STATUS_STAGE.CANCELLED,
          updatedBy: user.id,
        },
      });
      await recordTradeEvent({
        type: "TRADE_CANCELLED",
        message: body.notes ? String(body.notes) : "Trade cancelled",
        actorId: user.id,
        tradeId: id,
      });
      return ok(updated);
    }

    if (action === "dispute") {
      const updated = await prisma.trade.update({
        where: { id },
        data: {
          status: TradeStatus.DISPUTED,
          currentStage: STATUS_STAGE.DISPUTED,
          updatedBy: user.id,
        },
      });
      await recordTradeEvent({
        type: "TRADE_DISPUTED",
        message: body.notes ? String(body.notes) : "Trade disputed",
        actorId: user.id,
        tradeId: id,
      });
      return ok(updated);
    }

    if (action === "complete_milestone") {
      const code = String(body.code ?? "");
      if (!code) return fail("code is required", 400);
      const milestone = await completeMilestoneIfReady({
        tradeId: id,
        code,
        actorId: user.id,
      });
      if (!milestone) return fail("Milestone not found", 404);
      if (milestone.status !== TradeMilestoneStatus.COMPLETED) {
        return fail(
          "Milestone dependencies or required evidence not satisfied",
          400,
        );
      }
      await recordTradeEvent({
        type: "MILESTONE_UPDATED",
        message: `Milestone ${code} completed`,
        actorId: user.id,
        tradeId: id,
      });
      await recomputeTradeScores(id, user.id);
      return ok(milestone);
    }

    if (action === "attach_evidence") {
      const type = String(body.type ?? "") as TradeEvidenceType;
      const title = String(body.title ?? "").trim();
      if (!Object.values(TradeEvidenceType).includes(type)) {
        return fail("Invalid evidence type", 400);
      }
      if (!title) return fail("title is required", 400);

      let milestoneId: string | null = null;
      if (body.milestoneCode || body.milestoneId) {
        const milestone = await prisma.tradeMilestone.findFirst({
          where: {
            tradeId: id,
            deletedAt: null,
            ...(body.milestoneId
              ? { id: String(body.milestoneId) }
              : { code: String(body.milestoneCode) }),
          },
        });
        if (!milestone) return fail("Milestone not found", 404);
        milestoneId = milestone.id;
      }

      const evidence = await prisma.tradeEvidence.create({
        data: {
          tradeId: id,
          milestoneId,
          type,
          title,
          referenceRef: body.referenceRef ? String(body.referenceRef) : null,
          storagePath: body.storagePath ? String(body.storagePath) : null,
          contentHash: body.contentHash ? String(body.contentHash) : null,
          documentId: body.documentId ? String(body.documentId) : null,
          certificateId: body.certificateId
            ? String(body.certificateId)
            : null,
          metadata: body.metadata ?? undefined,
          actorId: user.id,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      if (body.milestoneCode) {
        await completeMilestoneIfReady({
          tradeId: id,
          code: String(body.milestoneCode),
          actorId: user.id,
        });
      }

      await recordTradeEvent({
        type: "EVIDENCE_ATTACHED",
        message: title,
        actorId: user.id,
        tradeId: id,
        metadata: { evidenceId: evidence.id, type },
      });

      await recomputeTradeScores(id, user.id);
      return ok(evidence, { status: 201 });
    }

    return fail(
      "action must be advance, attach_evidence, complete_milestone, cancel, dispute, or recompute",
      400,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized"
        ? 401
        : message === "Trade not found"
          ? 404
          : 400,
    );
  }
}
