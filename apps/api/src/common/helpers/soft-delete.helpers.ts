import type { Prisma } from '@prisma/client';

/** Always include when querying soft-deletable models. */
export const notDeleted = { deletedAt: null } as const;

export type SoftDeleteWhere = { deletedAt: null };

export function withNotDeleted<T extends object>(
  where?: T,
): T & SoftDeleteWhere {
  return { ...(where ?? ({} as T)), deletedAt: null };
}

export function softDeleteData(
  updatedBy?: string | null,
): { deletedAt: Date; updatedBy?: string } {
  const data: { deletedAt: Date; updatedBy?: string } = {
    deletedAt: new Date(),
  };
  if (updatedBy) {
    data.updatedBy = updatedBy;
  }
  return data;
}

export function activeUserWhere(
  extra?: Prisma.UserWhereInput,
): Prisma.UserWhereInput {
  return withNotDeleted({ isActive: true, ...extra });
}
