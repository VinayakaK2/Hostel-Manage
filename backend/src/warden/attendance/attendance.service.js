import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logWardenActivity } from "../../lib/wardenActivityLog.js";

/**
 * @param {string} ymd
 */
function parseUtcDateOnly(ymd) {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  if (!y || !m || !d) throw new HttpError(400, "Invalid date");
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * @param {Date} d
 */
function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @param {string} ymd
 */
export function assertNotFutureDate(ymd) {
  const target = parseUtcDateOnly(ymd);
  const today = utcDateOnly(new Date());
  if (target.getTime() > today.getTime()) {
    throw new HttpError(400, "Future attendance dates are not allowed");
  }
  return target;
}

/**
 * @param {string} hostelId
 * @param {Date} attendanceDate
 */
export async function listStudentsWithAttendance(hostelId, attendanceDate) {
  const students = await prisma.student.findMany({
    where: {
      hostel_id: hostelId,
      status: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      student_id: true,
      name: true,
      course: true,
      status: true,
      room: { select: { room_number: true } },
    },
  });

  const ids = students.map((s) => s.id);
  let attMap = new Map();
  if (ids.length) {
    const rows = await prisma.attendance.findMany({
      where: { student_id: { in: ids }, attendance_date: attendanceDate },
      select: { student_id: true, status: true, leave_reason: true },
    });
    attMap = new Map(rows.map((r) => [r.student_id, r]));
  }

  return students.map((s) => {
    const a = attMap.get(s.id);
    return {
      ...s,
      attendance: a
        ? { status: a.status, leave_reason: a.leave_reason }
        : null,
    };
  });
}

/**
 * @param {string} studentId
 * @param {string} hostelId
 * @param {{ page: number; limit: number }} paging
 */
export async function listAttendanceForStudent(studentId, hostelId, paging) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, hostel_id: hostelId },
    select: { id: true },
  });
  if (!student) throw new HttpError(404, "Student not found");

  const where = { student_id: studentId };
  const skip = (paging.page - 1) * paging.limit;
  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { attendance_date: "desc" },
      skip,
      take: paging.limit,
      select: {
        id: true,
        attendance_date: true,
        status: true,
        leave_reason: true,
        remark: true,
        created_at: true,
      },
    }),
  ]);
  return { total, items };
}

/**
 * @param {import("zod").infer<typeof import("./attendance.validation.js").submitAttendanceSchema>} input
 * @param {string} hostelId
 * @param {string} wardenId
 */
export async function submitAttendance(input, hostelId, wardenId) {
  const attendanceDate = assertNotFutureDate(input.date);
  const studentIds = [...new Set(input.entries.map((e) => e.student_id))];

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, hostel_id: hostelId },
    select: { id: true, status: true },
  });
  const byId = new Map(students.map((s) => [s.id, s]));
  for (const sid of studentIds) {
    const s = byId.get(sid);
    if (!s) throw new HttpError(400, "Student not in your hostel");
    if (s.status === "INACTIVE") {
      throw new HttpError(400, "Disabled students cannot receive attendance");
    }
  }

  let absentCount = 0;
  let leaveCount = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const entry of input.entries) {
          const leaveReason = entry.status === "LEAVE" ? entry.leave_reason?.trim() ?? null : null;

          const row = await tx.attendance.upsert({
            where: {
              student_id_attendance_date: {
                student_id: entry.student_id,
                attendance_date: attendanceDate,
              },
            },
            create: {
              student_id: entry.student_id,
              attendance_date: attendanceDate,
              status: entry.status,
              leave_reason: leaveReason,
              marked_by_id: wardenId,
            },
            update: {
              status: entry.status,
              leave_reason: leaveReason,
              marked_by_id: wardenId,
            },
            select: { id: true, status: true, student_id: true },
          });

          if (row.status === "ABSENT") {
            absentCount += 1;
            const processAfter = new Date(Date.now() + 30 * 60 * 1000);
            await tx.absentParentNotificationJob.upsert({
              where: { attendance_id: row.id },
              create: {
                hostel_id: hostelId,
                student_id: row.student_id,
                attendance_id: row.id,
                attendance_date: attendanceDate,
                state: "QUEUED",
                process_after: processAfter,
              },
              update: {
                state: "QUEUED",
                process_after: processAfter,
                attempt_count: 0,
                last_error: null,
              },
            });
          } else {
            await tx.absentParentNotificationJob.updateMany({
              where: { attendance_id: row.id, state: "QUEUED" },
              data: { state: "CANCELLED", last_error: null },
            });
          }

          if (row.status === "LEAVE") {
            leaveCount += 1;
          }
        }
      },
      {
        maxWait: 8000,
        timeout: 20000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new HttpError(409, "Duplicate attendance write detected. Please refresh and try again.");
      }
    }
    throw e;
  }

  if (absentCount > 0) {
    await prisma.wardenNotification.create({
      data: {
        hostel_id: hostelId,
        category: "ATTENDANCE_ALERT",
        title: "Absences recorded",
        message: `${absentCount} student(s) marked absent. Parent notifications are queued for 30 minutes unless updated.`,
        read: false,
        metadata: { date: input.date, count: absentCount },
      },
    });
  }

  if (leaveCount > 0) {
    await prisma.wardenNotification.create({
      data: {
        hostel_id: hostelId,
        category: "LEAVE_ALERT",
        title: "Leave entries saved",
        message: `${leaveCount} student(s) marked on leave for ${input.date}.`,
        read: false,
        metadata: { date: input.date, count: leaveCount },
      },
    });
  }

  await logWardenActivity({
    hostelId,
    type: "ATTENDANCE_SUBMITTED",
    title: "Attendance submitted",
    metadata: { date: input.date, count: input.entries.length },
    actorId: wardenId,
  });

  return { date: input.date, saved: input.entries.length };
}
