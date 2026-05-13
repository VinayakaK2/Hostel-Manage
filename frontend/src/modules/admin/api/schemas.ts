import { z } from "zod";

export const dashboardStatsSchema = z.object({
  totalStudents: z.number(),
  boysStudents: z.number(),
  girlsStudents: z.number(),
  activeWardens: z.number(),
  todayPresentCount: z.number(),
  todayAttendancePct: z.number(),
  studentsOnLeave: z.number(),
  absentStudents: z.number(),
});

export const activityItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  metadata: z.unknown().nullable().optional(),
  created_at: z.string(),
});

export const chartsPayloadSchema = z.object({
  occupancy: z.array(
    z.object({
      hostelId: z.string(),
      hostelName: z.string(),
      hostelType: z.enum(["BOYS", "GIRLS"]),
      capacity: z.number(),
      occupied: z.number(),
      occupancyPct: z.number(),
    }),
  ),
  attendanceTrend: z.array(
    z.object({
      date: z.string(),
      attendancePct: z.number(),
    }),
  ),
  leaveStatistics: z.array(
    z.object({
      date: z.string(),
      leaveCount: z.number(),
    }),
  ),
  genderDistribution: z.array(
    z.object({
      gender: z.enum(["MALE", "FEMALE"]),
      count: z.number(),
    }),
  ),
});

export const paginatedMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const studentRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  name: z.string(),
  gender: z.enum(["MALE", "FEMALE"]),
  class_year: z.coerce.number().int(),
  course: z.string(),
  phone: z.string().nullable().optional(),
  parent_contact: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  created_at: z.string(),
  hostel: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["BOYS", "GIRLS"]),
  }),
  room: z
    .object({
      id: z.string(),
      room_number: z.string(),
    })
    .nullable(),
});

export const wardenRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string(),
  assigned_hostel: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["BOYS", "GIRLS"]),
    })
    .nullable(),
});

export const hostelRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["BOYS", "GIRLS"]),
  capacity: z.number(),
  currentOccupancy: z.number(),
  floor_count: z.number(),
  floorsInUse: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  assignedWardens: z.array(
    z.object({ id: z.string(), name: z.string(), email: z.string() }),
  ),
  created_at: z.string(),
});

export const notificationRowSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  created_at: z.string(),
});

export const studentListResponseSchema = z.object({
  items: z.array(studentRowSchema),
  meta: paginatedMetaSchema,
});

export const wardenListResponseSchema = z.object({
  items: z.array(wardenRowSchema),
  meta: paginatedMetaSchema,
});

export const hostelListResponseSchema = z.object({
  items: z.array(hostelRowSchema),
  meta: paginatedMetaSchema,
});

export const roomSummarySchema = z.object({
  id: z.string(),
  hostel_id: z.string(),
  room_number: z.string(),
  capacity: z.number(),
  current_occupancy: z.number(),
  floor: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

export const roomListResponseSchema = z.object({
  items: z.array(roomSummarySchema),
});

export const notificationListResponseSchema = z.object({
  items: z.array(notificationRowSchema),
  meta: paginatedMetaSchema,
});
