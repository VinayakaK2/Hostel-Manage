import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";

/** @typedef {"EMPTY"|"PARTIAL"|"FULL"|"MAINTENANCE"|"LOCKED"} BlueprintDisplayStatus */

/**
 * @param {import("@prisma/client").Room} room
 * @param {number} occ
 * @returns {BlueprintDisplayStatus}
 */
export function deriveDisplayStatus(room, occ) {
  if (room.status === "MAINTENANCE") return "MAINTENANCE";
  if (room.status === "INACTIVE") return "LOCKED";
  if (occ <= 0) return "EMPTY";
  if (occ >= room.capacity) return "FULL";
  return "PARTIAL";
}

/**
 * @param {import("@prisma/client").Room} room
 */
function clampOccupancy(room) {
  const raw = Number(room.current_occupancy) || 0;
  return Math.max(0, Math.min(raw, room.capacity));
}

/**
 * @param {string} a
 * @param {string} b
 */
function compareRoomNumber(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * @param {{ x: number; y: number; width: number; height: number }[]} layouts
 */
function hasCollision(layouts) {
  const cells = new Set();
  for (const r of layouts) {
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const k = `${r.x + dx},${r.y + dy}`;
        if (cells.has(k)) return true;
        cells.add(k);
      }
    }
  }
  return false;
}

/**
 * @param {number} roomCount
 */
function pickColumnCount(roomCount) {
  if (roomCount <= 1) return 1;
  if (roomCount <= 10) return 2;
  if (roomCount <= 30) return 3;
  if (roomCount <= 60) return 4;
  return Math.min(6, Math.ceil(Math.sqrt(roomCount)));
}

/**
 * @param {import("@prisma/client").Room[]} rooms
 */
function buildLayoutsFromDatabase(rooms) {
  return rooms.map((r) => ({
    id: r.id,
    x: r.x_position,
    y: r.y_position,
    width: Math.max(1, r.layout_width),
    height: Math.max(1, r.layout_height),
  }));
}

/**
 * @param {import("@prisma/client").Room[]} roomsSorted
 * @param {number} cols
 */
function autoLayouts(roomsSorted, cols) {
  const c = Math.max(1, cols);
  return roomsSorted.map((r, i) => ({
    id: r.id,
    x: i % c,
    y: Math.floor(i / c),
    width: 1,
    height: 1,
  }));
}

/**
 * Decide whether stored coordinates are trustworthy for this floor.
 * @param {import("@prisma/client").Room[]} rooms
 */
function shouldUseAutoLayout(rooms) {
  if (rooms.length === 0) return false;
  const layouts = buildLayoutsFromDatabase(rooms);
  for (const L of layouts) {
    if (L.x < 0 || L.y < 0 || L.width < 1 || L.height < 1 || L.width > 20 || L.height > 20) {
      return true;
    }
  }
  if (rooms.length > 1 && rooms.every((r) => r.x_position === 0 && r.y_position === 0)) {
    return true;
  }
  if (hasCollision(layouts)) return true;
  return false;
}

/**
 * @param {import("@prisma/client").Room[]} rooms
 * @param {{ x: number; y: number; width: number; height: number; id: string }[]} layouts
 */
function computeGridMetrics(rooms, layouts) {
  let maxX = 0;
  let maxY = 0;
  const byId = new Map(layouts.map((l) => [l.id, l]));
  for (const r of rooms) {
    const L = byId.get(r.id);
    if (!L) continue;
    maxX = Math.max(maxX, L.x + L.width);
    maxY = Math.max(maxY, L.y + L.height);
  }
  return { columns: maxX, rows: maxY };
}

/**
 * @param {string} hostelId
 */
export async function getBlueprintOverview(hostelId) {
  const hostel = await prisma.hostel.findFirst({
    where: { id: hostelId, status: "ACTIVE" },
    select: { id: true, name: true, floor_count: true },
  });
  if (!hostel) throw new HttpError(404, "Hostel not found");

  const grouped = await prisma.room.groupBy({
    by: ["floor"],
    where: {
      hostel_id: hostelId,
      status: { in: ["ACTIVE", "MAINTENANCE", "INACTIVE"] },
    },
    _count: { _all: true },
  });

  const countByFloor = new Map(grouped.map((g) => [g.floor, g._count._all]));
  const floors = [];
  for (let f = 1; f <= hostel.floor_count; f++) {
    floors.push({ floor: f, room_count: countByFloor.get(f) ?? 0 });
  }

  const defaultFloor =
    floors.find((fl) => fl.room_count > 0)?.floor ?? (floors[0]?.floor ?? 1);

  return {
    hostel: {
      id: hostel.id,
      name: hostel.name,
      floor_count: hostel.floor_count,
    },
    floors,
    default_floor: defaultFloor,
  };
}

/**
 * @param {string} hostelId
 * @param {number} floor
 */
export async function getBlueprintFloor(hostelId, floor) {
  if (!Number.isFinite(floor) || floor < 0 || floor > 200) {
    throw new HttpError(400, "Invalid floor");
  }

  const hostel = await prisma.hostel.findFirst({
    where: { id: hostelId, status: "ACTIVE" },
    select: { id: true, name: true, floor_count: true },
  });
  if (!hostel) throw new HttpError(404, "Hostel not found");

  const rooms = await prisma.room.findMany({
    where: {
      hostel_id: hostelId,
      floor,
      status: { in: ["ACTIVE", "MAINTENANCE", "INACTIVE"] },
    },
    orderBy: { room_number: "asc" },
  });

  const sorted = [...rooms].sort((a, b) => compareRoomNumber(a.room_number, b.room_number));
  const useAuto = shouldUseAutoLayout(sorted);
  const cols = pickColumnCount(sorted.length);
  const layouts = useAuto ? autoLayouts(sorted, cols) : buildLayoutsFromDatabase(sorted);
  const { columns, rows } = computeGridMetrics(sorted, layouts);
  const layoutById = new Map(layouts.map((l) => [l.id, l]));

  const previewMap = await occupantPreviewByRoom(sorted.map((r) => r.id));

  const payloadRooms = sorted.map((r) => {
    const occ = clampOccupancy(r);
    const L = layoutById.get(r.id);
    const preview = (previewMap.get(r.id) ?? []).slice(0, 8);
    return {
      id: r.id,
      room_number: r.room_number,
      floor: r.floor,
      x: L?.x ?? 0,
      y: L?.y ?? 0,
      width: L?.width ?? 1,
      height: L?.height ?? 1,
      capacity: r.capacity,
      occupancy: occ,
      room_status: r.status,
      display_status: deriveDisplayStatus(r, occ),
      occupant_preview: preview,
    };
  });

  return {
    hostel: { id: hostel.id, name: hostel.name, floor_count: hostel.floor_count },
    floor,
    grid: {
      columns,
      rows,
      layout_source: useAuto ? "AUTO" : "DATABASE",
      suggested_columns: cols,
    },
    rooms: payloadRooms,
  };
}

function utcToday() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @param {string} name
 */
function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * @param {string[]} roomIds
 */
async function occupantPreviewByRoom(roomIds) {
  /** @type {Map<string, { initials: string; attendance_today: string | null }[]>} */
  const byRoom = new Map();
  if (!roomIds.length) return byRoom;

  const studs = await prisma.student.findMany({
    where: {
      room_id: { in: roomIds },
      status: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    select: { id: true, room_id: true, name: true },
    orderBy: { name: "asc" },
  });

  const today = utcToday();
  const studIds = studs.map((s) => s.id);
  /** @type {Map<string, import("@prisma/client").AttendanceStatus>} */
  const attMap = new Map();
  if (studIds.length) {
    const marks = await prisma.attendance.findMany({
      where: { student_id: { in: studIds }, attendance_date: today },
      select: { student_id: true, status: true },
    });
    for (const m of marks) attMap.set(m.student_id, m.status);
  }

  for (const s of studs) {
    const rid = s.room_id;
    if (!rid) continue;
    const row = {
      initials: initialsFromName(s.name),
      attendance_today: attMap.get(s.id) ?? null,
    };
    if (!byRoom.has(rid)) byRoom.set(rid, []);
    byRoom.get(rid).push(row);
  }

  for (const [, rows] of byRoom) {
    rows.sort((a, b) => a.initials.localeCompare(b.initials));
  }

  return byRoom;
}

/**
 * @param {string} roomId
 * @param {string} hostelId
 */
export async function getRoomBlueprintDetail(roomId, hostelId) {
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      hostel_id: hostelId,
      status: { in: ["ACTIVE", "MAINTENANCE", "INACTIVE"] },
    },
    include: {
      students: {
        where: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
        select: {
          id: true,
          student_id: true,
          name: true,
          course: true,
          phone: true,
          status: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!room) throw new HttpError(404, "Room not found");

  const occ = clampOccupancy(room);
  const today = utcToday();
  const studentIds = room.students.map((s) => s.id);

  /** @type {Map<string, import("@prisma/client").AttendanceStatus>} */
  const attendanceByStudent = new Map();
  if (studentIds.length) {
    const marks = await prisma.attendance.findMany({
      where: {
        student_id: { in: studentIds },
        attendance_date: today,
      },
      select: { student_id: true, status: true },
    });
    for (const m of marks) attendanceByStudent.set(m.student_id, m.status);
  }

  let present = 0;
  let absent = 0;
  let leave = 0;
  for (const s of room.students) {
    const st = attendanceByStudent.get(s.id);
    if (st === "PRESENT") present++;
    else if (st === "ABSENT") absent++;
    else if (st === "LEAVE") leave++;
  }

  const students = room.students.map((s) => ({
    id: s.id,
    student_id: s.student_id,
    name: s.name,
    course: s.course,
    phone: s.phone,
    status: s.status,
    attendance_status_today: attendanceByStudent.get(s.id) ?? null,
  }));

  return {
    room: {
      id: room.id,
      room_number: room.room_number,
      floor: room.floor,
      capacity: room.capacity,
      occupancy: occ,
      room_status: room.status,
      display_status: deriveDisplayStatus(room, occ),
      x_position: room.x_position,
      y_position: room.y_position,
      width: Math.max(1, room.layout_width),
      height: Math.max(1, room.layout_height),
    },
    attendance_snapshot: {
      date: today.toISOString().slice(0, 10),
      present,
      absent,
      leave,
      unmarked: Math.max(0, room.students.length - present - absent - leave),
    },
    students,
  };
}
