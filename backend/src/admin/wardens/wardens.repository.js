import { prisma } from "../../lib/prisma.js";

/**
 * @param {import("zod").infer<typeof import("./wardens.validation.js").listWardensQuerySchema>} q
 */
export function buildWardenWhere(q) {
  /** @type {import("@prisma/client").Prisma.WardenWhereInput} */
  const where = {};
  if (q.status) where.status = q.status;
  if (q.hostelId) where.assigned_hostel_id = q.hostelId;
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { email: { contains: q.search, mode: "insensitive" } },
      { phone: { contains: q.search, mode: "insensitive" } },
    ];
  }
  return where;
}

/** @param {import("zod").infer<typeof import("./wardens.validation.js").listWardensQuerySchema>["sort"]} sort */
export function wardenOrderBy(sort) {
  if (sort === "name_desc") return { name: "desc" };
  if (sort === "created_desc") return { created_at: "desc" };
  return { name: "asc" };
}

/**
 * @param {import("@prisma/client").Prisma.WardenWhereInput} where
 */
export async function countWardens(where) {
  return prisma.warden.count({ where });
}

/**
 * @param {import("@prisma/client").Prisma.WardenWhereInput} where
 * @param {import("@prisma/client").Prisma.WardenOrderByWithRelationInput} orderBy
 * @param {number} skip
 * @param {number} take
 */
export async function listWardens(where, orderBy, skip, take) {
  return prisma.warden.findMany({
    where,
    orderBy,
    skip,
    take,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      created_at: true,
      assigned_hostel: { select: { id: true, name: true, type: true } },
    },
  });
}

export async function findWarden(id) {
  return prisma.warden.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      created_at: true,
      updated_at: true,
      assigned_hostel: { select: { id: true, name: true, type: true } },
    },
  });
}

export async function findWardenByEmail(email) {
  return prisma.warden.findUnique({ where: { email } });
}
