import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";

function parseDay(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

/**
 * @param {import("zod").infer<typeof import("./analytics.validation.js").attendanceAnalyticsQuerySchema>} q
 */
export async function getAttendanceAnalytics(q) {
  const from = parseDay(q.from);
  const to = parseDay(q.to);
  if (from.getTime() > to.getTime()) {
    throw new HttpError(400, "Invalid date range");
  }

  /** @type {import("@prisma/client").Prisma.AttendanceWhereInput} */
  const where = {
    attendance_date: { gte: from, lte: to },
  };

  if (q.hostelId) {
    where.student = { hostel_id: q.hostelId };
  }

  const rows = await prisma.attendance.findMany({
    where,
    select: {
      attendance_date: true,
      status: true,
      student: { select: { hostel_id: true, hostel: { select: { name: true } } } },
    },
  });

  const byDay = new Map();
  const byHostel = new Map();

  for (const r of rows) {
    const key = r.attendance_date.toISOString().slice(0, 10);
    if (!byDay.has(key)) {
      byDay.set(key, { date: key, present: 0, absent: 0, leave: 0, total: 0 });
    }
    const b = byDay.get(key);
    b.total += 1;
    if (r.status === "PRESENT") b.present += 1;
    if (r.status === "ABSENT") b.absent += 1;
    if (r.status === "LEAVE") b.leave += 1;

    const hid = r.student.hostel_id;
    if (!byHostel.has(hid)) {
      byHostel.set(hid, {
        hostelId: hid,
        hostelName: r.student.hostel.name,
        present: 0,
        absent: 0,
        leave: 0,
        total: 0,
      });
    }
    const h = byHostel.get(hid);
    h.total += 1;
    if (r.status === "PRESENT") h.present += 1;
    if (r.status === "ABSENT") h.absent += 1;
    if (r.status === "LEAVE") h.leave += 1;
  }

  const daily = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  const hostelWise = Array.from(byHostel.values()).map((h) => ({
    ...h,
    attendancePct: h.total === 0 ? 0 : Math.round((100 * h.present) / h.total),
  }));

  const totals = daily.reduce(
    (acc, d) => {
      acc.present += d.present;
      acc.absent += d.absent;
      acc.leave += d.leave;
      acc.total += d.total;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, total: 0 },
  );

  return {
    range: { from: q.from, to: q.to },
    totals: {
      ...totals,
      attendancePct:
        totals.total === 0 ? 0 : Math.round((100 * totals.present) / totals.total),
    },
    daily,
    hostelWise,
  };
}
