import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_FLAGS: {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}[] = [
  {
    key: "analytics_v1",
    name: "Analytics dashboard",
    description: "Trade / corridor / risk analytics UI",
    enabled: true,
  },
  {
    key: "ai_assistant_v1",
    name: "AI assistant",
    description: "Heuristic + optional OpenAI assistant",
    enabled: true,
  },
  {
    key: "strict_evidence",
    name: "Strict evidence mode",
    description: "Gate milestone completion on TradeEvidence",
    enabled: true,
  },
  {
    key: "finance_escrow",
    name: "Finance escrow",
    description: "Wallet hold/release escrow flows",
    enabled: true,
  },
];

export async function listFeatureFlags() {
  try {
    let flags = await prisma.featureFlag.findMany({
      where: { deletedAt: null },
      orderBy: { key: "asc" },
    });
    if (flags.length === 0) {
      await Promise.all(
        DEFAULT_FLAGS.map((f) =>
          prisma.featureFlag.upsert({
            where: { key: f.key },
            create: {
              key: f.key,
              name: f.name,
              description: f.description,
              enabled: f.enabled,
              percentage: 100,
            },
            update: {
              name: f.name,
              description: f.description,
              enabled: f.enabled,
              deletedAt: null,
            },
          }),
        ),
      );
      flags = await prisma.featureFlag.findMany({
        where: { deletedAt: null },
        orderBy: { key: "asc" },
      });
    }
    if (flags.length > 0) return flags;
  } catch {
    /* tables may not exist yet */
  }
  return DEFAULT_FLAGS.map((f) => ({
    id: f.key,
    key: f.key,
    name: f.name,
    description: f.description,
    enabled: f.enabled,
    percentage: 100,
    audience: null as Prisma.JsonValue | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null as string | null,
    updatedBy: null as string | null,
    deletedAt: null as Date | null,
  }));
}

export async function upsertFeatureFlag(input: {
  key: string;
  name?: string;
  description?: string | null;
  enabled: boolean;
  percentage?: number;
  actorId?: string;
}) {
  const key = input.key.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) throw new Error("key is required");

  try {
    return await prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        name: input.name ?? key,
        description: input.description ?? null,
        enabled: input.enabled,
        percentage: input.percentage ?? 100,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      update: {
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        percentage: input.percentage,
        updatedBy: input.actorId,
        deletedAt: null,
      },
    });
  } catch (error) {
    throw new Error(
      `Feature flags storage unavailable: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}

export function isFlagEnabled(
  flags: { key: string; enabled: boolean; percentage: number }[],
  key: string,
) {
  const f = flags.find((x) => x.key === key);
  if (!f) return false;
  if (!f.enabled) return false;
  return f.percentage >= 100 ? true : Math.random() * 100 < f.percentage;
}

export async function runHealthChecks(actorId?: string) {
  const checks: {
    service: string;
    status: string;
    latencyMs: number;
    detail?: Prisma.InputJsonValue;
  }[] = [];

  // Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      service: "database",
      status: "ok",
      latencyMs: Date.now() - dbStart,
    });
  } catch (error) {
    checks.push({
      service: "database",
      status: "error",
      latencyMs: Date.now() - dbStart,
      detail: {
        message: error instanceof Error ? error.message : "db error",
      },
    });
  }

  // App process
  checks.push({
    service: "web",
    status: "ok",
    latencyMs: 0,
    detail: {
      node: process.version,
      env: process.env.VERCEL ? "vercel" : "local",
      actorId: actorId ?? null,
    },
  });

  // OpenAI optional
  checks.push({
    service: "openai",
    status: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
    latencyMs: 0,
  });

  checks.push({
    service: "payments",
    status: process.env.STRIPE_SECRET_KEY
      ? "stripe"
      : process.env.PAYMENTS_PROVIDER === "mpesa"
        ? "mpesa"
        : "demo",
    latencyMs: 0,
    detail: {
      provider: process.env.PAYMENTS_PROVIDER ?? null,
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
  });

  checks.push({
    service: "carriers",
    status: process.env.AFTERSHIP_API_KEY ? "aftership" : "manual",
    latencyMs: 0,
    detail: {
      provider: process.env.CARRIER_PROVIDER ?? null,
    },
  });

  // Persist best-effort
  for (const c of checks) {
    try {
      await prisma.systemHealthLog.create({
        data: {
          service: c.service,
          status: c.status,
          latencyMs: c.latencyMs,
          detail: c.detail,
        },
      });
    } catch {
      /* ignore missing table */
    }
  }

  const overall = checks.every(
    (c) =>
      c.status === "ok" ||
      c.status === "configured" ||
      c.status === "not_configured" ||
      c.status === "demo" ||
      c.status === "manual" ||
      c.status === "stripe" ||
      c.status === "mpesa" ||
      c.status === "aftership",
  )
    ? "healthy"
    : "degraded";

  return { overall, checks, checkedAt: new Date().toISOString() };
}

export async function recentHealthLogs(take = 50) {
  try {
    return await prisma.systemHealthLog.findMany({
      orderBy: { checkedAt: "desc" },
      take,
    });
  } catch {
    return [];
  }
}

export async function adminOverview() {
  const [orgs, users, trades, flags, health] = await Promise.all([
    prisma.organisation.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.trade.count({ where: { deletedAt: null } }),
    listFeatureFlags(),
    runHealthChecks(),
  ]);

  return {
    counts: { organisations: orgs, users, trades },
    flagsEnabled: flags.filter((f) => f.enabled).length,
    flagsTotal: flags.length,
    health,
  };
}
