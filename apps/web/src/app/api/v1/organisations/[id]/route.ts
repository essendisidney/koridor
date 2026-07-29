import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { recomputeTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const membership = await prisma.organisationMember.findFirst({
      where: {
        organisationId: id,
        userId: user.id,
        deletedAt: null,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!membership) return fail("Insufficient organisation role", 403);

    const body = await req.json();
    const updated = await prisma.organisation.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.registrationNumber !== undefined
          ? { registrationNumber: body.registrationNumber }
          : {}),
        ...(body.taxId !== undefined ? { taxId: body.taxId } : {}),
        ...(body.website !== undefined ? { website: body.website } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        updatedBy: user.id,
      },
    });
    await recomputeTrustScore(id, user.id);
    return ok(updated);
  } catch {
    return fail("Unauthorized", 401);
  }
}
