import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";

function parseDay(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

/**
 * @param {import("zod").infer<typeof import("./reports.validation.js").reportsSummaryQuerySchema>} q
 */
export async function getSummary(q) {
  const from = parseDay(q.from);
  const to = parseDay(q.to);
  if (from.getTime() > to.getTime()) throw new HttpError(400, "Invalid date range");

  const hostelFilter = q.hostelId ? { id: q.hostelId } : {};

  const hostels = await prisma.hostel.findMany({
    where: hostelFilter,
    include: { rooms: true },
  });

  const occupancyReport = hostels.map((h) => {
    const cap = h.rooms.reduce((s, r) => s + r.capacity, 0) || h.capacity;
    const occ = h.rooms.reduce((s, r) => s + r.current_occupancy, 0);
    return {
      hostelId: h.id,
      hostelName: h.name,
      hostelType: h.type,
      capacity: cap,
      occupied: occ,
      occupancyPct: cap === 0 ? 0 : Math.round((100 * occ) / cap),
    };
  });

  /** @type {import("@prisma/client").Prisma.AttendanceWhereInput} */
  const attendanceWhere = {
    attendance_date: { gte: from, lte: to },
  };
  if (q.hostelId) attendanceWhere.student = { hostel_id: q.hostelId };

  const attendanceRows = await prisma.attendance.findMany({
    where: attendanceWhere,
    select: { status: true },
  });

  const attendanceReport = {
    totalRecords: attendanceRows.length,
    present: attendanceRows.filter((r) => r.status === "PRESENT").length,
    absent: attendanceRows.filter((r) => r.status === "ABSENT").length,
    leave: attendanceRows.filter((r) => r.status === "LEAVE").length,
  };

  const leaveReport = {
    leaveMarks: attendanceReport.leave,
    studentsOnLeave: await prisma.student.count({
      where: { status: "ON_LEAVE", ...(q.hostelId ? { hostel_id: q.hostelId } : {}) },
    }),
  };

  const studentsByCourse = await prisma.student.groupBy({
    by: ["course"],
    where: q.hostelId ? { hostel_id: q.hostelId } : {},
    _count: { _all: true },
  });

  const wardenActivity = await prisma.adminActivity.count({
    where: {
      created_at: { gte: from, lte: to },
      type: { in: ["WARDEN_CREATED", "WARDEN_ASSIGNED", "WARDEN_UPDATED", "WARDEN_STATUS", "WARDEN_PASSWORD_RESET"] },
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    range: { from: q.from, to: q.to },
    occupancyReport,
    attendanceReport,
    leaveReport,
    studentDistributionReport: studentsByCourse.map((c) => ({
      course: c.course,
      count: c._count._all,
    })),
    wardenActivityReport: { events: wardenActivity },
    export: {
      format: "json",
      note: "CSV/PDF export can be attached via a dedicated exporter service.",
    },
  };
}
