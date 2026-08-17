/** Pick the workspace org when a user belongs to more than one. */

export type MembershipLike = {
  role: string;
  organisation: {
    deletedAt?: Date | string | null;
    verificationStatus: string;
  };
};

export function pickPrimaryMembership<T extends MembershipLike>(
  memberships: T[],
): T | null {
  const live = memberships.filter((m) => !m.organisation.deletedAt);
  if (!live.length) return null;
  const score = (m: T) => {
    let n = 0;
    if (m.organisation.verificationStatus === "VERIFIED") n += 4;
    if (m.role === "OWNER") n += 2;
    return n;
  };
  return [...live].sort((a, b) => score(b) - score(a))[0];
}
