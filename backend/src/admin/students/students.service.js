import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logAdminActivity } from "../../lib/activityLog.js";
import * as repo from "./students.repository.js";

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
 * @param {import("zod").infer<typeof import("./students.validation.js").listStudentsQuerySchema>} query
 */
export async function listStudents(query) {
  const where = repo.buildStudentWhere(query);
  const orderBy = repo.orderByFromSort(query.sort);
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    repo.countStudents(where),
    repo.listStudents(where, orderBy, skip, query.limit),
  ]);
  return { items: rows, total };
}

export async function getStudent(id) {
  const student = await repo.findStudentById(id);
  if (!student) throw new HttpError(404, "Student not found");
  return student;
}

/**
 * @param {import("zod").infer<typeof import("./students.validation.js").createStudentSchema>} input
 * @param {string | undefined} adminActorId
 */
export async function createStudent(input, adminActorId) {
  const existing = await repo.findStudentByStudentId(input.student_id);
  if (existing) throw new HttpError(400, "Student ID already exists");

  const hostel = await repo.findHostelById(input.hostel_id);
  if (!hostel || hostel.status !== "ACTIVE") {
    throw new HttpError(400, "Invalid hostel");
  }
  assertHostelGender(hostel, input.gender);

  if (input.room_id) {
    const room = await repo.findRoomById(input.room_id);
    if (!room || room.hostel_id !== hostel.id) {
      throw new HttpError(400, "Room does not belong to selected hostel");
    }
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
        class_year: input.class_year ?? 11,
        course: input.course,
        phone: input.phone ?? null,
        parent_contact: input.parent_contact,
        hostel_id: input.hostel_id,
        room_id: input.room_id ?? null,
        status: input.status,
      },
      select: {
        id: true,
        student_id: true,
        name: true,
        gender: true,
        class_year: true,
        course: true,
        phone: true,
        parent_contact: true,
        status: true,
        hostel: { select: { id: true, name: true, type: true } },
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

  await logAdminActivity({
    type: "STUDENT_CREATED",
    title: "New student added",
    metadata: { studentId: student.student_id, name: student.name },
    actorId: adminActorId ?? null,
    actorType: adminActorId ? "ADMIN" : "SYSTEM",
  });

  return student;
}

/**
 * @param {string} id
 * @param {import("zod").infer<typeof import("./students.validation.js").updateStudentSchema>} input
 * @param {string | undefined} adminActorId
 */
export async function updateStudent(id, input, adminActorId) {
  const current = await prisma.student.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Student not found");

  if (input.student_id && input.student_id !== current.student_id) {
    const clash = await repo.findStudentByStudentId(input.student_id);
    if (clash) throw new HttpError(400, "Student ID already exists");
  }

  const nextHostelId = input.hostel_id ?? current.hostel_id;
  const hostel = await repo.findHostelById(nextHostelId);
  if (!hostel) throw new HttpError(400, "Invalid hostel");

  const nextGender = input.gender ?? current.gender;
  assertHostelGender(hostel, nextGender);

  if (input.hostel_id && input.hostel_id !== current.hostel_id && current.room_id) {
    throw new HttpError(400, "Transfer or clear room before changing hostel");
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      student_id: input.student_id ?? undefined,
      name: input.name ?? undefined,
      gender: input.gender ?? undefined,
      class_year: input.class_year ?? undefined,
      course: input.course ?? undefined,
      phone: input.phone === null ? null : input.phone ?? undefined,
      parent_contact: input.parent_contact ?? undefined,
      hostel_id: input.hostel_id ?? undefined,
      status: input.status ?? undefined,
    },
    select: {
      id: true,
      student_id: true,
      name: true,
      gender: true,
      class_year: true,
      course: true,
      phone: true,
      parent_contact: true,
      status: true,
      hostel: { select: { id: true, name: true, type: true } },
      room: { select: { id: true, room_number: true } },
    },
  });

  await logAdminActivity({
    type: "STUDENT_UPDATED",
    title: "Student updated",
    metadata: { studentId: updated.student_id },
    actorId: adminActorId ?? null,
    actorType: adminActorId ? "ADMIN" : "SYSTEM",
  });

  return updated;
}

/**
 * @param {string} studentId
 * @param {string} nextRoomId
 * @param {string | undefined} adminActorId
 */
export async function transferStudentRoom(studentId, nextRoomId, adminActorId) {
  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) throw new HttpError(404, "Student not found");

    if (student.room_id === nextRoomId) {
      throw new HttpError(400, "Student is already in this room");
    }

    const nextRoom = await tx.room.findUnique({ where: { id: nextRoomId } });
    if (!nextRoom || nextRoom.hostel_id !== student.hostel_id) {
      throw new HttpError(400, "Room must belong to the same hostel");
    }
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

  await logAdminActivity({
    type: "STUDENT_TRANSFERRED",
    title: "Student transferred between rooms",
    metadata: { studentId },
    actorId: adminActorId ?? null,
    actorType: adminActorId ? "ADMIN" : "SYSTEM",
  });

  return getStudent(studentId);
}

/**
 * @param {string} id
 * @param {import("@prisma/client").StudentStatus} status
 * @param {string | undefined} adminActorId
 */
export async function setStudentStatus(id, status, adminActorId) {
  const current = await prisma.student.findUnique({
    where: { id },
    select: { id: true, room_id: true, status: true },
  });
  if (!current) throw new HttpError(404, "Student not found");

  await prisma.$transaction(async (tx) => {
    const wasSheltered =
      current.status === "ACTIVE" || current.status === "ON_LEAVE";
    const becomesInactive = status === "INACTIVE";

    if (wasSheltered && becomesInactive && current.room_id) {
      await tx.room.update({
        where: { id: current.room_id },
        data: { current_occupancy: { decrement: 1 } },
      });
      await tx.student.update({
        where: { id },
        data: { status, room_id: null },
      });
      return;
    }

    await tx.student.update({ where: { id }, data: { status } });
  });

  await logAdminActivity({
    type: "STUDENT_STATUS",
    title: "Student status updated",
    metadata: { studentId: id, status },
    actorId: adminActorId ?? null,
    actorType: adminActorId ? "ADMIN" : "SYSTEM",
  });

  return getStudent(id);
}
