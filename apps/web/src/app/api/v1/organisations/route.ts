import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "organisation"
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    if (!body.name || !body.type || !body.countryCode) {
      return fail("name, type and countryCode are required", 400);
    }

    const base = slugify(String(body.name));
    let slug = base;
    let i = 1;
    while (
      await prisma.organisation.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true },
      })
    ) {
      slug = `${base}-${i++}`;
    }

    const typeToRole: Record<string, string> = {
      BUYER: "BUYER",
      EXPORTER: "EXPORTER",
      FARMER: "FARMER",
      COOPERATIVE: "COOPERATIVE",
      LOGISTICS_PROVIDER: "LOGISTICS_PROVIDER",
      BANK: "BANK",
      INSURANCE: "INSURANCE",
      GOVERNMENT: "GOVERNMENT_OFFICER",
      CHAMBER_OF_COMMERCE: "CHAMBER_OF_COMMERCE",
    };

    const organisation = await prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: String(body.name).trim(),
          slug,
          type: body.type,
          countryCode: String(body.countryCode).toUpperCase(),
          city: body.city,
          registrationNumber: body.registrationNumber,
          taxId: body.taxId,
          website: body.website,
          description: body.description,
          ownerId: user.id,
          createdBy: user.id,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
              createdBy: user.id,
            },
          },
        },
      });

      const systemRole = typeToRole[String(body.type)];
      if (systemRole) {
        const existing = await tx.userRole.findFirst({
          where: { userId: user.id, role: systemRole as never, deletedAt: null },
        });
        if (!existing) {
          await tx.userRole.create({
            data: {
              userId: user.id,
              role: systemRole as never,
              createdBy: user.id,
            },
          });
        }
      }
      return org;
    });

    await prisma.activity.create({
      data: {
        type: "ORG_CREATED",
        title: "Organisation created",
        description: organisation.name,
        actorId: user.id,
        organisationId: organisation.id,
        entityType: "Organisation",
        entityId: organisation.id,
      },
    });

    return ok(organisation, { status: 201 });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to create organisation",
      400,
    );
  }
}
