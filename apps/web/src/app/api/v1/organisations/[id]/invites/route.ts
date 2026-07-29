import { NextRequest } from "next/server";
import { opaqueToken, requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
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
    const email = String(body.email ?? "")
      .toLowerCase()
      .trim();
    const role = (body.role ?? "MEMBER") as "ADMIN" | "MEMBER" | "VIEWER";
    if (!email) return fail("Email is required", 400);

    const invite = await prisma.organisationInvite.create({
      data: {
        organisationId: id,
        email,
        role,
        token: opaqueToken(32),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: user.id,
      },
    });

    await prisma.activity.create({
      data: {
        type: "MEMBER_INVITED",
        title: "Member invited",
        description: email,
        actorId: user.id,
        organisationId: id,
        entityType: "OrganisationInvite",
        entityId: invite.id,
      },
    });

    return ok({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      token: invite.token,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invite failed", 400);
  }
}
