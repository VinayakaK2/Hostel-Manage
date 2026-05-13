/**
 * Nehru Boys Hostel blueprint demo data.
 * Exactly 20 rooms on floor 1: 4×8 rectangular ring (101–120); centre (cols 2–3, rows 2–7) is void.
 * Students distributed across rooms (inactive room 108 stays empty).
 */

function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Floor 1 perimeter: top 101–104, left odds, right evens, bottom 117–120. */
const NEHRU_ROOMS = [
  { num: "101", floor: 1, x: 0, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "102", floor: 1, x: 1, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "103", floor: 1, x: 2, y: 0, capacity: 2, status: "ACTIVE" },
  { num: "104", floor: 1, x: 3, y: 0, capacity: 4, status: "ACTIVE" },
  { num: "105", floor: 1, x: 0, y: 1, capacity: 3, status: "ACTIVE" },
  { num: "106", floor: 1, x: 3, y: 1, capacity: 4, status: "ACTIVE" },
  { num: "107", floor: 1, x: 0, y: 2, capacity: 4, status: "ACTIVE" },
  { num: "108", floor: 1, x: 3, y: 2, capacity: 2, status: "INACTIVE" },
  { num: "109", floor: 1, x: 0, y: 3, capacity: 3, status: "ACTIVE" },
  { num: "110", floor: 1, x: 3, y: 3, capacity: 4, status: "ACTIVE" },
  { num: "111", floor: 1, x: 0, y: 4, capacity: 4, status: "ACTIVE" },
  { num: "112", floor: 1, x: 3, y: 4, capacity: 3, status: "ACTIVE" },
  { num: "113", floor: 1, x: 0, y: 5, capacity: 4, status: "ACTIVE" },
  { num: "114", floor: 1, x: 3, y: 5, capacity: 4, status: "ACTIVE" },
  { num: "115", floor: 1, x: 0, y: 6, capacity: 4, status: "ACTIVE" },
  { num: "116", floor: 1, x: 3, y: 6, capacity: 4, status: "ACTIVE" },
  { num: "117", floor: 1, x: 0, y: 7, capacity: 3, status: "ACTIVE" },
  { num: "118", floor: 1, x: 1, y: 7, capacity: 4, status: "ACTIVE" },
  { num: "119", floor: 1, x: 2, y: 7, capacity: 3, status: "ACTIVE" },
  { num: "120", floor: 1, x: 3, y: 7, capacity: 2, status: "ACTIVE" },
];

/** Target headcount per room (matches blueprint reference occupancy on floor 1). */
const NEHRU_OCC_BY_ROOM = {
  "101": 3,
  "102": 4,
  "103": 1,
  "104": 1,
  "105": 2,
  "106": 2,
  "107": 4,
  "108": 0,
  "109": 1,
  "110": 4,
  "111": 1,
  "112": 2,
  "113": 4,
  "114": 1,
  "115": 3,
  "116": 4,
  "117": 2,
  "118": 2,
  "119": 3,
  "120": 1,
};

const GIVEN_NAMES = [
  "Rahul",
  "Arjun",
  "Kiran",
  "Vivek",
  "Mohit",
  "Aditya",
  "Sanjay",
  "Aryan",
  "Rohan",
  "Siddharth",
  "Harshit",
  "Varun",
  "Pranav",
  "Manish",
  "Nitin",
  "Karthik",
  "Deepak",
  "Tarun",
  "Neeraj",
  "Ishaan",
  "Dev",
  "Kabir",
  "Harish",
  "Aniket",
];

/** PU (11/12) science streams — not engineering degree labels */
const COURSES = ["PCM", "PCMB"];

const ATT_CYCLE = /** @type {const} */ (["PRESENT", "PRESENT", "ABSENT", "LEAVE"]);

function buildNehruStudents() {
  /** @type {Array<{ student_id: string; name: string; course: string; phone: string | null; parent_contact: string; roomNum: string; attendance: import("@prisma/client").AttendanceStatus }>} */
  const rows = [];
  let seq = 1;
  for (const spec of NEHRU_ROOMS) {
    const occ = NEHRU_OCC_BY_ROOM[spec.num] ?? 0;
    for (let k = 0; k < occ; k += 1) {
      const gn = GIVEN_NAMES[(seq - 1) % GIVEN_NAMES.length];
      const sid = `NB2026${String(seq).padStart(4, "0")}`;
      rows.push({
        student_id: sid,
        name: `${gn} Menon`,
        course: COURSES[(seq - 1) % COURSES.length],
        phone: `+91-900100${String(1000 + seq).slice(-4)}`,
        parent_contact: `+91-910100${String(1000 + seq).slice(-4)}`,
        roomNum: spec.num,
        attendance: ATT_CYCLE[k % ATT_CYCLE.length],
      });
      seq += 1;
    }
  }
  return rows;
}

const NEHRU_STUDENTS = buildNehruStudents();

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
    data: { floor_count: 1, capacity: 120 },
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
    const classYear = i < 28 ? 11 : 12;
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
