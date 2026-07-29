import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const settings =
      (await prisma.userSettings.findUnique({ where: { userId: user.id } })) ??
      (await prisma.userSettings.create({
        data: { userId: user.id },
      }));
    return ok(settings);
  } catch {
    return fail("Unauthorized", 401);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        locale: body.locale ?? "en",
        timezone: body.timezone ?? "UTC",
        theme: body.theme ?? "system",
        emailNotifications: body.emailNotifications ?? true,
        smsNotifications: body.smsNotifications ?? false,
      },
      update: {
        ...(body.locale !== undefined ? { locale: body.locale } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.theme !== undefined ? { theme: body.theme } : {}),
        ...(body.emailNotifications !== undefined
          ? { emailNotifications: Boolean(body.emailNotifications) }
          : {}),
        ...(body.smsNotifications !== undefined
          ? { smsNotifications: Boolean(body.smsNotifications) }
          : {}),
        updatedBy: user.id,
      },
    });
    return ok(settings);
  } catch {
    return fail("Unauthorized", 401);
  }
}
