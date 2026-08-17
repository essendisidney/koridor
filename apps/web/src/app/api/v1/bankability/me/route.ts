import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { decimalStr, recomputeBankability } from "@/lib/bankability";
import { syncTradeCreditFacility, serializeFacility } from "@/lib/trade-credit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_READ);
    const membership = await requireOrgMembership(user.id);

    const { profile, result } = await recomputeBankability(
      membership.organisationId,
      user.id,
    );

    let facility = null;
    try {
      facility = serializeFacility(
        await syncTradeCreditFacility({
          organisationId: membership.organisationId,
          actorId: user.id,
        }),
      );
    } catch {
      facility = null;
    }

    return ok({
      score: result.score,
      breakdown: result.breakdown,
      suggestedCreditLimit: result.suggestedCreditLimit,
      currency: result.currency,
      insights: result.insights,
      metrics: result.metrics,
      scoredAt: profile.bankabilityScoredAt,
      suggestedCreditLimitStored: decimalStr(profile.suggestedCreditLimit),
      organisation: {
        id: membership.organisation.id,
        name: membership.organisation.name,
        verificationStatus: membership.organisation.verificationStatus,
        type: membership.organisation.type,
        countryCode: membership.organisation.countryCode,
        city: membership.organisation.city,
      },
      facility,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_WRITE);
    const membership = await requireOrgMembership(user.id);

    const { profile, result } = await recomputeBankability(
      membership.organisationId,
      user.id,
    );
    const facility = serializeFacility(
      await syncTradeCreditFacility({
        organisationId: membership.organisationId,
        actorId: user.id,
      }),
    );

    return ok({
      score: result.score,
      breakdown: result.breakdown,
      suggestedCreditLimit: result.suggestedCreditLimit,
      currency: result.currency,
      insights: result.insights,
      metrics: result.metrics,
      scoredAt: profile.bankabilityScoredAt,
      organisation: {
        id: membership.organisation.id,
        name: membership.organisation.name,
        verificationStatus: membership.organisation.verificationStatus,
        type: membership.organisation.type,
        countryCode: membership.organisation.countryCode,
        city: membership.organisation.city,
      },
      facility,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
