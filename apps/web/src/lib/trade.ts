import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function tradeReference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function recordTradeEvent(input: {
  type:
    | "RFQ_CREATED"
    | "RFQ_PUBLISHED"
    | "RFQ_CLOSED"
    | "OFFER_SUBMITTED"
    | "OFFER_ACCEPTED"
    | "OFFER_REJECTED"
    | "CONTRACT_CREATED"
    | "CONTRACT_SIGNED"
    | "MILESTONE_UPDATED"
    | "ESCROW_REQUESTED"
    | "ESCROW_FUNDED"
    | "ESCROW_RELEASED"
    | "SHIPMENT_REQUESTED"
    | "SHIPMENT_BOOKED"
    | "SHIPMENT_IN_TRANSIT"
    | "SHIPMENT_DELIVERED"
    | "TRADE_CREATED"
    | "TRADE_ADVANCED"
    | "TRADE_COMPLETED"
    | "TRADE_CANCELLED"
    | "TRADE_DISPUTED"
    | "EVIDENCE_ATTACHED"
    | "NOTE";
  message?: string;
  actorId?: string;
  tradeId?: string;
  rfqId?: string;
  contractId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.tradeEvent.create({
    data: {
      type: input.type,
      message: input.message,
      actorId: input.actorId,
      tradeId: input.tradeId,
      rfqId: input.rfqId,
      contractId: input.contractId,
      metadata: input.metadata,
      createdBy: input.actorId,
    },
  });
}

export function decimalNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
