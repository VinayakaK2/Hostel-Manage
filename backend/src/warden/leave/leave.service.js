import { prisma } from "../../lib/prisma.js";

/**
 * @param {string} ymd
 */
function parseUtcDateOnly(ymd) {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * @param {import("zod").infer<typeof import("./leave.validation.js").listLeaveRecordsQuerySchema>} query
 * @param {string} hostelId
 */
export async function listLeaveRecords(query, hostelId) {
  /** @type {import("@prisma/client").Prisma.AttendanceWhereInput} */
  const where = {
    status: "LEAVE",
    student: {
      hostel_id: hostelId,
      ...(query.student_status ? { status: query.student_status } : {}),
    },
  };

  if (query.date_from || query.date_to) {
    where.attendance_date = {};
    if (query.date_from) {
      where.attendance_date.gte = parseUtcDateOnly(query.date_from);
    }
    if (query.date_to) {
      where.attendance_date.lte = parseUtcDateOnly(query.date_to);
    }
  }

  if (query.student_id) {
    where.student_id = query.student_id;
  }

  if (query.leave_type) {
    where.leave_reason = { contains: query.leave_type, mode: "insensitive" };
  }

  const orderBy =
    query.sort === "date_asc" ? { attendance_date: "asc" } : { attendance_date: "desc" };

  const skip = (query.page - 1) * query.limit;
  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      select: {
        id: true,
        attendance_date: true,
        leave_reason: true,
        created_at: true,
        student: {
          select: {
            id: true,
            student_id: true,
            name: true,
            course: true,
            status: true,
            room: { select: { room_number: true } },
          },
        },
      },
    }),
  ]);

  return { total, items };
}
