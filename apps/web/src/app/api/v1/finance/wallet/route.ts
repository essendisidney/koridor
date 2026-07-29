import { NextRequest } from "next/server";
import { ActivityType } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  canOperateFinance,
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  creditWallet,
  decimalStr,
  ensureWallet,
} from "@/lib/finance";
import { decimalNumber } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.FINANCE_READ);
    const membership = await requireOrgMembership(user.id);
    const currency =
      req.nextUrl.searchParams.get("currency")?.toUpperCase() ?? "USD";

    const wallet = await ensureWallet({
      organisationId: membership.organisationId,
      currency,
      actorId: user.id,
    });

    const entries = await prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({
      wallet: {
        ...wallet,
        availableBalance: decimalStr(wallet.availableBalance),
        heldBalance: decimalStr(wallet.heldBalance),
      },
      ledger: entries.map((e) => ({
        ...e,
        amount: decimalStr(e.amount),
        balanceAfter: decimalStr(e.balanceAfter),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.FINANCE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();
    const action = String(body.action ?? "top_up");

    if (action !== "top_up") {
      return fail("Unsupported action", 400);
    }

    // Org can top up own wallet; banks/admins can top up any org via operate + orgId
    let organisationId = membership.organisationId;
    if (body.organisationId && String(body.organisationId) !== organisationId) {
      if (!canOperateFinance(user)) {
        return fail("Forbidden", 403);
      }
      organisationId = String(body.organisationId);
    }

    const amount = decimalNumber(body.amount);
    if (amount <= 0) return fail("amount must be positive", 400);
    const currency = String(body.currency ?? "USD")
      .toUpperCase()
      .slice(0, 3);

    const wallet = await ensureWallet({
      organisationId,
      currency,
      actorId: user.id,
    });

    const result = await creditWallet({
      walletId: wallet.id,
      amount,
      kind: "TOP_UP",
      description: body.notes
        ? String(body.notes)
        : "Wallet top-up (demo settlement)",
      actorId: user.id,
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.WALLET_CREDITED,
        title: "Wallet credited",
        description: `${amount} ${currency}`,
        actorId: user.id,
        organisationId,
        entityType: "Wallet",
        entityId: wallet.id,
      },
    });

    return ok(
      {
        wallet: {
          ...result.wallet,
          availableBalance: decimalStr(result.wallet.availableBalance),
          heldBalance: decimalStr(result.wallet.heldBalance),
        },
        entry: {
          ...result.entry,
          amount: decimalStr(result.entry.amount),
          balanceAfter: decimalStr(result.entry.balanceAfter),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
