import { prisma } from "../../lib/prisma.js";
import { prismaOrFallback } from "../../lib/optionalDb.js";
import { processDueAbsentParentJobs } from "../../lib/processAbsentParentJobs.js";

/**
 * @param {string} hostelId
 */
export async function getDashboardStats(hostelId) {
  await prismaOrFallback(() => processDueAbsentParentJobs(hostelId), undefined);

  const today = utcDateOnly(new Date());

  const [
    totalStudents,
    activeStudents,
    presentToday,
    absentToday,
    leaveToday,
    occupancyRows,
    pendingNotifications,
    observationAlerts,
    attendancePctRow,
  ] = await Promise.all([
    prisma.student.count({ where: { hostel_id: hostelId } }),
    prisma.student.count({
      where: { hostel_id: hostelId, status: { in: ["ACTIVE", "ON_LEAVE"] } },
    }),
    prisma.attendance.count({
      where: {
        attendance_date: today,
        status: "PRESENT",
        student: { hostel_id: hostelId },
      },
    }),
    prisma.attendance.count({
      where: {
        attendance_date: today,
        status: "ABSENT",
        student: { hostel_id: hostelId },
      },
    }),
    prisma.attendance.count({
      where: {
        attendance_date: today,
        status: "LEAVE",
        student: { hostel_id: hostelId },
      },
    }),
    prisma.student.findMany({
      where: { hostel_id: hostelId, status: { in: ["ACTIVE", "ON_LEAVE"] }, room_id: { not: null } },
      select: { id: true },
    }),
    prismaOrFallback(
      () =>
        prisma.wardenNotification.count({
          where: { hostel_id: hostelId, read: false },
        }),
      0,
    ),
    prismaOrFallback(
      () =>
        prisma.studyObservation.count({
          where: {
            hostel_id: hostelId,
            severity: "HIGH",
            created_at: { gte: new Date(Date.now() - 7 * 86400000) },
          },
        }),
      0,
    ),
    prisma.$queryRaw`
      SELECT
        CASE WHEN COUNT(*) = 0 THEN NULL
        ELSE ROUND(100.0 * SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(*), 1)
        END AS pct
      FROM attendance a
      INNER JOIN students s ON s.id = a.student_id
      WHERE s.hostel_id = ${hostelId}
        AND a.attendance_date >= ${addDays(today, -30)}
        AND a.attendance_date <= ${today}
    `,
  ]);

  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    select: { capacity: true },
  });
  const capacity = hostel?.capacity ?? 0;
  const sheltered = occupancyRows.length;
  const occupancyPct =
    capacity > 0 ? Math.min(100, Math.round((sheltered / capacity) * 1000) / 10) : 0;

  const pctRaw = /** @type {{ pct: unknown }[]} */ (attendancePctRow);
  const attendancePercentage =
    pctRaw[0]?.pct === null || pctRaw[0]?.pct === undefined
      ? null
      : Number(pctRaw[0].pct);

  return {
    total_students: totalStudents,
    present_today: presentToday,
    absent_today: absentToday,
    leave_today: leaveToday,
    active_students: activeStudents,
    occupancy_percentage: occupancyPct,
    sheltered_count: sheltered,
    hostel_capacity: capacity,
    pending_notifications: pendingNotifications,
    observation_alerts: observationAlerts,
    attendance_percentage_30d: attendancePercentage,
  };
}

/**
 * @param {string} hostelId
 */
export async function listRecentActivity(hostelId) {
  return prismaOrFallback(
    () =>
      prisma.wardenActivity.findMany({
        where: { hostel_id: hostelId },
        orderBy: { created_at: "desc" },
        take: 25,
        select: {
          id: true,
          type: true,
          title: true,
          metadata: true,
          created_at: true,
        },
      }),
    [],
  );
}

/**
 * @param {string} hostelId
 * @param {{ from: Date; to: Date }} range
 */
export async function getCharts(hostelId, range) {
  const from = utcDateOnly(range.from);
  const to = utcDateOnly(range.to);

  const attendanceSeries = await prisma.$queryRaw`
    SELECT a.attendance_date::text AS day,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
      SUM(CASE WHEN a.status = 'LEAVE' THEN 1 ELSE 0 END)::int AS leave
    FROM attendance a
    INNER JOIN students s ON s.id = a.student_id
    WHERE s.hostel_id = ${hostelId}
      AND a.attendance_date BETWEEN ${from} AND ${to}
    GROUP BY a.attendance_date
    ORDER BY a.attendance_date ASC
  `;

  const leaveTrend = await prisma.$queryRaw`
    SELECT a.attendance_date::text AS day,
      COUNT(*)::int AS leave_count
    FROM attendance a
    INNER JOIN students s ON s.id = a.student_id
    WHERE s.hostel_id = ${hostelId}
      AND a.status = 'LEAVE'
      AND a.attendance_date BETWEEN ${from} AND ${to}
    GROUP BY a.attendance_date
    ORDER BY a.attendance_date ASC
  `;

  const today = utcDateOnly(new Date());
  const dailySummary = await prisma.$queryRaw`
    SELECT a.status::text AS status, COUNT(*)::int AS count
    FROM attendance a
    INNER JOIN students s ON s.id = a.student_id
    WHERE s.hostel_id = ${hostelId}
      AND a.attendance_date = ${today}
    GROUP BY a.status
  `;

  const statusDistribution = await prisma.student.groupBy({
    by: ["status"],
    where: { hostel_id: hostelId },
    _count: { _all: true },
  });

  return {
    attendance_trend: /** @type {{ day: string; present: number; absent: number; leave: number }[]} */ (
      attendanceSeries
    ),
    leave_trend: /** @type {{ day: string; leave_count: number }[]} */ (leaveTrend),
    daily_attendance_summary: /** @type {{ status: string; count: number }[]} */ (dailySummary),
    student_status_distribution: statusDistribution.map((r) => ({
      status: r.status,
      count: Number(r._count._all),
    })),
  };
}

/**
 * @param {Date} d
 */
function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @param {Date} d
 * @param {number} days
 */
function addDays(d, days) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return utcDateOnly(x);
}
