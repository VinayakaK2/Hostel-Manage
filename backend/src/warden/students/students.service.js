import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logWardenActivity } from "../../lib/wardenActivityLog.js";

/**
 * @param {import("@prisma/client").Hostel} hostel
 * @param {import("@prisma/client").StudentGender} gender
 */
function assertHostelGender(hostel, gender) {
  if (hostel.type === "BOYS" && gender !== "MALE") {
    throw new HttpError(400, "Boys hostels can only house male students");
  }
  if (hostel.type === "GIRLS" && gender !== "FEMALE") {
    throw new HttpError(400, "Girls hostels can only house female students");
  }
}

/**
 * @param {string} hostelId
 * @param {string | null | undefined} phone
 * @param {string | undefined} excludeStudentId
 */
async function assertUniquePhone(hostelId, phone, excludeStudentId) {
  if (!phone) return;
  const clash = await prisma.student.findFirst({
    where: {
      hostel_id: hostelId,
      phone,
      ...(excludeStudentId ? { NOT: { id: excludeStudentId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new HttpError(400, "Phone number already in use for this hostel");
}

/**
 * @param {import("zod").infer<typeof import("./students.validation.js").listWardenStudentsQuerySchema>} query
 * @param {string} hostelId
 */
export function buildWhere(query, hostelId) {
  /** @type {import("@prisma/client").Prisma.StudentWhereInput} */
  const where = { hostel_id: hostelId };
  if (query.gender) where.gender = query.gender;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { student_id: { contains: query.search, mode: "insensitive" } },
      { course: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return where;
}

/** @param {"name_asc"|"name_desc"|"created_desc"|"created_asc"} sort */
export function orderByFromSort(sort) {
  switch (sort) {
    case "name_desc":
      return { name: "desc" };
    case "created_desc":
      return { created_at: "desc" };
    case "created_asc":
      return { created_at: "asc" };
    case "name_asc":
    default:
      return { name: "asc" };
  }
}

/**
 * @param {import("zod").infer<typeof import("./students.validation.js").listWardenStudentsQuerySchema>} query
 * @param {string} hostelId
 */
export async function listStudents(query, hostelId) {
  const where = buildWhere(query, hostelId);
  const orderBy = orderByFromSort(query.sort);
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      select: {
        id: true,
        student_id: true,
        name: true,
        gender: true,
        course: true,
        phone: true,
        parent_contact: true,
        status: true,
        created_at: true,
        room: { select: { id: true, room_number: true } },
      },
    }),
  ]);

  const studentIds = rows.map((r) => r.id);
  const today = utcDateOnly(new Date());
  let attendanceMap = new Map();
  if (studentIds.length) {
    const att = await prisma.attendance.findMany({
      where: { student_id: { in: studentIds }, attendance_date: today },
      select: { student_id: true, status: true },
    });
    attendanceMap = new Map(att.map((a) => [a.student_id, a.status]));
  }

  const items = rows.map((r) => ({
    ...r,
    attendance_status_today: attendanceMap.get(r.id) ?? null,
  }));

  return { items, total };
}

/**
 * @param {string} id
 * @param {string} hostelId
 */
export async function getStudent(id, hostelId) {
  const student = await prisma.student.findFirst({
    where: { id, hostel_id: hostelId },
    select: {
      id: true,
      student_id: true,
      name: true,
      gender: true,
      course: true,
      phone: true,
      parent_contact: true,
      status: true,
      created_at: true,
      updated_at: true,
      room: {
        select: {
          id: true,
          room_number: true,
          capacity: true,
          current_occupancy: true,
          status: true,
        },
      },
    },
  });
  if (!student) throw new HttpError(404, "Student not found");
  return student;
}

/**
 * @param {import("zod").infer<typeof import("./students.validation.js").createWardenStudentSchema>} input
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function createStudent(input, hostelId, wardenId) {
  const existing = await prisma.student.findUnique({ where: { student_id: input.student_id } });
  if (existing) throw new HttpError(400, "Student ID already exists");

  const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel || hostel.status !== "ACTIVE") throw new HttpError(400, "Invalid hostel");
  assertHostelGender(hostel, input.gender);
  await assertUniquePhone(hostelId, input.phone ?? null, undefined);

  if (input.room_id) {
    const room = await prisma.room.findFirst({
      where: { id: input.room_id, hostel_id: hostelId },
    });
    if (!room) throw new HttpError(400, "Room does not belong to your hostel");
    if (room.status !== "ACTIVE") throw new HttpError(400, "Room is not active");
    if (room.current_occupancy >= room.capacity) {
      throw new HttpError(400, "Room is at full capacity");
    }
  }

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: {
        student_id: input.student_id,
        name: input.name,
        gender: input.gender,
        course: input.course,
        phone: input.phone ?? null,
        parent_contact: input.parent_contact,
        hostel_id: hostelId,
        room_id: input.room_id ?? null,
        status: input.status,
      },
      select: {
        id: true,
        student_id: true,
        name: true,
        gender: true,
        course: true,
        phone: true,
        parent_contact: true,
        status: true,
        room: { select: { id: true, room_number: true } },
      },
    });

    if (input.room_id) {
      await tx.room.update({
        where: { id: input.room_id },
        data: { current_occupancy: { increment: 1 } },
      });
    }

    return created;
  });

  await logWardenActivity({
    hostelId,
    type: "STUDENT_ADDED",
    title: "Student added",
    metadata: { studentId: student.student_id, name: student.name },
    actorId: wardenId,
  });

  return student;
}

/**
 * @param {string} id
 * @param {import("zod").infer<typeof import("./students.validation.js").updateWardenStudentSchema>} input
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function updateStudent(id, input, hostelId, wardenId) {
  const current = await prisma.student.findFirst({ where: { id, hostel_id: hostelId } });
  if (!current) throw new HttpError(404, "Student not found");

  if (input.student_id && input.student_id !== current.student_id) {
    const clash = await prisma.student.findUnique({ where: { student_id: input.student_id } });
    if (clash) throw new HttpError(400, "Student ID already exists");
  }

  const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) throw new HttpError(400, "Invalid hostel");

  const nextGender = input.gender ?? current.gender;
  assertHostelGender(hostel, nextGender);

  const nextPhone = input.phone === undefined ? current.phone : input.phone;
  await assertUniquePhone(hostelId, nextPhone, id);

  const updated = await prisma.student.update({
    where: { id },
    data: {
      student_id: input.student_id ?? undefined,
      name: input.name ?? undefined,
      gender: input.gender ?? undefined,
      course: input.course ?? undefined,
      phone: input.phone === null ? null : input.phone ?? undefined,
      parent_contact: input.parent_contact ?? undefined,
      status: input.status ?? undefined,
    },
    select: {
      id: true,
      student_id: true,
      name: true,
      gender: true,
      course: true,
      phone: true,
      parent_contact: true,
      status: true,
      room: { select: { id: true, room_number: true } },
    },
  });

  await logWardenActivity({
    hostelId,
    type: "STUDENT_UPDATED",
    title: "Student updated",
    metadata: { studentId: updated.student_id },
    actorId: wardenId,
  });

  return updated;
}

/**
 * @param {string} studentId
 * @param {string} nextRoomId
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function transferStudentRoom(studentId, nextRoomId, hostelId, wardenId) {
  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: studentId, hostel_id: hostelId },
    });
    if (!student) throw new HttpError(404, "Student not found");
    if (student.status === "INACTIVE") {
      throw new HttpError(400, "Cannot transfer room for inactive student");
    }

    if (student.room_id === nextRoomId) {
      throw new HttpError(400, "Student is already in this room");
    }

    const nextRoom = await tx.room.findFirst({
      where: { id: nextRoomId, hostel_id: hostelId },
    });
    if (!nextRoom) throw new HttpError(400, "Room must belong to your hostel");
    if (nextRoom.status !== "ACTIVE") throw new HttpError(400, "Room is not active");
    if (nextRoom.current_occupancy >= nextRoom.capacity) {
      throw new HttpError(400, "Room is at full capacity");
    }

    if (student.room_id) {
      await tx.room.update({
        where: { id: student.room_id },
        data: { current_occupancy: { decrement: 1 } },
      });
    }

    await tx.room.update({
      where: { id: nextRoomId },
      data: { current_occupancy: { increment: 1 } },
    });

    await tx.student.update({
      where: { id: studentId },
      data: { room_id: nextRoomId },
    });
  });

  await logWardenActivity({
    hostelId,
    type: "STUDENT_ROOM_TRANSFER",
    title: "Room transfer",
    metadata: { studentId },
    actorId: wardenId,
  });

  return getStudent(studentId, hostelId);
}

/**
 * @param {string} id
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function disableStudent(id, hostelId, wardenId) {
  const current = await prisma.student.findFirst({
    where: { id, hostel_id: hostelId },
    select: { id: true, room_id: true, status: true },
  });
  if (!current) throw new HttpError(404, "Student not found");

  await prisma.$transaction(async (tx) => {
    const wasSheltered = current.status === "ACTIVE" || current.status === "ON_LEAVE";
    if (wasSheltered && current.room_id) {
      await tx.room.update({
        where: { id: current.room_id },
        data: { current_occupancy: { decrement: 1 } },
      });
      await tx.student.update({
        where: { id },
        data: { status: "INACTIVE", room_id: null },
      });
      return;
    }
    await tx.student.update({ where: { id }, data: { status: "INACTIVE" } });
  });

  await logWardenActivity({
    hostelId,
    type: "STUDENT_DISABLED",
    title: "Student disabled",
    metadata: { studentId: id },
    actorId: wardenId,
  });

  return getStudent(id, hostelId);
}

/**
 * @param {string} hostelId
 */
export async function listRooms(hostelId) {
  return prisma.room.findMany({
    where: { hostel_id: hostelId, status: "ACTIVE" },
    orderBy: { room_number: "asc" },
    select: {
      id: true,
      room_number: true,
      capacity: true,
      current_occupancy: true,
      floor: true,
      status: true,
    },
  });
}

function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
