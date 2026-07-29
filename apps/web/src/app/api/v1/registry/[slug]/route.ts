import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuth, requirePermission } from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.REGISTRY_READ);
    const { slug } = await ctx.params;

    const org = await prisma.organisation.findFirst({
      where: { slug, deletedAt: null },
      include: {
        trustProfile: true,
        registryProfile: true,
        contacts: {
          where: { deletedAt: null, isPrimary: true },
          take: 1,
        },
      },
    });
    if (!org || !org.registryProfile || !org.registryProfile.isListed) {
      return fail("Registry profile not found", 404);
    }

    return ok({
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        countryCode: org.countryCode,
        city: org.city,
        description: org.description,
        website: org.website,
        verificationStatus: org.verificationStatus,
        trustScore: org.trustProfile?.trustScore ?? 0,
        scoreBreakdown: org.trustProfile?.scoreBreakdown ?? {},
      },
      registry: org.registryProfile,
      primaryContact: org.contacts[0] ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
