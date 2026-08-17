import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import {
  JOURNEY_PHASES,
  personaCopy,
  personaFrom,
  type JourneyPhase,
  type Persona,
  type PhaseId,
  type PhaseStatus,
} from "@/lib/journey";

export const runtime = "nodejs";

type NextAction = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

function markPhases(
  current: PhaseId,
  extras?: Partial<Record<PhaseId, PhaseStatus>>,
): JourneyPhase[] {
  const order: PhaseId[] = ["connect", "verify", "negotiate", "execute"];
  const currentIdx = order.indexOf(current);
  return JOURNEY_PHASES.map((p) => {
    const idx = order.indexOf(p.id);
    const status: PhaseStatus =
      extras?.[p.id] ??
      (idx < currentIdx ? "complete" : idx === currentIdx ? "current" : "upcoming");
    return { ...p, status };
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const membership = await prisma.organisationMember.findFirst({
      where: { userId: user.id, deletedAt: null },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            type: true,
            countryCode: true,
            city: true,
            verificationStatus: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const org =
      membership && !membership.organisation.deletedAt
        ? membership.organisation
        : null;
    const persona: Persona = personaFrom(user.roles, org?.type);
    const copy = personaCopy(persona);

    if (!org) {
      const next: NextAction = {
        title: "Register your organisation",
        body: "The corridor is B2B. Cooperatives, exporters, and GCC buyers — not 700,000 individual farm logins.",
        href: `/onboarding/organisation?type=${persona === "buyer" ? "BUYER" : persona === "chamber" ? "CHAMBER_OF_COMMERCE" : "COOPERATIVE"}`,
        cta: "Register organisation",
      };
      return ok({
        persona,
        copy,
        org: null,
        phases: markPhases("connect"),
        next,
        trades: [],
        verified: false,
      });
    }

    const orgId = org.id;
    const verified = org.verificationStatus === "VERIFIED";

    const [registry, rfqCount, offerCount, trades] = await Promise.all([
      prisma.registryProfile.findFirst({
        where: { organisationId: orgId, deletedAt: null },
        select: { isListed: true },
      }),
      prisma.rfq.count({
        where: { buyerOrgId: orgId, deletedAt: null },
      }),
      prisma.offer.count({
        where: { sellerOrgId: orgId, deletedAt: null },
      }),
      prisma.trade.findMany({
        where: {
          deletedAt: null,
          OR: [
            { buyerOrgId: orgId },
            { sellerOrgId: orgId },
            { participants: { some: { organisationId: orgId, deletedAt: null } } },
          ],
        },
        select: {
          id: true,
          tradeNumber: true,
          title: true,
          status: true,
          currentStage: true,
          completionPct: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const listed = Boolean(registry?.isListed);
    const hasDeal = rfqCount > 0 || offerCount > 0 || trades.length > 0;
    const activeTrade = trades.find(
      (t) => !["COMPLETED", "CANCELLED"].includes(t.status),
    );
    const settled =
      trades.length > 0 && trades.every((t) => t.status === "COMPLETED");

    let current: PhaseId = "verify";
    let next: NextAction;

    if (!verified) {
      current = "verify";
      next = {
        title: "Verify this organisation",
        body: "KYB must land before a contract, credit, or shipment. Submit documents on Identity, then Verification.",
        href: "/dashboard/verification",
        cta: "Start verification",
      };
    } else if (persona === "buyer" && rfqCount === 0 && !activeTrade) {
      current = "negotiate";
      next = {
        title: "Publish a dated offtake",
        body: "Origin Kenya, destination your country, needed-by date. Farmers plant against this sold order.",
        href: "/dashboard/rfqs",
        cta: "Create RFQ",
      };
    } else if (persona === "supplier" && !listed) {
      current = "negotiate";
      next = {
        title: "List on the Kenya–GCC registry",
        body: "Commodities and export markets (OM, SA, IR, IQ) so Gulf buyers can find this cooperative or exporter.",
        href: "/dashboard/registry",
        cta: "Publish listing",
      };
    } else if (persona === "supplier" && !hasDeal) {
      current = "negotiate";
      next = {
        title: "Answer a Gulf offtake",
        body: "Open-market RFQs from Oman, Saudi Arabia, Iran, and Iraq. Accepting an offer mints the Trade Passport.",
        href: "/dashboard/rfqs",
        cta: "View open RFQs",
      };
    } else if (persona === "chamber") {
      current = listed ? "execute" : "negotiate";
      next = listed
        ? {
            title: "Keep producer groups visible",
            body: "Chambers vet cooperatives county by county. Point groups to registry and verification — not one-off farmer logins.",
            href: "/dashboard/registry",
            cta: "Open registry",
          }
        : {
            title: "List this chamber",
            body: "Gulf buyers need an institutional Kenyan counterparty they can verify.",
            href: "/dashboard/registry",
            cta: "Publish listing",
          };
    } else if (persona === "funder") {
      current = "execute";
      next = {
        title: "Read bankability, then fund a lot",
        body: "Issue in-kind credit or escrow against a locked Trade Passport — Koridor is not a remittance bank.",
        href: "/dashboard/bankability",
        cta: "Open bankability",
      };
    } else if (activeTrade) {
      current = "execute";
      next = {
        title: `Continue ${activeTrade.tradeNumber}`,
        body: `${activeTrade.title} · ${activeTrade.currentStage}. Close trust, rules, events, and finance on this passport.`,
        href: `/dashboard/trades/${activeTrade.id}`,
        cta: "Open Trade Passport",
      };
    } else if (settled) {
      current = "execute";
      next = {
        title: "Start the next lot",
        body: "The last passport settled. Repeat offtake → contract → execute on a new trade.",
        href: persona === "buyer" ? "/dashboard/rfqs" : "/dashboard/rfqs",
        cta: persona === "buyer" ? "New offtake RFQ" : "Open market",
      };
    } else {
      current = "negotiate";
      next = {
        title: "Lock quantity, price, and date",
        body: "Accept an offer so commercial rules become a signed contract on the passport.",
        href: "/dashboard/rfqs",
        cta: "Open RFQs",
      };
    }

    const extras: Partial<Record<PhaseId, PhaseStatus>> = {};
    if (verified) extras.verify = current === "verify" ? "current" : "complete";
    if (hasDeal && current === "execute") extras.negotiate = "complete";
    if (settled) extras.execute = "complete";

    return ok({
      persona,
      copy,
      org: {
        id: org.id,
        name: org.name,
        type: org.type,
        countryCode: org.countryCode,
        city: org.city,
        verificationStatus: org.verificationStatus,
        listed,
      },
      phases: markPhases(current, extras),
      next,
      trades,
      verified,
      rfqCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
