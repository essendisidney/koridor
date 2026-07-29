import { ActivityType, DocumentType, KycStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ScoreBreakdown = {
  profileCompleteness: number;
  requiredDocuments: number;
  verificationStatus: number;
  memberKyc: number;
  total: number;
};

export async function recomputeTrustScore(organisationId: string, actorId?: string) {
  const org = await prisma.organisation.findFirst({
    where: { id: organisationId, deletedAt: null },
    include: {
      contacts: { where: { deletedAt: null } },
      documents: { where: { deletedAt: null } },
      members: {
        where: { deletedAt: null },
        include: {
          user: {
            include: {
              kycProfiles: {
                where: { deletedAt: null },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!org) throw new Error("Organisation not found");

  let profileCompleteness = 0;
  if (org.registrationNumber) profileCompleteness += 7;
  if (org.taxId) profileCompleteness += 7;
  if (org.addressLine1 || org.city) profileCompleteness += 6;
  if (org.contacts.length > 0) profileCompleteness += 5;

  const types = new Set(org.documents.map((d) => d.type));
  let requiredDocuments = 0;
  if (types.has(DocumentType.TRADE_LICENSE)) requiredDocuments += 13;
  if (types.has(DocumentType.TAX_CERTIFICATE)) requiredDocuments += 12;

  let verificationStatus = 0;
  if (org.verificationStatus === VerificationStatus.VERIFIED) {
    verificationStatus = 30;
  } else if (org.verificationStatus === VerificationStatus.PENDING) {
    verificationStatus = 15;
  } else if (org.verificationStatus === VerificationStatus.REJECTED) {
    verificationStatus = 5;
  }

  const memberKyc = org.members.some(
    (m) => m.user.kycProfiles[0]?.status === KycStatus.VERIFIED,
  )
    ? 20
    : org.members.some((m) => m.user.kycProfiles[0]?.status === KycStatus.PENDING)
      ? 8
      : 0;

  const breakdown: ScoreBreakdown = {
    profileCompleteness,
    requiredDocuments,
    verificationStatus,
    memberKyc,
    total:
      profileCompleteness +
      requiredDocuments +
      verificationStatus +
      memberKyc,
  };

  const profile = await prisma.trustProfile.upsert({
    where: { organisationId },
    create: {
      organisationId,
      trustScore: breakdown.total,
      scoreBreakdown: breakdown,
      lastScoredAt: new Date(),
      createdBy: actorId,
      updatedBy: actorId,
    },
    update: {
      trustScore: breakdown.total,
      scoreBreakdown: breakdown,
      lastScoredAt: new Date(),
      updatedBy: actorId,
      deletedAt: null,
    },
  });

  await prisma.activity.create({
    data: {
      type: ActivityType.TRUST_SCORE_UPDATED,
      title: "Trust score updated",
      description: `Score is now ${breakdown.total}`,
      actorId,
      organisationId,
      entityType: "TrustProfile",
      entityId: profile.id,
      metadata: breakdown,
    },
  });

  return profile;
}
