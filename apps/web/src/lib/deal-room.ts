export type TimelineStepStatus = "complete" | "current" | "pending";

export type DealTimelineStep = {
  id: string;
  label: string;
  status: TimelineStepStatus;
  detail?: string;
  href?: string;
};

export type DealRoomInput = {
  status: string;
  requirementId?: string | null;
  requirement?: {
    id: string;
    reference: string;
    status: string;
  } | null;
  matchedQuantity?: number | null;
  quantity: number;
  rfq?: { id: string; reference: string; status: string } | null;
  offer?: { id: string; status: string; unitPrice?: number | string | null } | null;
  contract?: { id: string; reference: string; status: string } | null;
  trade?: {
    id: string;
    tradeNumber: string;
    status: string;
    currentStage: string;
    completionPct?: number;
  } | null;
  hasMessages?: boolean;
  hasDocuments?: boolean;
  hasShipment?: boolean;
  hasPayment?: boolean;
};

function step(
  id: string,
  label: string,
  status: TimelineStepStatus,
  detail?: string,
  href?: string,
): DealTimelineStep {
  return { id, label, status, detail, href };
}

/** Chronological deal fulfilment timeline for the Deal Room. */
export function buildDealTimeline(input: DealRoomInput): DealTimelineStep[] {
  const reqDone = Boolean(input.requirementId || input.requirement);
  const matched =
    (input.matchedQuantity ?? 0) > 0 ||
    ["MATCHING", "RFQ_OPEN", "PARTIALLY_FILLED", "FILLED"].includes(
      input.requirement?.status ?? "",
    );
  const rfqDone = Boolean(input.rfq);
  const offerDone = Boolean(input.offer);
  const contractDone = Boolean(input.contract);
  const tradeActive = Boolean(input.trade);
  const tradeComplete = ["COMPLETED", "SETTLED"].includes(input.trade?.status ?? "");
  const inFulfilment = ["IN_FULFILMENT", "ACTIVE"].includes(input.status) || tradeActive;
  const shipmentDone = Boolean(input.hasShipment);
  const settled =
    tradeComplete ||
    ["COMPLETED"].includes(input.status);

  const steps: DealTimelineStep[] = [];

  steps.push(
    step(
      "requirement",
      "Requirement",
      reqDone ? "complete" : "pending",
      input.requirement?.reference,
      input.requirement
        ? `/dashboard/requirements/${input.requirement.id}`
        : undefined,
    ),
  );

  steps.push(
    step(
      "matched",
      "Matched",
      matched ? "complete" : reqDone ? "current" : "pending",
      matched && input.matchedQuantity != null
        ? `${input.matchedQuantity} / ${input.quantity}`
        : undefined,
    ),
  );

  steps.push(
    step(
      "rfq",
      "RFQ",
      rfqDone ? "complete" : matched ? "current" : "pending",
      input.rfq?.reference,
      input.rfq ? `/dashboard/rfqs/${input.rfq.id}` : undefined,
    ),
  );

  steps.push(
    step(
      "offer",
      "Offer accepted",
      offerDone ? "complete" : rfqDone ? "current" : "pending",
      input.offer?.unitPrice != null
        ? `Unit ${input.offer.unitPrice}`
        : undefined,
    ),
  );

  steps.push(
    step(
      "contract",
      "Contract",
      contractDone ? "complete" : offerDone ? "current" : "pending",
      input.contract
        ? `${input.contract.reference} · ${input.contract.status}`
        : undefined,
      input.contract
        ? `/dashboard/contracts/${input.contract.id}`
        : "/dashboard/contracts",
    ),
  );

  const productionPct = input.trade?.completionPct;
  steps.push(
    step(
      "production",
      "Production",
      productionPct != null && productionPct >= 80
        ? "complete"
        : inFulfilment
          ? "current"
          : "pending",
      productionPct != null ? `${productionPct}%` : undefined,
    ),
  );

  steps.push(
    step(
      "inspection",
      "Inspection",
      ["INSPECTED", "READY_FOR_SHIPMENT"].includes(input.trade?.currentStage ?? "")
        ? "complete"
        : inFulfilment && (productionPct ?? 0) >= 50
          ? "current"
          : "pending",
    ),
  );

  steps.push(
    step(
      "shipment",
      "Shipment",
      shipmentDone ||
        ["IN_TRANSIT", "DELIVERED", "ARRIVED"].includes(
          input.trade?.currentStage?.toUpperCase() ?? "",
        )
        ? "complete"
        : contractDone
          ? "current"
          : "pending",
      undefined,
      "/dashboard/logistics",
    ),
  );

  steps.push(
    step(
      "settlement",
      "Settlement",
      settled
        ? "complete"
        : shipmentDone || tradeActive
          ? "current"
          : "pending",
      input.hasPayment ? "Payment recorded" : undefined,
      "/dashboard/finance",
    ),
  );

  // Ensure only one "current"
  let seenCurrent = false;
  return steps.map((s) => {
    if (s.status === "current") {
      if (seenCurrent) return { ...s, status: "pending" as const };
      seenCurrent = true;
    }
    return s;
  });
}

export const DEAL_ROOM_TABS = [
  { id: "overview", label: "Overview" },
  { id: "parties", label: "Parties" },
  { id: "commercial", label: "Commercial" },
  { id: "messages", label: "Messages" },
  { id: "contract", label: "Contract" },
  { id: "documents", label: "Documents" },
  { id: "logistics", label: "Logistics" },
  { id: "finance", label: "Finance" },
  { id: "passport", label: "Trade Passport" },
] as const;

export type DealRoomTabId = (typeof DEAL_ROOM_TABS)[number]["id"];

export const NEGOTIABLE_FIELDS = [
  { id: "PRICE", label: "Price" },
  { id: "QUANTITY", label: "Quantity" },
  { id: "DELIVERY", label: "Delivery" },
  { id: "INCOTERM", label: "Incoterm" },
  { id: "PAYMENT", label: "Payment terms" },
] as const;
