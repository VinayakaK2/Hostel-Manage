import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logAdminActivity } from "../../lib/activityLog.js";
import * as repo from "./hostels.repository.js";

/**
 * @param {import("zod").infer<typeof import("./hostels.validation.js").listHostelsQuerySchema>} q
 */
export async function listHostels(q) {
  const where = repo.buildHostelWhere(q);
  const orderBy = repo.hostelOrderBy(q.sort);
  const skip = (q.page - 1) * q.limit;
  const [total, items] = await Promise.all([
    repo.countHostels(where),
    repo.listHostels(where, orderBy, skip, q.limit),
  ]);
  return { items, total };
}

export async function getHostel(id) {
  const hostel = await repo.findHostel(id);
  if (!hostel) throw new HttpError(404, "Hostel not found");
  const occ = hostel.rooms.reduce((s, r) => s + r.current_occupancy, 0);
  const cap = hostel.rooms.reduce((s, r) => s + r.capacity, 0) || hostel.capacity;
  return { ...hostel, computedCapacity: cap, computedOccupancy: occ };
}

/**
 * @param {import("zod").infer<typeof import("./hostels.validation.js").createHostelSchema>} input
 * @param {string} adminId
 */
export async function createHostel(input, adminId) {
  const hostel = await prisma.hostel.create({
    data: {
      name: input.name,
      type: input.type,
      capacity: input.capacity,
      floor_count: input.floor_count,
    },
  });

  await logAdminActivity({
    type: "HOSTEL_CREATED",
    title: "Hostel created",
    metadata: { hostelId: hostel.id },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return hostel;
}

/**
 * @param {string} id
 * @param {import("zod").infer<typeof import("./hostels.validation.js").updateHostelSchema>} input
 * @param {string} adminId
 */
export async function updateHostel(id, input, adminId) {
  const hostel = await prisma.hostel.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      capacity: input.capacity ?? undefined,
      floor_count: input.floor_count ?? undefined,
    },
  });

  await logAdminActivity({
    type: "HOSTEL_UPDATED",
    title: "Hostel updated",
    metadata: { hostelId: id },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return hostel;
}

/**
 * @param {string} id
 * @param {import("@prisma/client").HostelStatus} status
 * @param {string} adminId
 */
export async function setHostelStatus(id, status, adminId) {
  const hostel = await prisma.hostel.update({ where: { id }, data: { status } });
  await logAdminActivity({
    type: "HOSTEL_STATUS",
    title: "Hostel status updated",
    metadata: { hostelId: id, status },
    actorId: adminId,
    actorType: "ADMIN",
  });
  return hostel;
}

export async function getOccupancy(id) {
  const hostel = await repo.findHostel(id);
  if (!hostel) throw new HttpError(404, "Hostel not found");
  const occ = hostel.rooms.reduce((s, r) => s + r.current_occupancy, 0);
  const cap = hostel.rooms.reduce((s, r) => s + r.capacity, 0) || hostel.capacity;
  return {
    hostelId: hostel.id,
    hostelName: hostel.name,
    capacity: cap,
    occupied: occ,
    occupancyPct: cap === 0 ? 0 : Math.round((100 * occ) / cap),
    rooms: hostel.rooms.map((r) => ({
      id: r.id,
      room_number: r.room_number,
      floor: r.floor,
      capacity: r.capacity,
      current_occupancy: r.current_occupancy,
      status: r.status,
    })),
  };
}

export async function listRooms(hostelId) {
  const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) throw new HttpError(404, "Hostel not found");
  return prisma.room.findMany({
    where: { hostel_id: hostelId },
    orderBy: [{ floor: "asc" }, { room_number: "asc" }],
  });
}

/**
 * @param {string} hostelId
 * @param {import("zod").infer<typeof import("./hostels.validation.js").createRoomSchema>} input
 * @param {string} adminId
 */
export async function createRoom(hostelId, input, adminId) {
  const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) throw new HttpError(404, "Hostel not found");

  const room = await prisma.room.create({
    data: {
      hostel_id: hostelId,
      room_number: input.room_number,
      capacity: input.capacity,
      floor: input.floor,
      x_position: input.x_position ?? 0,
      y_position: input.y_position ?? 0,
      layout_width: input.layout_width ?? 1,
      layout_height: input.layout_height ?? 1,
    },
  });

  await logAdminActivity({
    type: "ROOM_CREATED",
    title: "Room configured",
    metadata: { hostelId, roomId: room.id },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return room;
}

/**
 * @param {string} roomId
 * @param {import("zod").infer<typeof import("./hostels.validation.js").updateRoomSchema>} input
 * @param {string} adminId
 */
export async function updateRoom(roomId, input, adminId) {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      room_number: input.room_number ?? undefined,
      capacity: input.capacity ?? undefined,
      floor: input.floor ?? undefined,
      status: input.status ?? undefined,
      x_position: input.x_position ?? undefined,
      y_position: input.y_position ?? undefined,
      layout_width: input.layout_width ?? undefined,
      layout_height: input.layout_height ?? undefined,
    },
  });

  await logAdminActivity({
    type: "ROOM_UPDATED",
    title: "Room updated",
    metadata: { roomId },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return room;
}
