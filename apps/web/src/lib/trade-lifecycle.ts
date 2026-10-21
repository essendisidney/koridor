import { DealStatus, TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  recomputeTradeScores,
  STATUS_STAGE,
  syncMilestonesFromWorld,
} from "@/lib/trade-passport";

/**
 * Keeps deal, contract and trade statuses in step with what actually
 * happened, so dashboards, analytics and reviews see the real stage.
 * Never moves a record backwards.
 */
type Event = "signed" | "delivered" | "paid";

const ORDER: TradeStatus[] = [
  TradeStatus.DRAFT,
  TradeStatus.PENDING_VERIFICATION,
  TradeStatus.NEGOTIATION,
  TradeStatus.CONTRACTED,
  TradeStatus.IN_PRODUCTION,
  TradeStatus.AWAITING_INSPECTION,
  TradeStatus.AWAITING_COMPLIANCE,
  TradeStatus.READY_TO_SHIP,
  TradeStatus.IN_TRANSIT,
  TradeStatus.AT_BORDER,
  TradeStatus.DELIVERED,
  TradeStatus.AWAITING_SETTLEMENT,
  TradeStatus.COMPLETED,
];

const DEAL_FOR: Record<Event, DealStatus> = {
  signed: DealStatus.ACTIVE,
  delivered: DealStatus.IN_FULFILMENT,
  paid: DealStatus.COMPLETED,
};

const TRADE_FOR: Record<Event, TradeStatus> = {
  signed: TradeStatus.CONTRACTED,
  delivered: TradeStatus.AWAITING_SETTLEMENT,
  paid: TradeStatus.COMPLETED,
};

export async function advanceTradeLifecycle(contractId: string, event: Event, actorId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, tradeId: true, status: true },
  });
  if (!contract) return;

  // Payment released after delivery: the contract is fulfilled.
  if (event === "paid") {
    const delivered = await prisma.shipment.findFirst({
      where: { contractId, status: "DELIVERED", deletedAt: null },
      select: { id: true },
    });
    if (delivered && contract.status !== "COMPLETED") {
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: "COMPLETED", completedAt: new Date(), updatedBy: actorId },
      });
    }
  }

  const dealStatus = DEAL_FOR[event];
  await prisma.deal.updateMany({
    where: {
      contractId,
      deletedAt: null,
      status: { notIn: [DealStatus.CANCELLED, DealStatus.DISPUTED, DealStatus.COMPLETED] },
    },
    data: { status: dealStatus, updatedBy: actorId },
  });

  if (!contract.tradeId) return;
  const trade = await prisma.trade.findUnique({
    where: { id: contract.tradeId },
    select: { status: true },
  });
  if (!trade) return;
  const next = TRADE_FOR[event];
  const cur = ORDER.indexOf(trade.status);
  if (cur === -1 || ORDER.indexOf(next) <= cur) return; // cancelled/disputed or already past

  await prisma.trade.update({
    where: { id: contract.tradeId },
    data: {
      status: next,
      currentStage: STATUS_STAGE[next],
      ...(next === TradeStatus.COMPLETED ? { completedAt: new Date(), completionPct: 100 } : {}),
      updatedBy: actorId,
    },
  });
  await syncMilestonesFromWorld(contract.tradeId, actorId);
  await recomputeTradeScores(contract.tradeId, actorId);
}
