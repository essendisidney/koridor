import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { permissionsForRoles } from "./permissions";

const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";

function secret(kind: "access" | "refresh") {
  const value =
    kind === "access"
      ? process.env.JWT_ACCESS_SECRET
      : process.env.JWT_REFRESH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(`${kind} JWT secret is not configured`);
  }
  return new TextEncoder().encode(value);
}

function parseDurationToSeconds(input: string) {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) return 900;
  const n = Number(match[1]);
  const unit = match[2];
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  return n * 86400;
}

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  organisationId?: string | null;
  roles: string[];
  permissions: string[];
};

function toAuthUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  roles: { role: string }[];
  memberships: { organisationId: string }[];
}): AuthUser {
  const roles = user.roles.map((r) => r.role);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    organisationId: user.memberships[0]?.organisationId ?? null,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

async function loadUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    include: {
      roles: { where: { deletedAt: null } },
      memberships: {
        where: { deletedAt: null },
        orderBy: { joinedAt: "asc" },
        take: 1,
      },
    },
  });
}

export async function issueTokens(userId: string) {
  const user = await loadUser(userId);
  if (!user) throw new Error("User not found");
  const authUser = toAuthUser(user);
  const accessSeconds = parseDurationToSeconds(ACCESS_TTL);
  const refreshSeconds = parseDurationToSeconds(REFRESH_TTL);

  const base = {
    sub: authUser.id,
    email: authUser.email,
    organisationId: authUser.organisationId,
    roles: authUser.roles,
    permissions: authUser.permissions,
  };

  const accessToken = await new SignJWT({ ...base, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${accessSeconds}s`)
    .sign(secret("access"));

  const refreshToken = await new SignJWT({ ...base, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${refreshSeconds}s`)
    .sign(secret("refresh"));

  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + refreshSeconds * 1000),
      createdBy: userId,
    },
  });

  return {
    user: authUser,
    accessToken,
    refreshToken,
    expiresIn: accessSeconds,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), deletedAt: null },
    include: {
      roles: { where: { deletedAt: null } },
      memberships: {
        where: { deletedAt: null },
        orderBy: { joinedAt: "asc" },
        take: 1,
      },
    },
  });
  if (!user || !user.isActive) throw new Error("Invalid email or password");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      organisationId: user.memberships[0]?.organisationId,
    },
  });

  await prisma.activity.create({
    data: {
      type: "USER_LOGIN",
      title: "Signed in",
      actorId: user.id,
      organisationId: user.memberships[0]?.organisationId,
      entityType: "User",
      entityId: user.id,
    },
  });

  return issueTokens(user.id);
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (existing) throw new Error("Email is already registered");

  const role =
    input.role && input.role !== "SYSTEM_ADMIN" ? input.role : undefined;
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim(),
      settings: { create: {} },
      ...(role
        ? {
            roles: {
              create: { role: role as never },
            },
          }
        : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      after: { email: user.email },
    },
  });

  await prisma.activity.create({
    data: {
      type: "USER_REGISTERED",
      title: "Account created",
      description: `${user.firstName} ${user.lastName} registered`,
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
    },
  });

  return issueTokens(user.id);
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string; type?: string };
  try {
    const verified = await jwtVerify(refreshToken, secret("refresh"));
    payload = verified.payload as { sub: string; type?: string };
  } catch {
    throw new Error("Invalid refresh token");
  }
  if (payload.type !== "refresh") throw new Error("Invalid token type");

  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId: payload.sub,
      revokedAt: null,
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!stored) throw new Error("Refresh token revoked or expired");

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(payload.sub);
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    await prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null, deletedAt: null },
      data: { revokedAt: new Date() },
    });
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, deletedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return { success: true };
}

export async function requireUser(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = header.slice(7);
  try {
    const verified = await jwtVerify(token, secret("access"));
    const payload = verified.payload as { sub: string; type?: string };
    if (payload.type !== "access") throw new Error("Unauthorized");
    const user = await loadUser(payload.sub);
    if (!user) throw new Error("Unauthorized");
    return toAuthUser(user);
  } catch {
    throw new Error("Unauthorized");
  }
}

export function opaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}
