import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tradeReference } from "@/lib/trade";

export function complianceReference(type: string) {
  const prefix =
    {
      CERTIFICATE_OF_ORIGIN: "COO",
      EXPORT_PERMIT: "EXP",
      IMPORT_DOCUMENT: "IMP",
      PACKING_LIST: "PKG",
      COMMERCIAL_INVOICE: "CINV",
      INSPECTION_CERTIFICATE: "INS",
      HALAL_CERTIFICATE: "HAL",
      OTHER: "CMP",
    }[type] ?? "CMP";
  return tradeReference(prefix);
}

export function buildCertificatePayload(input: {
  type: string;
  organisationName: string;
  title: string;
  commodity?: string | null;
  quantity?: number | null;
  unit?: string | null;
  issuingCountry?: string | null;
  destinationCountry?: string | null;
  contractReference?: string | null;
  notes?: string | null;
  extra?: Record<string, unknown>;
}): Prisma.InputJsonValue {
  return {
    documentTitle: input.title,
    organisationName: input.organisationName,
    type: input.type,
    commodity: input.commodity ?? null,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    issuingCountry: input.issuingCountry ?? null,
    destinationCountry: input.destinationCountry ?? null,
    contractReference: input.contractReference ?? null,
    notes: input.notes ?? null,
    generatedAt: new Date().toISOString(),
    clauses: defaultClauses(input.type),
    ...(input.extra ?? {}),
  };
}

function defaultClauses(type: string): string[] {
  switch (type) {
    case "CERTIFICATE_OF_ORIGIN":
      return [
        "The goods described herein originate from the stated country of origin.",
        "This certificate is issued for customs and trade compliance purposes.",
      ];
    case "EXPORT_PERMIT":
      return [
        "Export of the described goods is authorised subject to applicable regulations.",
        "Permit is valid until the stated expiry date unless revoked earlier.",
      ];
    case "HALAL_CERTIFICATE":
      return [
        "The product has been prepared in accordance with declared Halal standards.",
        "Certificate validity is subject to ongoing compliance checks.",
      ];
    case "PACKING_LIST":
      return [
        "This packing list accurately describes packages prepared for shipment.",
      ];
    case "COMMERCIAL_INVOICE":
      return [
        "This commercial invoice reflects the agreed commercial terms of sale.",
      ];
    default:
      return ["Issued under Koridor compliance workflow."];
  }
}

export async function recordComplianceEvent(input: {
  certificateId: string;
  type: string;
  message?: string;
  actorId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.complianceEvent.create({
    data: {
      certificateId: input.certificateId,
      type: input.type,
      message: input.message,
      actorId: input.actorId,
      metadata: input.metadata,
      createdBy: input.actorId,
    },
  });
}

export function expiryBucket(expiresAt: Date | null | undefined) {
  if (!expiresAt) return "none";
  const days =
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}
