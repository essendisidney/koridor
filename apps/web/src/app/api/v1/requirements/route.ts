import { NextRequest } from "next/server";
import {
  RequirementFrequency,
  RequirementStatus,
  VerificationStatus,
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
import { requirementReference } from "@/lib/matching";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") ?? "mine";
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    if (scope === "public") {
      const rows = await prisma.buyerRequirement.findMany({
        where: {
          deletedAt: null,
          status: {
            in: [
              RequirementStatus.PUBLISHED,
              RequirementStatus.MATCHING,
              RequirementStatus.RFQ_OPEN,
              RequirementStatus.PARTIALLY_FILLED,
            ],
          },
        },
        include: {
          buyerOrg: {
            select: {
              name: true,
              countryCode: true,
              verificationStatus: true,
              slug: true,
            },
          },
          _count: { select: { matches: true, rfqs: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 40,
      });
      return ok(rows);
    }

    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);

    const rows = await prisma.buyerRequirement.findMany({
      where: {
        deletedAt: null,
        buyerOrgId: membership.organisationId,
        ...(status ? { status: status as RequirementStatus } : {}),
      },
      include: {
        _count: { select: { matches: true, rfqs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();

    const commodity = String(body.commodity ?? "").trim();
    const quantity = decimalNumber(body.quantity);
    const destinationCountry = String(body.destinationCountry ?? "")
      .toUpperCase()
      .slice(0, 2);
    if (!commodity || quantity <= 0 || destinationCountry.length !== 2) {
      return fail("commodity, quantity and destinationCountry are required", 400);
    }

    const count = await prisma.buyerRequirement.count();
    const publish = Boolean(body.publish);
    const verifiedDemand =
      membership.organisation.verificationStatus === VerificationStatus.VERIFIED &&
      publish;

    const frequency = (String(body.frequency ?? "ONE_OFF").toUpperCase() ||
      "ONE_OFF") as RequirementFrequency;

    const row = await prisma.buyerRequirement.create({
      data: {
        reference: requirementReference(count + 1),
        buyerOrgId: membership.organisationId,
        createdById: user.id,
        commodity,
        variety: body.variety ? String(body.variety) : null,
        quantity,
        unit: String(body.unit ?? "MT"),
        frequency,
        deliveryStart: body.deliveryStart ? new Date(body.deliveryStart) : null,
        deliveryEnd: body.deliveryEnd ? new Date(body.deliveryEnd) : null,
        destinationCountry,
        destinationCity: body.destinationCity
          ? String(body.destinationCity)
          : null,
        destinationPort: body.destinationPort
          ? String(body.destinationPort)
          : null,
        originPreference: body.originPreference
          ? String(body.originPreference).toUpperCase().slice(0, 2)
          : "KE",
        grade: body.grade ? String(body.grade) : null,
        sizeSpec: body.sizeSpec ? String(body.sizeSpec) : null,
        certifications: Array.isArray(body.certifications)
          ? body.certifications.map(String)
          : [],
        packaging: body.packaging ? String(body.packaging) : null,
        incoterm: body.incoterm ? String(body.incoterm) : null,
        paymentTerms: body.paymentTerms ? String(body.paymentTerms) : null,
        currency: String(body.currency ?? "USD").slice(0, 3),
        notes: body.notes ? String(body.notes) : null,
        status: publish ? RequirementStatus.PUBLISHED : RequirementStatus.DRAFT,
        verifiedDemand,
        publishedAt: publish ? new Date() : null,
        createdBy: user.id,
      },
    });

    return ok(row, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
