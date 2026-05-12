import { prisma } from "../../lib/prisma.js";

function utcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @returns {Promise<object>}
 */
export async function getDashboardStats() {
  const today = utcDay(new Date());

  const [
    totalStudents,
    boysStudents,
    girlsStudents,
    totalHostels,
    activeWardens,
    attendanceTodayRows,
    studentsOnLeaveStatus,
    absentToday,
  ] = await Promise.all([
    prisma.student.count({
      where: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
    }),
    prisma.student.count({
      where: {
        gender: "MALE",
        status: { in: ["ACTIVE", "ON_LEAVE"] },
      },
    }),
    prisma.student.count({
      where: {
        gender: "FEMALE",
        status: { in: ["ACTIVE", "ON_LEAVE"] },
      },
    }),
    prisma.hostel.count({ where: { status: "ACTIVE" } }),
    prisma.warden.count({ where: { status: "ACTIVE" } }),
    prisma.attendance.findMany({
      where: { attendance_date: today },
      select: { status: true },
    }),
    prisma.student.count({ where: { status: "ON_LEAVE" } }),
    prisma.attendance.count({
      where: { attendance_date: today, status: "ABSENT" },
    }),
  ]);

  const present = attendanceTodayRows.filter((r) => r.status === "PRESENT").length;
  const leaveMarked = attendanceTodayRows.filter((r) => r.status === "LEAVE").length;
  const denom = attendanceTodayRows.length;
  const todayAttendancePct =
    denom === 0 ? 0 : Math.round((100 * present) / denom);

  const studentsOnLeave = Math.max(studentsOnLeaveStatus, leaveMarked);

  return {
    totalStudents,
    boysStudents,
    girlsStudents,
    totalHostels,
    activeWardens,
    todayAttendancePct,
    studentsOnLeave,
    absentStudents: absentToday,
  };
}

/**
 * @param {number} take
 */
export async function getRecentActivity(take = 20) {
  return prisma.adminActivity.findMany({
    orderBy: { created_at: "desc" },
    take,
    select: {
      id: true,
      type: true,
      title: true,
      metadata: true,
      created_at: true,
    },
  });
}

/**
 * @param {{ from: Date; to: Date }} range
 */
export async function getChartsPayload(range) {
  const { from, to } = range;

  const hostels = await prisma.hostel.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      capacity: true,
      type: true,
      rooms: { select: { capacity: true, current_occupancy: true } },
    },
  });

  const occupancy = hostels.map((h) => {
    const capFromRooms = h.rooms.reduce((s, r) => s + r.capacity, 0);
    const occFromRooms = h.rooms.reduce((s, r) => s + r.current_occupancy, 0);
    const capacity = capFromRooms > 0 ? capFromRooms : h.capacity;
    const occupied = occFromRooms;
    const pct =
      capacity === 0 ? 0 : Math.min(100, Math.round((100 * occupied) / capacity));
    return {
      hostelId: h.id,
      hostelName: h.name,
      hostelType: h.type,
      capacity,
      occupied,
      occupancyPct: pct,
    };
  });

  const attendanceRows = await prisma.attendance.groupBy({
    by: ["attendance_date", "status"],
    where: {
      attendance_date: { gte: from, lte: to },
    },
    _count: { _all: true },
  });

  const dayMap = new Map();
  for (const row of attendanceRows) {
    const key = row.attendance_date.toISOString().slice(0, 10);
    if (!dayMap.has(key)) {
      dayMap.set(key, { date: key, present: 0, absent: 0, leave: 0, total: 0 });
    }
    const bucket = dayMap.get(key);
    const c = row._count._all;
    bucket.total += c;
    if (row.status === "PRESENT") bucket.present += c;
    if (row.status === "ABSENT") bucket.absent += c;
    if (row.status === "LEAVE") bucket.leave += c;
  }

  const attendanceTrend = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      attendancePct: d.total === 0 ? 0 : Math.round((100 * d.present) / d.total),
    }));

  const leaveStats = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, leaveCount: d.leave }));

  const genderRows = await prisma.student.groupBy({
    by: ["gender"],
    where: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
    _count: { _all: true },
  });

  const genderDistribution = genderRows.map((g) => ({
    gender: g.gender,
    count: g._count._all,
  }));

  return {
    occupancy,
    attendanceTrend,
    leaveStatistics: leaveStats,
    genderDistribution,
  };
}
