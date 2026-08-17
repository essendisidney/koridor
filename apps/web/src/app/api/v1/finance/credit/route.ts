import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { decimalStr } from "@/lib/bankability";
import {
  issueTradeCreditDraw,
  serializeFacility,
  settleTradeCreditDraw,
  syncTradeCreditFacility,
} from "@/lib/trade-credit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.FINANCE_READ);
    const membership = await requireOrgMembership(user.id);

    const facility = serializeFacility(
      await syncTradeCreditFacility({
        organisationId: membership.organisationId,
        actorId: user.id,
      }),
    );

    const asSupplier = await prisma.tradeCreditDraw.findMany({
      where: {
        supplierOrgId: membership.organisationId,
        deletedAt: null,
      },
      include: {
        facility: {
          include: {
            organisation: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({
      facility,
      receivedDraws: asSupplier.map((d) => ({
        id: d.id,
        reference: d.reference,
        amount: decimalStr(d.amount),
        currency: d.currency,
        status: d.status,
        description: d.description,
        tradeId: d.tradeId,
        settledAt: d.settledAt,
        createdAt: d.createdAt,
        buyerOrg: d.facility.organisation,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.FINANCE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();
    const action = String(body.action ?? "sync");

    if (action === "sync") {
      const facility = serializeFacility(
        await syncTradeCreditFacility({
          organisationId: membership.organisationId,
          actorId: user.id,
        }),
      );
      return ok({ facility });
    }

    if (action === "draw") {
      const supplierOrgId = String(body.supplierOrgId ?? "");
      const amount = Number(body.amount);
      if (!supplierOrgId) return fail("supplierOrgId is required", 400);
      if (!Number.isFinite(amount) || amount <= 0) {
        return fail("amount must be a positive number", 400);
      }

      const draw = await issueTradeCreditDraw({
        organisationId: membership.organisationId,
        supplierOrgId,
        amount,
        tradeId: body.tradeId ? String(body.tradeId) : undefined,
        description: body.description
          ? String(body.description)
          : undefined,
        actorId: user.id,
      });

      const facility = serializeFacility(
        await syncTradeCreditFacility({
          organisationId: membership.organisationId,
          actorId: user.id,
        }),
      );

      return ok({
        draw: {
          id: draw.id,
          reference: draw.reference,
          amount: decimalStr(draw.amount),
          currency: draw.currency,
          status: draw.status,
          description: draw.description,
          tradeId: draw.tradeId,
          supplierOrg: draw.supplierOrg,
          createdAt: draw.createdAt,
        },
        facility,
      });
    }

    if (action === "settle") {
      const drawId = String(body.drawId ?? body.id ?? "");
      if (!drawId) return fail("drawId is required", 400);
      const collectFromWallet =
        body.collectFromWallet === undefined
          ? true
          : Boolean(body.collectFromWallet);

      const draw = await settleTradeCreditDraw({
        organisationId: membership.organisationId,
        drawId,
        actorId: user.id,
        collectFromWallet,
      });

      const facility = serializeFacility(
        await syncTradeCreditFacility({
          organisationId: membership.organisationId,
          actorId: user.id,
        }),
      );

      return ok({
        draw: {
          id: draw.id,
          reference: draw.reference,
          amount: decimalStr(draw.amount),
          currency: draw.currency,
          status: draw.status,
          settledAt: draw.settledAt,
          supplierOrg: draw.supplierOrg,
        },
        facility,
      });
    }

    return fail("Unknown action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
