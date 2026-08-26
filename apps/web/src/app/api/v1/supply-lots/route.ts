import { NextRequest } from "next/server";
import { SupplyLotStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { supplyLotReference } from "@/lib/matching";
import { decimalNumber } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") ?? "mine";
    if (scope === "public") {
      const rows = await prisma.supplyLot.findMany({
        where: {
          deletedAt: null,
          status: {
            in: [
              SupplyLotStatus.VERIFIED,
              SupplyLotStatus.EXPORT_ELIGIBLE,
              SupplyLotStatus.DECLARED,
            ],
          },
        },
        include: {
          supplierOrg: {
            select: {
              name: true,
              slug: true,
              countryCode: true,
              city: true,
              verificationStatus: true,
              trustProfile: { select: { trustScore: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
      });
      return ok(rows);
    }

    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const rows = await prisma.supplyLot.findMany({
      where: { deletedAt: null, supplierOrgId: membership.organisationId },
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
    if (!commodity || quantity <= 0) {
      return fail("commodity and quantity required", 400);
    }
    const count = await prisma.supplyLot.count();
    const origin = String(body.originCountry ?? membership.organisation.countryCode ?? "KE")
      .toUpperCase()
      .slice(0, 2);
    const available = body.availableQuantity
      ? decimalNumber(body.availableQuantity)
      : quantity;

    const row = await prisma.supplyLot.create({
      data: {
        reference: supplyLotReference(origin, commodity, count + 1),
        supplierOrgId: membership.organisationId,
        createdById: user.id,
        commodity,
        variety: body.variety ? String(body.variety) : null,
        originCountry: origin,
        originRegion: body.originRegion ? String(body.originRegion) : null,
        quantity,
        availableQuantity: available,
        unit: String(body.unit ?? "MT"),
        harvestStart: body.harvestStart ? new Date(body.harvestStart) : null,
        harvestEnd: body.harvestEnd ? new Date(body.harvestEnd) : null,
        grade: body.grade ? String(body.grade) : null,
        certifications: Array.isArray(body.certifications)
          ? body.certifications.map(String)
          : [],
        packaging: body.packaging ? String(body.packaging) : null,
        status: SupplyLotStatus.DECLARED,
        notes: body.notes ? String(body.notes) : null,
        createdBy: user.id,
      },
    });
    return ok(row, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
