import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.REGISTRY_READ);
    const membership = await requireOrgMembership(user.id);
    const profile = await prisma.registryProfile.findFirst({
      where: { organisationId: membership.organisationId, deletedAt: null },
    });
    return ok(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();

    const data = {
      organisationType: membership.organisation.type,
      summary: body.summary ? String(body.summary).trim() : null,
      commodities: parseStringArray(body.commodities),
      exportMarkets: parseStringArray(body.exportMarkets),
      yearsInOperation:
        body.yearsInOperation !== undefined && body.yearsInOperation !== ""
          ? Number(body.yearsInOperation)
          : null,
      attributes:
        body.attributes && typeof body.attributes === "object"
          ? body.attributes
          : {},
      isListed: body.isListed !== undefined ? Boolean(body.isListed) : true,
      updatedBy: user.id,
      deletedAt: null,
    };

    const profile = await prisma.registryProfile.upsert({
      where: { organisationId: membership.organisationId },
      create: {
        organisationId: membership.organisationId,
        createdBy: user.id,
        ...data,
      },
      update: data,
    });

    await prisma.auditLog.create({
      data: {
        action: "REGISTRY_PROFILE_UPDATED",
        entityType: "RegistryProfile",
        entityId: profile.id,
        actorId: user.id,
        organisationId: membership.organisationId,
        after: data,
      },
    });

    return ok(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
