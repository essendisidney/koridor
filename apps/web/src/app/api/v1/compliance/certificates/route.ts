import { NextRequest } from "next/server";
import {
  ActivityType,
  CertificateStatus,
  CertificateType,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { decimalNumber } from "@/lib/trade";
import {
  buildCertificatePayload,
  complianceReference,
  expiryBucket,
  recordComplianceEvent,
} from "@/lib/compliance";

export const runtime = "nodejs";

const TYPES = new Set(Object.values(CertificateType));

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.COMPLIANCE_READ);
    const membership = await requireOrgMembership(user.id);
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const expiry = req.nextUrl.searchParams.get("expiry") ?? undefined;

    // Mark expired approved certs lazily
    await prisma.complianceCertificate.updateMany({
      where: {
        organisationId: membership.organisationId,
        deletedAt: null,
        status: CertificateStatus.APPROVED,
        expiresAt: { lt: new Date() },
      },
      data: { status: CertificateStatus.EXPIRED },
    });

    const certs = await prisma.complianceCertificate.findMany({
      where: {
        organisationId: membership.organisationId,
        deletedAt: null,
        ...(status ? { status: status as CertificateStatus } : {}),
        ...(type ? { type: type as CertificateType } : {}),
      },
      include: {
        contract: { select: { id: true, reference: true, title: true } },
        approvals: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const filtered =
      expiry && expiry !== "all"
        ? certs.filter((c) => expiryBucket(c.expiresAt) === expiry)
        : certs;

    return ok(
      filtered.map((c) => ({
        ...c,
        expiryStatus: expiryBucket(c.expiresAt),
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
    await requirePermission(user, Permission.COMPLIANCE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();

    const type = String(body.type ?? "");
    const title = String(body.title ?? "").trim();
    if (!TYPES.has(type as CertificateType)) {
      return fail("Invalid certificate type", 400);
    }
    if (!title) return fail("title is required", 400);

    let contractReference: string | null = null;
    let contractId: string | null = null;
    if (body.contractId) {
      const contract = await prisma.contract.findFirst({
        where: {
          id: String(body.contractId),
          deletedAt: null,
          OR: [
            { buyerOrgId: membership.organisationId },
            { sellerOrgId: membership.organisationId },
          ],
        },
      });
      if (!contract) return fail("Contract not found", 404);
      contractId = contract.id;
      contractReference = contract.reference;
    }

    const quantity =
      body.quantity !== undefined && body.quantity !== ""
        ? decimalNumber(body.quantity)
        : null;
    const expiresAt = body.expiresAt
      ? new Date(String(body.expiresAt))
      : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const submit = Boolean(body.submit);

    const cert = await prisma.complianceCertificate.create({
      data: {
        reference: complianceReference(type),
        organisationId: membership.organisationId,
        contractId,
        type: type as CertificateType,
        title,
        status: submit
          ? CertificateStatus.PENDING_APPROVAL
          : CertificateStatus.DRAFT,
        issuingCountry: body.issuingCountry
          ? String(body.issuingCountry).toUpperCase().slice(0, 2)
          : membership.organisation.countryCode,
        destinationCountry: body.destinationCountry
          ? String(body.destinationCountry).toUpperCase().slice(0, 2)
          : null,
        commodity: body.commodity ? String(body.commodity) : null,
        quantity,
        unit: body.unit ? String(body.unit) : null,
        expiresAt,
        submittedAt: submit ? new Date() : null,
        issuedAt: null,
        notes: body.notes ? String(body.notes) : null,
        payload: buildCertificatePayload({
          type,
          organisationName: membership.organisation.name,
          title,
          commodity: body.commodity ? String(body.commodity) : null,
          quantity,
          unit: body.unit ? String(body.unit) : null,
          issuingCountry: body.issuingCountry
            ? String(body.issuingCountry).toUpperCase().slice(0, 2)
            : membership.organisation.countryCode,
          destinationCountry: body.destinationCountry
            ? String(body.destinationCountry).toUpperCase().slice(0, 2)
            : null,
          contractReference,
          notes: body.notes ? String(body.notes) : null,
        }),
        createdById: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        ...(submit
          ? {
              approvals: {
                create: {
                  status: "PENDING",
                  createdBy: user.id,
                },
              },
            }
          : {}),
      },
    });

    await recordComplianceEvent({
      certificateId: cert.id,
      type: submit ? "CERTIFICATE_SUBMITTED" : "CERTIFICATE_CREATED",
      message: submit ? "Submitted for government approval" : "Draft created",
      actorId: user.id,
    });

    await prisma.activity.create({
      data: {
        type: submit
          ? ActivityType.CERTIFICATE_SUBMITTED
          : ActivityType.CERTIFICATE_CREATED,
        title: submit ? "Certificate submitted" : "Certificate created",
        description: cert.title,
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "ComplianceCertificate",
        entityId: cert.id,
      },
    });

    return ok(cert, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
