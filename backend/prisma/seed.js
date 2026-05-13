import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";
import { seedNehruBoysBlueprint } from "./seed-blueprint-nehru.js";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@hostel.com";
const ADMIN_PASSWORD = "Admin@123";
const WARDEN_EMAIL = "warden@hostel.com";
const WARDEN_PASSWORD = "Warden@123";

function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  const [adminHash, wardenHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 12),
    bcrypt.hash(WARDEN_PASSWORD, 12),
  ]);

  const admin = await prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      name: "System Admin",
      email: ADMIN_EMAIL,
      password_hash: adminHash,
      preferences: {
        theme: "blue",
        emailDigest: true,
        pushAlerts: true,
      },
    },
    update: {
      password_hash: adminHash,
      status: "ACTIVE",
    },
  });

  const boysHostel = await prisma.hostel.upsert({
    where: { id: "seed-boys-hostel" },
    create: {
      id: "seed-boys-hostel",
      name: "Nehru Boys Hostel",
      type: "BOYS",
      capacity: 180,
      floor_count: 2,
      status: "ACTIVE",
    },
    update: {
      name: "Nehru Boys Hostel",
      type: "BOYS",
      capacity: 180,
      floor_count: 2,
      status: "ACTIVE",
    },
  });

  const girlsHostel = await prisma.hostel.upsert({
    where: { id: "seed-girls-hostel" },
    create: {
      id: "seed-girls-hostel",
      name: "Sarojini Girls Hostel",
      type: "GIRLS",
      capacity: 100,
      floor_count: 3,
      status: "ACTIVE",
    },
    update: {
      name: "Sarojini Girls Hostel",
      type: "GIRLS",
      capacity: 100,
      floor_count: 3,
      status: "ACTIVE",
    },
  });

  const warden = await prisma.warden.upsert({
    where: { email: WARDEN_EMAIL },
    create: {
      name: "Ravi Kumar",
      email: WARDEN_EMAIL,
      phone: "+91-9876500000",
      password_hash: wardenHash,
      assigned_hostel_id: boysHostel.id,
    },
    update: {
      password_hash: wardenHash,
      phone: "+91-9876500000",
      assigned_hostel_id: boysHostel.id,
      status: "ACTIVE",
    },
  });

  const roomG201 = await prisma.room.upsert({
    where: {
      hostel_id_room_number: { hostel_id: girlsHostel.id, room_number: "G-201" },
    },
    create: {
      hostel_id: girlsHostel.id,
      room_number: "G-201",
      capacity: 4,
      floor: 2,
      current_occupancy: 0,
      status: "ACTIVE",
      x_position: 0,
      y_position: 0,
      layout_width: 1,
      layout_height: 1,
    },
    update: { capacity: 4, status: "ACTIVE" },
  });

  const girlStudentSeeds = [
    {
      student_id: "STU2025010",
      name: "Aisha Khan",
      gender: "FEMALE",
      class_year: 11,
      course: "B.Arch",
      phone: "+91-9000000010",
      parent_contact: "+91-9100000010",
      hostel_id: girlsHostel.id,
      room_id: roomG201.id,
      status: "ACTIVE",
    },
    {
      student_id: "STU2025011",
      name: "Sneha Reddy",
      gender: "FEMALE",
      class_year: 12,
      course: "MBA",
      phone: "+91-9000000011",
      parent_contact: "+91-9100000011",
      hostel_id: girlsHostel.id,
      room_id: roomG201.id,
      status: "ON_LEAVE",
    },
  ];

  for (const s of girlStudentSeeds) {
    await prisma.student.upsert({
      where: { student_id: s.student_id },
      create: s,
      update: {
        name: s.name,
        course: s.course,
        phone: s.phone ?? null,
        parent_contact: s.parent_contact,
        hostel_id: s.hostel_id,
        room_id: s.room_id,
        status: s.status,
        gender: s.gender,
        class_year: s.class_year,
      },
    });
  }

  const occ201 = await prisma.student.count({
    where: { room_id: roomG201.id, status: { in: ["ACTIVE", "ON_LEAVE"] } },
  });

  await prisma.room.update({
    where: { id: roomG201.id },
    data: { current_occupancy: occ201 },
  });

  const students = await prisma.student.findMany({
    where: { hostel_id: girlsHostel.id },
    select: { id: true },
  });

  const today = utcDateOnly(new Date());
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    for (const st of students) {
      const statusCycle = ["PRESENT", "PRESENT", "ABSENT", "LEAVE"];
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

  await seedNehruBoysBlueprint(prisma, boysHostel, warden);

  await prisma.adminActivity.deleteMany({});
  await prisma.adminNotification.deleteMany({});

  await prisma.adminActivity.createMany({
    data: [
      {
        type: "STUDENT_CREATED",
        title: "New student added",
        metadata: { studentId: "NB2026101" },
        actor_type: "ADMIN",
        actor_id: admin.id,
      },
      {
        type: "WARDEN_ASSIGNED",
        title: "Warden assigned to hostel",
        metadata: { wardenEmail: WARDEN_EMAIL, hostelId: boysHostel.id },
        actor_type: "ADMIN",
        actor_id: admin.id,
      },
      {
        type: "HOSTEL_UPDATED",
        title: "Hostel capacity reviewed",
        metadata: { hostelId: girlsHostel.id },
        actor_type: "ADMIN",
        actor_id: admin.id,
      },
      {
        type: "STUDENT_TRANSFERRED",
        title: "Student transferred between rooms",
        metadata: { note: "Demo activity" },
        actor_type: "SYSTEM",
      },
      {
        type: "ATTENDANCE_ALERT",
        title: "Attendance anomaly detected",
        metadata: { severity: "low" },
        actor_type: "SYSTEM",
      },
    ],
  });

  await prisma.adminNotification.createMany({
    data: [
      {
        category: "LEAVE_ALERT",
        title: "Leave spike",
        message: "3 students on leave today across hostels.",
        read: false,
      },
      {
        category: "ABSENT_ALERT",
        title: "Absent students",
        message: "Review absent list for morning roll call.",
        read: false,
      },
      {
        category: "HOSTEL_FULL",
        title: "Hostel nearing capacity",
        message: "Nehru Boys Hostel is at 85% occupancy.",
        read: true,
      },
      {
        category: "NOTIFICATION_FAILURE",
        title: "SMS provider timeout",
        message: "2 parent SMS notifications failed and were queued for retry.",
        read: false,
      },
      {
        category: "SYSTEM_WARNING",
        title: "Backup window",
        message: "Database backup scheduled for 02:00 UTC.",
        read: true,
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
