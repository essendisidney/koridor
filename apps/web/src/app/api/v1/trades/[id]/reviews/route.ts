import { NextRequest } from "next/server";
import { Prisma, TradeStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordTradeEvent } from "@/lib/trade";
import { parseRating, REVIEW_SUB_SCORES } from "@/lib/trade-reviews";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Reviews are two-sided: only the trade's buyer and seller orgs take part. */
async function loadTradeForOrg(tradeId: string, organisationId: string) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      deletedAt: null,
      OR: [{ buyerOrgId: organisationId }, { sellerOrgId: organisationId }],
    },
  });
  if (!trade) throw new Error("Trade not found");
  return trade;
}

function errorStatus(message: string) {
  return message === "Unauthorized"
    ? 401
    : message === "Trade not found"
      ? 404
      : 400;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;

    const trade = await loadTradeForOrg(id, membership.organisationId);
    const reviews = await prisma.tradeReview.findMany({
      where: { tradeId: id },
      orderBy: { createdAt: "asc" },
      include: {
        reviewerOrg: { select: { id: true, name: true, slug: true } },
        revieweeOrg: { select: { id: true, name: true, slug: true } },
      },
    });
    const mine = reviews.find(
      (r) => r.reviewerOrgId === membership.organisationId,
    );

    return ok({
      reviews,
      canReview:
        trade.status === TradeStatus.COMPLETED &&
        !!trade.sellerOrgId &&
        !mine,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, errorStatus(message));
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const body = await req.json();

    const trade = await loadTradeForOrg(id, membership.organisationId);
    if (trade.status !== TradeStatus.COMPLETED) {
      return fail("Only completed trades can be reviewed", 400);
    }
    if (!trade.sellerOrgId) return fail("Trade has no counterparty", 400);

    const reviewerOrgId = membership.organisationId;
    const revieweeOrgId =
      reviewerOrgId === trade.buyerOrgId ? trade.sellerOrgId : trade.buyerOrgId;
    if (revieweeOrgId === reviewerOrgId) {
      return fail("Cannot review your own organisation", 400);
    }

    const rating = parseRating(body.rating);
    if (rating == null) return fail("rating must be an integer 1-5", 400);

    const subScores: Partial<Record<(typeof REVIEW_SUB_SCORES)[number], number>> =
      {};
    for (const key of REVIEW_SUB_SCORES) {
      const value = parseRating(body[key]);
      if (value === null) return fail(`${key} must be an integer 1-5`, 400);
      if (value !== undefined) subScores[key] = value;
    }

    const comment =
      typeof body.comment === "string" && body.comment.trim()
        ? body.comment.trim().slice(0, 2000)
        : null;

    try {
      const review = await prisma.tradeReview.create({
        data: {
          tradeId: id,
          reviewerOrgId,
          revieweeOrgId,
          rating,
          ...subScores,
          comment,
          createdById: user.id,
        },
      });

      await recordTradeEvent({
        type: "NOTE",
        message: `Review submitted: counterparty rated ${rating}/5`,
        actorId: user.id,
        tradeId: id,
        metadata: { reviewId: review.id, revieweeOrgId },
      });

      return ok(review, { status: 201 });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return fail("Your organisation has already reviewed this trade", 409);
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, errorStatus(message));
  }
}
