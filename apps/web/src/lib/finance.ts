import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tradeReference } from "@/lib/trade";

export function escrowReference() {
  return tradeReference("ESC");
}

export async function ensureWallet(input: {
  organisationId: string;
  currency?: string;
  actorId?: string;
}) {
  const currency = (input.currency ?? "USD").toUpperCase().slice(0, 3);
  const existing = await prisma.wallet.findFirst({
    where: {
      organisationId: input.organisationId,
      currency,
      deletedAt: null,
    },
  });
  if (existing) return existing;

  return prisma.wallet.create({
    data: {
      organisationId: input.organisationId,
      currency,
      availableBalance: 0,
      heldBalance: 0,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    },
  });
}

export async function creditWallet(input: {
  walletId: string;
  amount: number;
  kind: "TOP_UP" | "ESCROW_RELEASE" | "ESCROW_REFUND" | "ADJUSTMENT";
  description?: string;
  reference?: string;
  actorId?: string;
  escrowAccountId?: string;
}) {
  if (input.amount <= 0) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findFirst({
      where: { id: input.walletId, deletedAt: null },
    });
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.status !== "ACTIVE") throw new Error("Wallet is not active");

    const next = Number(wallet.availableBalance) + input.amount;
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: next,
        updatedBy: input.actorId,
      },
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        kind: input.kind,
        amount: input.amount,
        balanceAfter: next,
        currency: wallet.currency,
        reference: input.reference,
        description: input.description,
        escrowAccountId: input.escrowAccountId,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });

    return { wallet: updated, entry };
  });
}

export async function holdForEscrow(input: {
  walletId: string;
  amount: number;
  actorId?: string;
  escrowAccountId?: string;
  reference?: string;
}) {
  if (input.amount <= 0) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findFirst({
      where: { id: input.walletId, deletedAt: null },
    });
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.status !== "ACTIVE") throw new Error("Wallet is not active");
    if (Number(wallet.availableBalance) < input.amount) {
      throw new Error("Insufficient available balance");
    }

    const available = Number(wallet.availableBalance) - input.amount;
    const held = Number(wallet.heldBalance) + input.amount;
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: available,
        heldBalance: held,
        updatedBy: input.actorId,
      },
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        kind: "ESCROW_HOLD",
        amount: input.amount,
        balanceAfter: available,
        currency: wallet.currency,
        reference: input.reference,
        description: "Funds held in escrow",
        escrowAccountId: input.escrowAccountId,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });

    return { wallet: updated, entry };
  });
}

export async function releaseEscrowHold(input: {
  holdWalletId: string;
  sellerWalletId: string;
  amount: number;
  actorId?: string;
  escrowAccountId?: string;
  reference?: string;
}) {
  if (input.amount <= 0) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const holdWallet = await tx.wallet.findFirst({
      where: { id: input.holdWalletId, deletedAt: null },
    });
    const sellerWallet = await tx.wallet.findFirst({
      where: { id: input.sellerWalletId, deletedAt: null },
    });
    if (!holdWallet || !sellerWallet) throw new Error("Wallet not found");
    if (Number(holdWallet.heldBalance) < input.amount) {
      throw new Error("Insufficient held balance");
    }

    const held = Number(holdWallet.heldBalance) - input.amount;
    await tx.wallet.update({
      where: { id: holdWallet.id },
      data: { heldBalance: held, updatedBy: input.actorId },
    });

    await tx.ledgerEntry.create({
      data: {
        walletId: holdWallet.id,
        type: "DEBIT",
        kind: "ESCROW_RELEASE",
        amount: input.amount,
        balanceAfter: Number(holdWallet.availableBalance),
        currency: holdWallet.currency,
        reference: input.reference,
        description: "Escrow released to seller",
        escrowAccountId: input.escrowAccountId,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });

    const sellerNext = Number(sellerWallet.availableBalance) + input.amount;
    const sellerUpdated = await tx.wallet.update({
      where: { id: sellerWallet.id },
      data: {
        availableBalance: sellerNext,
        updatedBy: input.actorId,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        walletId: sellerWallet.id,
        type: "CREDIT",
        kind: "ESCROW_RELEASE",
        amount: input.amount,
        balanceAfter: sellerNext,
        currency: sellerWallet.currency,
        reference: input.reference,
        description: "Escrow release received",
        escrowAccountId: input.escrowAccountId,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });

    return { sellerWallet: sellerUpdated };
  });
}

export function decimalStr(value: Prisma.Decimal | number | string) {
  return Number(value).toFixed(2);
}
