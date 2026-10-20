import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/http";
import { countryName } from "@/lib/corridors";
import {
  RESTRICTED_MARKET_NOTICE,
  RESTRICTED_MARKET_OVERRIDE_FLAG,
  restrictedMarketsIn,
} from "@/lib/sanctions";

export type RestrictedAction =
  | "publish_requirement"
  | "publish_rfq"
  | "create_trade"
  | "request_escrow"
  | "open_escrow"
  | "fund_escrow"
  | "release_escrow"
  | "wallet_top_up"
  | "credit_draw";

type OverrideAudience = {
  /** Restricted market codes the override applies to, e.g. ["IR"]. Required. */
  markets?: string[];
  /** Optional allow-list of organisation ids; empty/missing = all orgs. */
  organisationIds?: string[];
};

/**
 * True only when the override flag is enabled AND its audience names every
 * blocked market (and, if set, every org involved). Fails closed: a missing
 * flag, empty audience or storage error keeps the block in place.
 */
async function overrideAllows(markets: string[], organisationIds: string[]) {
  try {
    const flag = await prisma.featureFlag.findFirst({
      where: { key: RESTRICTED_MARKET_OVERRIDE_FLAG, deletedAt: null },
    });
    if (!flag?.enabled) return false;
    const audience = (flag.audience ?? {}) as OverrideAudience;
    const allowedMarkets = (audience.markets ?? []).map((m) =>
      String(m).toUpperCase(),
    );
    if (!markets.every((m) => allowedMarkets.includes(m))) return false;
    const orgs = audience.organisationIds ?? [];
    if (orgs.length && !organisationIds.every((id) => orgs.includes(id))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a 451 response when the action touches a restricted market (by
 * destination/origin country or by an org's registered country), else null.
 */
export async function restrictedMarketBlock(input: {
  action: RestrictedAction;
  countries?: (string | null | undefined)[];
  organisationIds?: (string | null | undefined)[];
  /** Pulls buyer/seller orgs and trade/RFQ corridor countries from the contract. */
  contractId?: string | null;
  /** Pulls trade parties and corridor countries from the Trade Passport. */
  tradeId?: string | null;
  actorId?: string;
}) {
  const countries = [...(input.countries ?? [])];
  const orgIdList = [...(input.organisationIds ?? [])];
  if (input.tradeId) {
    const trade = await prisma.trade.findFirst({
      where: { id: input.tradeId },
      select: {
        originCountry: true,
        destinationCountry: true,
        buyerOrgId: true,
        sellerOrgId: true,
      },
    });
    if (trade) {
      countries.push(trade.originCountry, trade.destinationCountry);
      orgIdList.push(trade.buyerOrgId, trade.sellerOrgId);
    }
  }
  if (input.contractId) {
    const contract = await prisma.contract.findFirst({
      where: { id: input.contractId },
      select: { buyerOrgId: true, sellerOrgId: true, tradeId: true, rfqId: true },
    });
    if (contract) {
      orgIdList.push(contract.buyerOrgId, contract.sellerOrgId);
      const [trade, rfq] = await Promise.all([
        contract.tradeId
          ? prisma.trade.findFirst({
              where: { id: contract.tradeId },
              select: { originCountry: true, destinationCountry: true },
            })
          : null,
        contract.rfqId
          ? prisma.rfq.findFirst({
              where: { id: contract.rfqId },
              select: { originCountry: true, destinationCountry: true },
            })
          : null,
      ]);
      countries.push(
        trade?.originCountry,
        trade?.destinationCountry,
        rfq?.originCountry,
        rfq?.destinationCountry,
      );
    }
  }
  const orgIds = Array.from(
    new Set(orgIdList.filter((id): id is string => Boolean(id))),
  );
  const orgs = orgIds.length
    ? await prisma.organisation.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, countryCode: true },
      })
    : [];
  const markets = restrictedMarketsIn([
    ...countries,
    ...orgs.map((o) => o.countryCode),
  ]);
  if (!markets.length) return null;
  if (await overrideAllows(markets, orgIds)) return null;

  await prisma.auditLog
    .create({
      data: {
        action: "RESTRICTED_MARKET_BLOCKED",
        entityType: "Compliance",
        actorId: input.actorId,
        organisationId: orgIds[0],
        metadata: { action: input.action, markets },
      },
    })
    .catch(() => undefined);

  const names = markets.map((m) => countryName(m)).join(", ");
  return fail(
    `Blocked: this involves a restricted market (${names}). ${RESTRICTED_MARKET_NOTICE}`,
    451,
    "RESTRICTED_MARKET",
  );
}
