import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { secret } from "@/lib/auth-server";
import { appUrl, normalizePhone, sendOutbound } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

/**
 * Password reset without extra tables: a short-lived signed token that also
 * carries a fingerprint of the current password hash, so it stops working as
 * soon as the password changes (single use).
 */
const RESET_TTL = "30m";

function fingerprint(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 24);
}

async function sendResetEmail(to: string, link: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your Koridor password",
      text: `Someone asked to reset the password for this Koridor account.\n\nReset it here (link works for 30 minutes):\n${link}\n\nIf this wasn't you, ignore this email. Your password won't change.`,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** Always resolves the same way so callers can't learn which emails exist. */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, isActive: true },
    select: { id: true, email: true, phone: true, passwordHash: true },
  });
  if (!user) return;

  const token = await new SignJWT({ purpose: "password_reset", fp: fingerprint(user.passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(RESET_TTL)
    .sign(secret("refresh"));
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  const emailed = await sendResetEmail(user.email, link);
  const phone = normalizePhone(user.phone);
  let texted = false;
  if (phone) {
    const r = await sendOutbound({
      to: phone,
      title: "Reset your password",
      body: "Use this link within 30 minutes. Ignore it if you didn't ask.",
      url: link,
    });
    texted = r.ok;
  }
  if (!emailed && !texted) {
    // No provider configured (local/dev): log so the link can still be used.
    console.info(`[password-reset] no delivery channel for ${user.email}: ${link}`);
  }
  await prisma.auditLog.create({
    data: {
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      metadata: { emailed, texted },
    },
  });
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Use at least 8 characters.");
  let payload: { sub?: string; purpose?: string; fp?: string };
  try {
    payload = (await jwtVerify(token, secret("refresh"))).payload as typeof payload;
  } catch {
    throw new Error("This reset link has expired. Ask for a new one.");
  }
  if (payload.purpose !== "password_reset" || !payload.sub) {
    throw new Error("This reset link is not valid.");
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, passwordHash: true, deletedAt: true, isActive: true },
  });
  if (!user || user.deletedAt || !user.isActive || fingerprint(user.passwordHash) !== payload.fp) {
    throw new Error("This reset link has already been used. Ask for a new one.");
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Sign out everywhere: old sessions can't renew after a reset.
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: { action: "PASSWORD_RESET", entityType: "User", entityId: user.id, actorId: user.id },
    }),
  ]);
}
