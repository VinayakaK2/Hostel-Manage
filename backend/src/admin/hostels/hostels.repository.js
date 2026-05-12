import { prisma } from "../../lib/prisma.js";

/**
 * @param {import("zod").infer<typeof import("./hostels.validation.js").listHostelsQuerySchema>} q
 */
export function buildHostelWhere(q) {
  /** @type {import("@prisma/client").Prisma.HostelWhereInput} */
  const where = {};
  if (q.type) where.type = q.type;
  if (q.status) where.status = q.status;
  if (q.search) {
    where.name = { contains: q.search, mode: "insensitive" };
  }
  return where;
}

/** @param {import("zod").infer<typeof import("./hostels.validation.js").listHostelsQuerySchema>["sort"]} sort */
export function hostelOrderBy(sort) {
  if (sort === "name_desc") return { name: "desc" };
  if (sort === "created_desc") return { created_at: "desc" };
  return { name: "asc" };
}

/**
 * @param {import("@prisma/client").Prisma.HostelWhereInput} where
 */
export async function countHostels(where) {
  return prisma.hostel.count({ where });
}

/**
 * @param {import("@prisma/client").Prisma.HostelWhereInput} where
 * @param {import("@prisma/client").Prisma.HostelOrderByWithRelationInput} orderBy
 * @param {number} skip
 * @param {number} take
 */
export async function listHostels(where, orderBy, skip, take) {
  const rows = await prisma.hostel.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      rooms: { select: { capacity: true, current_occupancy: true, floor: true } },
      wardens: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true, email: true },
        take: 3,
      },
    },
  });

  return rows.map((h) => {
    const occ = h.rooms.reduce((s, r) => s + r.current_occupancy, 0);
    const cap = h.rooms.reduce((s, r) => s + r.capacity, 0) || h.capacity;
    const floors = h.rooms.length
      ? Math.max(...h.rooms.map((r) => r.floor))
      : h.floor_count;
    return {
      id: h.id,
      name: h.name,
      type: h.type,
      capacity: cap,
      currentOccupancy: occ,
      floor_count: h.floor_count,
      floorsInUse: floors,
      status: h.status,
      assignedWardens: h.wardens,
      created_at: h.created_at,
    };
  });
}

export async function findHostel(id) {
  return prisma.hostel.findUnique({
    where: { id },
    include: {
      rooms: true,
      wardens: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });
}

export async function findRoom(roomId) {
  return prisma.room.findUnique({ where: { id: roomId } });
}
