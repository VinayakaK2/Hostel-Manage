import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logWardenActivity } from "../../lib/wardenActivityLog.js";
import { prismaOrFallback } from "../../lib/optionalDb.js";

/**
 * @param {import("zod").infer<typeof import("./observations.validation.js").listObservationsQuerySchema>} query
 * @param {string} hostelId
 */
export async function listObservations(query, hostelId) {
  /** @type {import("@prisma/client").Prisma.StudyObservationWhereInput} */
  const where = { hostel_id: hostelId };
  if (query.student_id) where.student_id = query.student_id;
  if (query.severity) where.severity = query.severity;
  if (query.search) {
    where.OR = [
      { note: { contains: query.search, mode: "insensitive" } },
      { student: { name: { contains: query.search, mode: "insensitive" } } },
      { student: { student_id: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  const orderBy =
    query.sort === "created_asc" ? { created_at: "asc" } : { created_at: "desc" };
  const skip = (query.page - 1) * query.limit;
  return prismaOrFallback(async () => {
    const [total, items] = await Promise.all([
      prisma.studyObservation.count({ where }),
      prisma.studyObservation.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        select: {
          id: true,
          note: true,
          severity: true,
          created_at: true,
          updated_at: true,
          student: { select: { id: true, student_id: true, name: true, course: true } },
          created_by: { select: { id: true, name: true } },
        },
      }),
    ]);
    return { total, items };
  }, { total: 0, items: [] });
}

/**
 * @param {import("zod").infer<typeof import("./observations.validation.js").createObservationSchema>} input
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function createObservation(input, hostelId, wardenId) {
  const student = await prisma.student.findFirst({
    where: { id: input.student_id, hostel_id: hostelId },
    select: { id: true, student_id: true, name: true },
  });
  if (!student) throw new HttpError(404, "Student not found");

  const obs = await prisma.studyObservation.create({
    data: {
      hostel_id: hostelId,
      student_id: input.student_id,
      note: input.note,
      severity: input.severity,
      created_by_id: wardenId,
    },
    select: {
      id: true,
      note: true,
      severity: true,
      created_at: true,
      updated_at: true,
      student: { select: { id: true, student_id: true, name: true, course: true } },
      created_by: { select: { id: true, name: true } },
    },
  });

  await logWardenActivity({
    hostelId,
    type: "OBSERVATION_ADDED",
    title: "Study observation added",
    metadata: { observationId: obs.id, studentId: student.student_id, severity: obs.severity },
    actorId: wardenId,
  });

  if (input.severity === "HIGH") {
    await prisma.wardenNotification.create({
      data: {
        hostel_id: hostelId,
        category: "SYSTEM",
        title: "High severity observation",
        message: `Observation logged for ${student.name}.`,
        read: false,
        metadata: { observationId: obs.id, studentId: student.id },
      },
    });
  }

  return obs;
}

/**
 * @param {string} id
 * @param {import("zod").infer<typeof import("./observations.validation.js").updateObservationSchema>} input
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function updateObservation(id, input, hostelId, wardenId) {
  const existing = await prisma.studyObservation.findFirst({
    where: { id, hostel_id: hostelId },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, "Observation not found");

  const obs = await prisma.studyObservation.update({
    where: { id },
    data: {
      note: input.note ?? undefined,
      severity: input.severity ?? undefined,
    },
    select: {
      id: true,
      note: true,
      severity: true,
      created_at: true,
      updated_at: true,
      student: { select: { id: true, student_id: true, name: true, course: true } },
      created_by: { select: { id: true, name: true } },
    },
  });

  await logWardenActivity({
    hostelId,
    type: "OBSERVATION_UPDATED",
    title: "Study observation updated",
    metadata: { observationId: obs.id },
    actorId: wardenId,
  });

  return obs;
}
