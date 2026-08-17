import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tradeReference } from "@/lib/trade";
import { recomputeBankability, decimalStr } from "@/lib/bankability";

export function tradeCreditReference() {
  return tradeReference("TCF");
}

export async function syncTradeCreditFacility(input: {
  organisationId: string;
  actorId?: string;
}) {
  const { result } = await recomputeBankability(
    input.organisationId,
    input.actorId,
  );

  const existing = await prisma.tradeCreditFacility.findFirst({
    where: { organisationId: input.organisationId, deletedAt: null },
  });

  const suggested = result.suggestedCreditLimit;
  if (existing) {
    const drawn = Number(existing.drawnAmount);
    const nextLimit = Math.max(suggested, drawn);
    return prisma.tradeCreditFacility.update({
      where: { id: existing.id },
      data: {
        limitAmount: nextLimit,
        bankabilityScore: result.score,
        currency: result.currency,
        status: nextLimit <= 0 && drawn <= 0 ? "SUSPENDED" : "ACTIVE",
        updatedBy: input.actorId,
      },
      include: {
        draws: {
          where: { deletedAt: null },
          include: {
            supplierOrg: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
  }

  return prisma.tradeCreditFacility.create({
    data: {
      organisationId: input.organisationId,
      currency: result.currency,
      limitAmount: suggested,
      drawnAmount: 0,
      bankabilityScore: result.score,
      status: suggested > 0 ? "ACTIVE" : "SUSPENDED",
      createdBy: input.actorId,
      updatedBy: input.actorId,
    },
    include: {
      draws: {
        where: { deletedAt: null },
        include: {
          supplierOrg: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export function facilityAvailable(facility: {
  limitAmount: Prisma.Decimal | number;
  drawnAmount: Prisma.Decimal | number;
}) {
  return Math.max(0, Number(facility.limitAmount) - Number(facility.drawnAmount));
}

export async function issueTradeCreditDraw(input: {
  organisationId: string;
  supplierOrgId: string;
  amount: number;
  tradeId?: string;
  description?: string;
  actorId?: string;
}) {
  if (input.amount <= 0) throw new Error("Amount must be positive");
  if (input.supplierOrgId === input.organisationId) {
    throw new Error("Supplier must be a different organisation");
  }

  const supplier = await prisma.organisation.findFirst({
    where: { id: input.supplierOrgId, deletedAt: null },
  });
  if (!supplier) throw new Error("Supplier organisation not found");

  if (input.tradeId) {
    const trade = await prisma.trade.findFirst({
      where: {
        id: input.tradeId,
        deletedAt: null,
        OR: [
          { buyerOrgId: input.organisationId },
          { sellerOrgId: input.organisationId },
        ],
      },
    });
    if (!trade) throw new Error("Trade not found for this organisation");
  }

  const facility = await syncTradeCreditFacility({
    organisationId: input.organisationId,
    actorId: input.actorId,
  });

  if (facility.status !== "ACTIVE") {
    throw new Error("Trade credit facility is not active");
  }

  const available = facilityAvailable(facility);
  if (input.amount > available) {
    throw new Error(
      `Insufficient credit available (${available.toFixed(2)} ${facility.currency})`,
    );
  }

  const reference = tradeCreditReference();

  const draw = await prisma.$transaction(async (tx) => {
    await tx.tradeCreditFacility.update({
      where: { id: facility.id },
      data: {
        drawnAmount: Number(facility.drawnAmount) + input.amount,
        updatedBy: input.actorId,
      },
    });

    return tx.tradeCreditDraw.create({
      data: {
        facilityId: facility.id,
        supplierOrgId: input.supplierOrgId,
        tradeId: input.tradeId,
        reference,
        amount: input.amount,
        currency: facility.currency,
        status: "OPEN",
        description:
          input.description ||
          "In-kind supplier credit (inputs / goods — not cash)",
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      include: {
        supplierOrg: { select: { id: true, name: true, slug: true } },
      },
    });
  });

  await prisma.activity.create({
    data: {
      type: ActivityType.TRADE_CREDIT_DRAWN,
      title: "In-kind trade credit issued",
      description: `${reference}: ${input.amount} ${facility.currency} to ${supplier.name}`,
      actorId: input.actorId,
      organisationId: input.organisationId,
      entityType: "TradeCreditDraw",
      entityId: draw.id,
      metadata: {
        reference,
        amount: input.amount,
        supplierOrgId: input.supplierOrgId,
        tradeId: input.tradeId ?? null,
      },
    },
  });

  return draw;
}

export async function settleTradeCreditDraw(input: {
  organisationId: string;
  drawId: string;
  actorId?: string;
  /** When true, require buyer wallet balance and debit it (post-harvest repay). */
  collectFromWallet?: boolean;
}) {
  const facility = await prisma.tradeCreditFacility.findFirst({
    where: { organisationId: input.organisationId, deletedAt: null },
  });
  if (!facility) throw new Error("Trade credit facility not found");

  const draw = await prisma.tradeCreditDraw.findFirst({
    where: {
      id: input.drawId,
      facilityId: facility.id,
      deletedAt: null,
    },
    include: {
      supplierOrg: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!draw) throw new Error("Draw not found");
  if (draw.status !== "OPEN") throw new Error("Draw is not open");

  const amount = Number(draw.amount);
  const collect = input.collectFromWallet !== false;

  await prisma.$transaction(async (tx) => {
    if (collect) {
      let buyerWallet = await tx.wallet.findFirst({
        where: {
          organisationId: input.organisationId,
          currency: draw.currency,
          deletedAt: null,
        },
      });
      if (!buyerWallet) {
        buyerWallet = await tx.wallet.create({
          data: {
            organisationId: input.organisationId,
            currency: draw.currency,
            availableBalance: 0,
            heldBalance: 0,
            createdBy: input.actorId,
            updatedBy: input.actorId,
          },
        });
      }
      if (Number(buyerWallet.availableBalance) < amount) {
        throw new Error(
          "Insufficient wallet balance to settle credit — top up first, or pass collectFromWallet:false",
        );
      }
      const next = Number(buyerWallet.availableBalance) - amount;
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { availableBalance: next, updatedBy: input.actorId },
      });
      await tx.ledgerEntry.create({
        data: {
          walletId: buyerWallet.id,
          type: "DEBIT",
          kind: "CREDIT_SETTLE",
          amount,
          balanceAfter: next,
          currency: draw.currency,
          reference: draw.reference,
          description: "Trade credit settlement (post-delivery repay)",
          createdBy: input.actorId,
          updatedBy: input.actorId,
        },
      });
    }

    await tx.tradeCreditDraw.update({
      where: { id: draw.id },
      data: {
        status: "SETTLED",
        settledAt: new Date(),
        updatedBy: input.actorId,
      },
    });

    const drawn = Math.max(0, Number(facility.drawnAmount) - amount);
    await tx.tradeCreditFacility.update({
      where: { id: facility.id },
      data: { drawnAmount: drawn, updatedBy: input.actorId },
    });
  });

  await prisma.activity.create({
    data: {
      type: ActivityType.TRADE_CREDIT_SETTLED,
      title: "Trade credit settled",
      description: `${draw.reference}: ${amount} ${draw.currency} settled`,
      actorId: input.actorId,
      organisationId: input.organisationId,
      entityType: "TradeCreditDraw",
      entityId: draw.id,
      metadata: { reference: draw.reference, amount, collect },
    },
  });

  return prisma.tradeCreditDraw.findFirstOrThrow({
    where: { id: draw.id },
    include: {
      supplierOrg: { select: { id: true, name: true, slug: true } },
    },
  });
}

export function serializeFacility(
  facility: Awaited<ReturnType<typeof syncTradeCreditFacility>>,
) {
  const available = facilityAvailable(facility);
  return {
    id: facility.id,
    currency: facility.currency,
    status: facility.status,
    bankabilityScore: facility.bankabilityScore,
    limitAmount: decimalStr(facility.limitAmount),
    drawnAmount: decimalStr(facility.drawnAmount),
    availableAmount: available.toFixed(2),
    draws: facility.draws.map((d) => ({
      id: d.id,
      reference: d.reference,
      amount: decimalStr(d.amount),
      currency: d.currency,
      status: d.status,
      description: d.description,
      tradeId: d.tradeId,
      settledAt: d.settledAt,
      createdAt: d.createdAt,
      supplierOrg: d.supplierOrg,
    })),
  };
}
