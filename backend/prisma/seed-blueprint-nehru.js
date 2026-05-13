/**
 * Realistic Nehru Boys Hostel blueprint demo data (DB seed).
 * Two floors, explicit grid coordinates, mixed occupancy and room states.
 */

function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Grid: floor 1 = 4×2 wing (corridor rhythm along X); floor 2 = 3×2 wing. */
const NEHRU_ROOMS = [
  { num: "101", floor: 1, x: 0, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "102", floor: 1, x: 1, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "103", floor: 1, x: 2, y: 0, capacity: 2, status: "ACTIVE" },
  { num: "104", floor: 1, x: 3, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "105", floor: 1, x: 0, y: 1, capacity: 3, status: "ACTIVE" },
  { num: "106", floor: 1, x: 1, y: 1, capacity: 4, status: "ACTIVE" },
  { num: "107", floor: 1, x: 2, y: 1, capacity: 4, status: "MAINTENANCE" },
  { num: "108", floor: 1, x: 3, y: 1, capacity: 2, status: "INACTIVE" },
  { num: "201", floor: 2, x: 0, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "202", floor: 2, x: 1, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "203", floor: 2, x: 2, y: 0, capacity: 3, status: "ACTIVE" },
  { num: "204", floor: 2, x: 0, y: 1, capacity: 2, status: "ACTIVE" },
  { num: "205", floor: 2, x: 1, y: 1, capacity: 3, status: "ACTIVE" },
  { num: "206", floor: 2, x: 2, y: 1, capacity: 4, status: "ACTIVE" },
];

/** @type {Array<{ student_id: string; name: string; course: string; phone: string | null; parent_contact: string; roomNum: string; attendance: import("@prisma/client").AttendanceStatus }>} */
const NEHRU_STUDENTS = [
  { student_id: "NB2026101", name: "Rahul Sharma", course: "B.Tech CSE", phone: "+91-9001000101", parent_contact: "+91-9101000101", roomNum: "101", attendance: "PRESENT" },
  { student_id: "NB2026102", name: "Arjun Patel", course: "B.Tech ECE", phone: "+91-9001000102", parent_contact: "+91-9101000102", roomNum: "101", attendance: "PRESENT" },
  { student_id: "NB2026103", name: "Kiran Kumar", course: "B.Tech ME", phone: "+91-9001000103", parent_contact: "+91-9101000103", roomNum: "101", attendance: "ABSENT" },
  { student_id: "NB2026104", name: "Vivek Rao", course: "B.Tech CSE", phone: "+91-9001000104", parent_contact: "+91-9101000104", roomNum: "102", attendance: "PRESENT" },
  { student_id: "NB2026105", name: "Mohit Verma", course: "B.Tech ECE", phone: "+91-9001000105", parent_contact: "+91-9101000105", roomNum: "102", attendance: "PRESENT" },
  { student_id: "NB2026106", name: "Aditya Nair", course: "B.Arch", phone: "+91-9001000106", parent_contact: "+91-9101000106", roomNum: "102", attendance: "LEAVE" },
  { student_id: "NB2026107", name: "Sanjay Iyer", course: "B.Tech IT", phone: "+91-9001000107", parent_contact: "+91-9101000107", roomNum: "102", attendance: "PRESENT" },
  { student_id: "NB2026108", name: "Aryan Malik", course: "MBA", phone: "+91-9001000108", parent_contact: "+91-9101000108", roomNum: "104", attendance: "PRESENT" },
  { student_id: "NB2026109", name: "Rohan Gupta", course: "B.Tech CSE", phone: "+91-9001000109", parent_contact: "+91-9101000109", roomNum: "105", attendance: "ABSENT" },
  { student_id: "NB2026110", name: "Siddharth Menon", course: "B.Tech ECE", phone: "+91-9001000110", parent_contact: "+91-9101000110", roomNum: "105", attendance: "PRESENT" },
  { student_id: "NB2026111", name: "Harshit Desai", course: "B.Tech ME", phone: "+91-9001000111", parent_contact: "+91-9101000111", roomNum: "201", attendance: "PRESENT" },
  { student_id: "NB2026112", name: "Varun Nambiar", course: "B.Tech CSE", phone: "+91-9001000112", parent_contact: "+91-9101000112", roomNum: "201", attendance: "LEAVE" },
  { student_id: "NB2026113", name: "Pranav Kulkarni", course: "B.Tech ECE", phone: "+91-9001000113", parent_contact: "+91-9101000113", roomNum: "202", attendance: "PRESENT" },
  { student_id: "NB2026114", name: "Manish Pandey", course: "B.Tech IT", phone: "+91-9001000114", parent_contact: "+91-9101000114", roomNum: "202", attendance: "PRESENT" },
  { student_id: "NB2026115", name: "Nitin Krishnan", course: "B.Tech CSE", phone: "+91-9001000115", parent_contact: "+91-9101000115", roomNum: "202", attendance: "PRESENT" },
  { student_id: "NB2026116", name: "Karthik Bose", course: "B.Arch", phone: "+91-9001000116", parent_contact: "+91-9101000116", roomNum: "202", attendance: "ABSENT" },
  { student_id: "NB2026117", name: "Deepak Chawla", course: "MBA", phone: "+91-9001000117", parent_contact: "+91-9101000117", roomNum: "204", attendance: "PRESENT" },
  { student_id: "NB2026118", name: "Tarun Saxena", course: "B.Tech ME", phone: "+91-9001000118", parent_contact: "+91-9101000118", roomNum: "204", attendance: "PRESENT" },
  { student_id: "NB2026119", name: "Neeraj Pillai", course: "B.Tech CSE", phone: "+91-9001000119", parent_contact: "+91-9101000119", roomNum: "205", attendance: "PRESENT" },
];

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ id: string }} boysHostel
 * @param {{ id: string }} warden
 */
export async function seedNehruBoysBlueprint(prisma, boysHostel, warden) {
  const boysId = boysHostel.id;

  const existingBoys = await prisma.student.findMany({
    where: { hostel_id: boysId },
    select: { id: true },
  });
  const boyIds = existingBoys.map((s) => s.id);
  if (boyIds.length) {
    await prisma.absentParentNotificationJob.deleteMany({ where: { student_id: { in: boyIds } } });
    await prisma.attendance.deleteMany({ where: { student_id: { in: boyIds } } });
    await prisma.studyObservation.deleteMany({ where: { student_id: { in: boyIds } } });
    await prisma.student.deleteMany({ where: { id: { in: boyIds } } });
  }
  await prisma.room.deleteMany({ where: { hostel_id: boysId } });

  await prisma.hostel.update({
    where: { id: boysId },
    data: { floor_count: 2, capacity: 180 },
  });

  /** @type {Map<string, string>} */
  const roomIdByNum = new Map();
  for (const spec of NEHRU_ROOMS) {
    const room = await prisma.room.create({
      data: {
        hostel_id: boysId,
        room_number: spec.num,
        floor: spec.floor,
        capacity: spec.capacity,
        current_occupancy: 0,
        status: spec.status,
        x_position: spec.x,
        y_position: spec.y,
        layout_width: 1,
        layout_height: 1,
      },
    });
    roomIdByNum.set(spec.num, room.id);
  }

  const today = utcDateOnly(new Date());

  for (let i = 0; i < NEHRU_STUDENTS.length; i += 1) {
    const s = NEHRU_STUDENTS[i];
    const roomId = roomIdByNum.get(s.roomNum);
    if (!roomId) throw new Error(`Missing room ${s.roomNum}`);
    const classYear = i < 9 ? 11 : 12;
    const student = await prisma.student.upsert({
      where: { student_id: s.student_id },
      create: {
        student_id: s.student_id,
        name: s.name,
        gender: "MALE",
        class_year: classYear,
        course: s.course,
        phone: s.phone,
        parent_contact: s.parent_contact,
        hostel_id: boysId,
        room_id: roomId,
        status: "ACTIVE",
      },
      update: {
        name: s.name,
        course: s.course,
        phone: s.phone,
        parent_contact: s.parent_contact,
        hostel_id: boysId,
        room_id: roomId,
        status: "ACTIVE",
        gender: "MALE",
        class_year: classYear,
      },
    });

    await prisma.attendance.upsert({
      where: {
        student_id_attendance_date: {
          student_id: student.id,
          attendance_date: today,
        },
      },
      create: {
        student_id: student.id,
        attendance_date: today,
        status: s.attendance,
        leave_reason: s.attendance === "LEAVE" ? "Approved leave" : null,
        marked_by_id: warden.id,
      },
      update: {
        status: s.attendance,
        leave_reason: s.attendance === "LEAVE" ? "Approved leave" : null,
        marked_by_id: warden.id,
      },
    });
  }

  for (const spec of NEHRU_ROOMS) {
    const rid = roomIdByNum.get(spec.num);
    if (!rid) continue;
    const occ = await prisma.student.count({
      where: { room_id: rid, status: { in: ["ACTIVE", "ON_LEAVE"] } },
    });
    await prisma.room.update({
      where: { id: rid },
      data: { current_occupancy: occ },
    });
  }

  const allBoys = await prisma.student.findMany({
    where: { hostel_id: boysId },
    select: { id: true },
  });
  const statusCycle = ["PRESENT", "PRESENT", "ABSENT", "LEAVE"];
  for (let i = 1; i <= 6; i += 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    for (const st of allBoys) {
      const status = statusCycle[(i + st.id.length) % statusCycle.length];
      await prisma.attendance.upsert({
        where: {
          student_id_attendance_date: {
            student_id: st.id,
            attendance_date: d,
          },
        },
        create: {
          student_id: st.id,
          attendance_date: d,
          status,
          leave_reason: status === "LEAVE" ? "Family function" : null,
          marked_by_id: warden.id,
        },
        update: {
          status,
          leave_reason: status === "LEAVE" ? "Family function" : null,
          marked_by_id: warden.id,
        },
      });
    }
  }
}
