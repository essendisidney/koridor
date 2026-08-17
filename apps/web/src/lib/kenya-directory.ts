import { OrganisationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FEATURED_CORRIDORS,
  GULF_WEST_ASIA_BUYERS,
  KENYA_PRODUCE,
} from "@/lib/corridors";

export function parseKenyaDest(raw?: string | null) {
  const dest = raw?.toUpperCase();
  if (!dest) return null;
  if (!(GULF_WEST_ASIA_BUYERS as readonly string[]).includes(dest)) {
    throw new Error("Unknown destination. Use OM, SA, IR, or IQ.");
  }
  return dest;
}

export async function getKenyaCorridorDirectory(destination?: string | null) {
  const dest = parseKenyaDest(destination);
  const markets = dest
    ? [dest]
    : ([...GULF_WEST_ASIA_BUYERS] as string[]);

  const destFilter = dest
    ? {
        OR: [
          { exportMarkets: { hasSome: [dest, dest.toLowerCase()] } },
          { exportMarkets: { isEmpty: true } },
        ],
      }
    : {};

  const orgInclude = {
    organisation: {
      select: {
        name: true,
        slug: true,
        countryCode: true,
        city: true,
        type: true,
        verificationStatus: true,
        trustProfile: { select: { trustScore: true } },
      },
    },
  } as const;

  const [exporters, farmers, buyers] = await Promise.all([
    prisma.registryProfile.findMany({
      where: {
        deletedAt: null,
        isListed: true,
        organisationType: {
          in: [OrganisationType.EXPORTER, OrganisationType.COOPERATIVE],
        },
        organisation: { deletedAt: null, countryCode: "KE" },
        ...destFilter,
      },
      include: orgInclude,
      take: 40,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.registryProfile.findMany({
      where: {
        deletedAt: null,
        isListed: true,
        organisationType: OrganisationType.FARMER,
        organisation: { deletedAt: null, countryCode: "KE" },
        ...destFilter,
      },
      include: orgInclude,
      take: 40,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.registryProfile.findMany({
      where: {
        deletedAt: null,
        isListed: true,
        organisation: {
          deletedAt: null,
          type: OrganisationType.BUYER,
          countryCode: { in: markets },
        },
      },
      include: orgInclude,
      take: 40,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const serialize = (p: (typeof exporters)[number]) => ({
    name: p.organisation.name,
    slug: p.organisation.slug,
    type: p.organisation.type,
    countryCode: p.organisation.countryCode,
    city: p.organisation.city,
    verificationStatus: p.organisation.verificationStatus,
    trustScore: p.organisation.trustProfile?.trustScore ?? 0,
    summary: p.summary,
    commodities: p.commodities,
    exportMarkets: p.exportMarkets,
  });

  const marketsUpper = markets.map((m) => m.toUpperCase());
  const kenyanSuppliers = [...exporters, ...farmers]
    .map(serialize)
    .sort((a, b) => {
      const hit = (m: string[]) =>
        m.some((x) => marketsUpper.includes(x.toUpperCase())) ? 0 : 1;
      return hit(a.exportMarkets) - hit(b.exportMarkets);
    });

  return {
    origin: "KE" as const,
    destinations: [...GULF_WEST_ASIA_BUYERS],
    corridors: FEATURED_CORRIDORS,
    produce: [...KENYA_PRODUCE],
    kenyanSuppliers,
    gulfBuyers: buyers.map(serialize),
  };
}
