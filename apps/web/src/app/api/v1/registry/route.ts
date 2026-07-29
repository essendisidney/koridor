import { NextRequest } from "next/server";
import { OrganisationType } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import { requireAuth, requirePermission } from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.REGISTRY_READ);

    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const country = req.nextUrl.searchParams.get("country") ?? undefined;
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const profiles = await prisma.registryProfile.findMany({
      where: {
        deletedAt: null,
        isListed: true,
        ...(type ? { organisationType: type as OrganisationType } : {}),
        organisation: {
          deletedAt: null,
          ...(country
            ? { countryCode: country.toUpperCase() }
            : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { slug: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            countryCode: true,
            city: true,
            verificationStatus: true,
            description: true,
            trustProfile: {
              select: { trustScore: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return ok(
      profiles.map((p) => ({
        id: p.id,
        organisationType: p.organisationType,
        summary: p.summary,
        commodities: p.commodities,
        exportMarkets: p.exportMarkets,
        yearsInOperation: p.yearsInOperation,
        attributes: p.attributes,
        organisation: {
          ...p.organisation,
          trustScore: p.organisation.trustProfile?.trustScore ?? 0,
        },
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
