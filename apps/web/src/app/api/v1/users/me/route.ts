import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { permissionsForRoles } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return ok(user);
  } catch {
    return fail("Unauthorized", 401);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.firstName !== undefined
          ? { firstName: String(body.firstName).trim() }
          : {}),
        ...(body.lastName !== undefined
          ? { lastName: String(body.lastName).trim() }
          : {}),
        ...(body.phone !== undefined
          ? { phone: body.phone ? String(body.phone).trim() : null }
          : {}),
        updatedBy: user.id,
      },
      include: {
        roles: { where: { deletedAt: null } },
        memberships: {
          where: { deletedAt: null },
          orderBy: { joinedAt: "asc" },
          take: 1,
        },
      },
    });

    const roles = updated.roles.map((r) => r.role);
    return ok({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      emailVerified: updated.emailVerified,
      mfaEnabled: updated.mfaEnabled,
      organisationId: updated.memberships[0]?.organisationId ?? null,
      roles,
      permissions: permissionsForRoles(roles),
    });
  } catch {
    return fail("Unauthorized", 401);
  }
}
