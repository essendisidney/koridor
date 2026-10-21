/**
 * Human wording for status codes shown to buyers and farms.
 * Unknown codes fall back to sentence case ("IN_TRANSIT" → "In transit").
 */
const LABELS: Record<string, string> = {
  // Deals
  PENDING_CONTRACT: "Contract to sign",
  IN_FULFILMENT: "Being fulfilled",
  DISPUTED: "In dispute",
  // Contracts
  PENDING_SIGNATURES: "Waiting for signatures",
  // Trades
  NEGOTIATION: "Agreeing terms",
  CONTRACTED: "Contract signed",
  IN_PRODUCTION: "Being prepared",
  AWAITING_INSPECTION: "Waiting for inspection",
  AWAITING_COMPLIANCE: "Export documents in progress",
  READY_TO_SHIP: "Ready to ship",
  AT_BORDER: "At the border",
  AWAITING_SETTLEMENT: "Waiting for payment release",
  // Offers / RFQs
  PENDING: "Pending",
  AWARDED: "Offer accepted",
  // Shared
  DRAFT: "Draft",
  ACTIVE: "Active",
  OPEN: "Open",
  CLOSED: "Closed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  VERIFIED: "Verified",
  UNVERIFIED: "Not verified",
  REQUESTED: "Requested",
  BOOKED: "Booked",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  FUNDED: "Funded",
  RELEASED: "Released",
};

export function label(code?: string | null) {
  if (!code) return "";
  if (LABELS[code]) return LABELS[code];
  const words = code.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
