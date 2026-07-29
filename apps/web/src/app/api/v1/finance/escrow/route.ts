import { NextRequest } from "next/server";
import {
  ActivityType,
  EscrowAccountStatus,
  EscrowRequestStatus,
} from "@prisma/client";
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
  decimalStr,
  ensureWallet,
  escrowReference,
  holdForEscrow,
  releaseEscrowHold,
} from "@/lib/finance";
import { recordTradeEvent } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.FINANCE_READ);
    const membership = await requireOrgMembership(user.id);
    const operate = canOperateFinance(user);

    const accounts = await prisma.escrowAccount.findMany({
      where: {
        deletedAt: null,
        ...(operate
          ? {}
          : {
              OR: [
                { buyerOrgId: membership.organisationId },
                { sellerOrgId: membership.organisationId },
              ],
            }),
      },
      include: {
        escrowRequest: true,
        buyerOrg: { select: { id: true, name: true, slug: true } },
        sellerOrg: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok(
      accounts.map((a) => ({
        ...a,
        amount: decimalStr(a.amount),
      })),
    );
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
    const action = String(body.action ?? "open");

    if (action === "open") {
      const escrowRequestId = String(body.escrowRequestId ?? "");
      if (!escrowRequestId) return fail("escrowRequestId is required", 400);

      const request = await prisma.escrowRequest.findFirst({
        where: { id: escrowRequestId, deletedAt: null },
        include: {
          contract: true,
          escrowAccount: true,
        },
      });
      if (!request) return fail("Escrow request not found", 404);
      if (request.escrowAccount) {
        return fail("Escrow account already exists for this request", 400);
      }
      if (request.status !== EscrowRequestStatus.REQUESTED) {
        return fail("Escrow request is not open", 400);
      }

      const isParty =
        request.contract.buyerOrgId === membership.organisationId ||
        request.contract.sellerOrgId === membership.organisationId;
      if (!isParty && !canOperateFinance(user)) {
        return fail("Forbidden", 403);
      }

      const holdWallet = await ensureWallet({
        organisationId: request.contract.buyerOrgId,
        currency: request.currency,
        actorId: user.id,
      });

      const account = await prisma.escrowAccount.create({
        data: {
          reference: escrowReference(),
          escrowRequestId: request.id,
          contractId: request.contractId,
          buyerOrgId: request.contract.buyerOrgId,
          sellerOrgId: request.contract.sellerOrgId,
          holdWalletId: holdWallet.id,
          amount: request.amount,
          currency: request.currency,
          status: EscrowAccountStatus.OPEN,
          notes: body.notes ? String(body.notes) : request.notes,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      return ok(
        { ...account, amount: decimalStr(account.amount) },
        { status: 201 },
      );
    }

    if (action === "fund" || action === "release") {
      const id = String(body.id ?? "");
      if (!id) return fail("id is required", 400);

      const account = await prisma.escrowAccount.findFirst({
        where: { id, deletedAt: null },
        include: { escrowRequest: true },
      });
      if (!account) return fail("Escrow account not found", 404);

      const isBuyer = account.buyerOrgId === membership.organisationId;
      const isSeller = account.sellerOrgId === membership.organisationId;
      const operate = canOperateFinance(user);

      if (action === "fund") {
        if (!isBuyer && !operate) return fail("Forbidden", 403);
        if (account.status !== EscrowAccountStatus.OPEN) {
          return fail("Escrow is not open for funding", 400);
        }

        await holdForEscrow({
          walletId: account.holdWalletId,
          amount: Number(account.amount),
          actorId: user.id,
          escrowAccountId: account.id,
          reference: account.reference,
        });

        const updated = await prisma.escrowAccount.update({
          where: { id: account.id },
          data: {
            status: EscrowAccountStatus.FUNDED,
            fundedAt: new Date(),
            updatedBy: user.id,
          },
        });

        await prisma.escrowRequest.update({
          where: { id: account.escrowRequestId },
          data: {
            status: EscrowRequestStatus.FUNDED,
            updatedBy: user.id,
          },
        });

        await recordTradeEvent({
          type: "ESCROW_FUNDED",
          message: `Escrow funded ${decimalStr(account.amount)} ${account.currency}`,
          actorId: user.id,
          contractId: account.contractId,
        });

        await prisma.activity.create({
          data: {
            type: ActivityType.ESCROW_FUNDED,
            title: "Escrow funded",
            description: account.reference,
            actorId: user.id,
            organisationId: account.buyerOrgId,
            entityType: "EscrowAccount",
            entityId: account.id,
          },
        });

        return ok({ ...updated, amount: decimalStr(updated.amount) });
      }

      // release
      if (!isSeller && !operate) return fail("Forbidden", 403);
      if (account.status !== EscrowAccountStatus.FUNDED) {
        return fail("Escrow must be funded before release", 400);
      }

      const sellerWallet = await ensureWallet({
        organisationId: account.sellerOrgId,
        currency: account.currency,
        actorId: user.id,
      });

      await releaseEscrowHold({
        holdWalletId: account.holdWalletId,
        sellerWalletId: sellerWallet.id,
        amount: Number(account.amount),
        actorId: user.id,
        escrowAccountId: account.id,
        reference: account.reference,
      });

      const updated = await prisma.escrowAccount.update({
        where: { id: account.id },
        data: {
          status: EscrowAccountStatus.RELEASED,
          releasedAt: new Date(),
          updatedBy: user.id,
        },
      });

      await prisma.escrowRequest.update({
        where: { id: account.escrowRequestId },
        data: {
          status: EscrowRequestStatus.RELEASED,
          updatedBy: user.id,
        },
      });

      await recordTradeEvent({
        type: "ESCROW_RELEASED",
        message: `Escrow released ${decimalStr(account.amount)} ${account.currency}`,
        actorId: user.id,
        contractId: account.contractId,
      });

      await prisma.activity.create({
        data: {
          type: ActivityType.ESCROW_RELEASED,
          title: "Escrow released",
          description: account.reference,
          actorId: user.id,
          organisationId: account.sellerOrgId,
          entityType: "EscrowAccount",
          entityId: account.id,
        },
      });

      return ok({ ...updated, amount: decimalStr(updated.amount) });
    }

    return fail("action must be open, fund, or release", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
