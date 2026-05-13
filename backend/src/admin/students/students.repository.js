import { prisma } from "../../lib/prisma.js";

/**
 * @param {import("zod").infer<typeof import("./students.validation.js").listStudentsQuerySchema>} query
 */
export function buildStudentWhere(query) {
  /** @type {import("@prisma/client").Prisma.StudentWhereInput} */
  const where = {};
  if (query.gender) {
    const g = query.gender;
    where.gender = g === "BOYS" ? "MALE" : g === "GIRLS" ? "FEMALE" : g;
  }
  if (query.class !== undefined) where.class_year = query.class;
  if (query.status) where.status = query.status;
  if (query.hostelId) where.hostel_id = query.hostelId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { student_id: { contains: query.search, mode: "insensitive" } },
      { course: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return where;
}

/** @param {import("zod").infer<typeof import("./students.validation.js").listStudentsQuerySchema>["sort"]} sort */
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
 * @param {import("@prisma/client").Prisma.StudentWhereInput} where
 */
export async function countStudents(where) {
  return prisma.student.count({ where });
}

/**
 * @param {import("@prisma/client").Prisma.StudentWhereInput} where
 * @param {import("@prisma/client").Prisma.StudentOrderByWithRelationInput} orderBy
 * @param {number} skip
 * @param {number} take
 */
export async function listStudents(where, orderBy, skip, take) {
  return prisma.student.findMany({
    where,
    orderBy,
    skip,
    take,
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
      created_at: true,
      hostel: { select: { id: true, name: true, type: true } },
      room: { select: { id: true, room_number: true } },
    },
  });
}

export async function findStudentById(id) {
  return prisma.student.findUnique({
    where: { id },
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
      created_at: true,
      updated_at: true,
      hostel: { select: { id: true, name: true, type: true } },
      room: {
        select: {
          id: true,
          room_number: true,
          capacity: true,
          current_occupancy: true,
        },
      },
    },
  });
}

export async function findHostelById(id) {
  return prisma.hostel.findUnique({ where: { id } });
}

export async function findRoomById(id) {
  return prisma.room.findUnique({
    where: { id },
    include: { hostel: true },
  });
}

export async function findStudentByStudentId(studentId) {
  return prisma.student.findUnique({ where: { student_id: studentId } });
}
