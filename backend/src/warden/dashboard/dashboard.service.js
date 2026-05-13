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
 * Operational widgets for warden home (replaces chart-heavy panels).
 * @param {string} hostelId
 */
export async function getOperationalSnapshot(hostelId) {
  const today = utcDateOnly(new Date());

  const [recentAttendanceRows, recentStudents, leaveTodayMarks, notificationRows, rooms] =
    await Promise.all([
      prisma.attendance.findMany({
        where: { student: { hostel_id: hostelId }, attendance_date: today },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          created_at: true,
          status: true,
          student: { select: { name: true, student_id: true, class_year: true } },
        },
      }),
      prisma.student.findMany({
        where: { hostel_id: hostelId },
        orderBy: { created_at: "desc" },
        take: 6,
        select: {
          name: true,
          student_id: true,
          class_year: true,
          created_at: true,
        },
      }),
      prisma.attendance.findMany({
        where: {
          attendance_date: today,
          status: "LEAVE",
          student: { hostel_id: hostelId },
        },
        take: 12,
        select: {
          student: { select: { name: true, student_id: true, class_year: true } },
        },
      }),
      prismaOrFallback(
        () =>
          prisma.wardenNotification.findMany({
            where: { hostel_id: hostelId },
            orderBy: { created_at: "desc" },
            take: 8,
            select: {
              id: true,
              title: true,
              category: true,
              read: true,
              created_at: true,
            },
          }),
        [],
      ),
      prisma.room.findMany({
        where: { hostel_id: hostelId },
        select: {
          room_number: true,
          capacity: true,
          current_occupancy: true,
          status: true,
        },
      }),
    ]);

  let occupiedBeds = 0;
  let totalBedCapacity = 0;
  let emptyRooms = 0;
  let fullRooms = 0;
  for (const r of rooms) {
    totalBedCapacity += r.capacity;
    occupiedBeds += Math.min(r.current_occupancy, r.capacity);
    if (r.status === "ACTIVE" && r.current_occupancy === 0) emptyRooms += 1;
    if (r.capacity > 0 && r.current_occupancy >= r.capacity) fullRooms += 1;
  }

  return {
    recent_attendance: recentAttendanceRows.map((row) => ({
      at: row.created_at.toISOString(),
      status: row.status,
      student_name: row.student.name,
      student_code: row.student.student_id,
      class_year: row.student.class_year,
    })),
    recent_students: recentStudents.map((s) => ({
      name: s.name,
      student_id: s.student_id,
      class_year: s.class_year,
      created_at: s.created_at.toISOString(),
    })),
    leave_today: leaveTodayMarks.map((row) => ({
      name: row.student.name,
      student_id: row.student.student_id,
      class_year: row.student.class_year,
    })),
    notification_activity: notificationRows.map((n) => ({
      id: n.id,
      title: n.title,
      category: n.category,
      read: n.read,
      created_at: n.created_at.toISOString(),
    })),
    occupancy_snapshot: {
      room_count: rooms.length,
      total_bed_capacity: totalBedCapacity,
      occupied_beds: occupiedBeds,
      empty_rooms: emptyRooms,
      full_rooms: fullRooms,
    },
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
