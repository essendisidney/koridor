import { NextRequest } from "next/server";
import { OrganisationType } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  FEATURED_CORRIDORS,
  GULF_WEST_ASIA_BUYERS,
  KENYA_PRODUCE,
} from "@/lib/corridors";

export const runtime = "nodejs";

/** Public Kenya → GCC / West Asia directory (listed orgs only). */
export async function GET(req: NextRequest) {
  try {
    const dest = req.nextUrl.searchParams.get("destination")?.toUpperCase();
    if (
      dest &&
      !(GULF_WEST_ASIA_BUYERS as readonly string[]).includes(dest)
    ) {
      return fail("Unknown destination. Use OM, SA, IR, or IQ.", 400);
    }
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
          organisationType: OrganisationType.BUYER,
          organisation: {
            deletedAt: null,
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

    return ok({
      origin: "KE",
      destinations: [...GULF_WEST_ASIA_BUYERS],
      corridors: FEATURED_CORRIDORS,
      produce: [...KENYA_PRODUCE],
      kenyanSuppliers,
      gulfBuyers: buyers.map(serialize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, 500);
  }
}
