import { z } from "zod";

/** Prisma string @id — may be default cuid() or explicit seed ids (e.g. seed-boys-hostel). */
export const prismaStringId = z.string().trim().min(1).max(128);

/** Query string param: treat "" as undefined. */
export const queryPrismaIdOptional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  prismaStringId.optional(),
);
