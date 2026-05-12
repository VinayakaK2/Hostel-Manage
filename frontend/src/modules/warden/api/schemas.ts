import { z } from "zod";

export const paginationMetaSchema = z.object({
  total: z.coerce.number(),
  page: z.coerce.number(),
  limit: z.coerce.number(),
  totalPages: z.coerce.number(),
});

export const wardenDashboardStatsSchema = z.object({
  total_students: z.coerce.number(),
  present_today: z.coerce.number(),
  absent_today: z.coerce.number(),
  leave_today: z.coerce.number(),
  active_students: z.coerce.number(),
  occupancy_percentage: z.coerce.number(),
  sheltered_count: z.coerce.number(),
  hostel_capacity: z.coerce.number(),
  pending_notifications: z.coerce.number(),
  observation_alerts: z.coerce.number(),
  attendance_percentage_30d: z.coerce.number().nullable(),
});

export const wardenActivityItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  metadata: z.unknown().optional().nullable(),
  created_at: z.string(),
});

export const attendanceTrendPointSchema = z.object({
  day: z.string(),
  present: z.coerce.number(),
  absent: z.coerce.number(),
  leave: z.coerce.number(),
});

export const leaveTrendPointSchema = z.object({
  day: z.string(),
  leave_count: z.coerce.number(),
});

export const dailySummaryRowSchema = z.object({
  status: z.string(),
  count: z.coerce.number(),
});

export const statusDistributionRowSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  count: z.coerce.number(),
});

export const wardenChartsSchema = z.object({
  attendance_trend: z.array(attendanceTrendPointSchema),
  leave_trend: z.array(leaveTrendPointSchema),
  daily_attendance_summary: z.array(dailySummaryRowSchema),
  student_status_distribution: z.array(statusDistributionRowSchema),
});

export const wardenStudentRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  name: z.string(),
  gender: z.enum(["MALE", "FEMALE"]),
  course: z.string(),
  phone: z.string().nullable().optional(),
  parent_contact: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  created_at: z.string().optional(),
  room: z
    .object({ id: z.string(), room_number: z.string() })
    .nullable()
    .optional(),
  attendance_status_today: z.enum(["PRESENT", "ABSENT", "LEAVE"]).nullable().optional(),
});

export const wardenStudentDetailSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  name: z.string(),
  gender: z.enum(["MALE", "FEMALE"]),
  course: z.string(),
  phone: z.string().nullable().optional(),
  parent_contact: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  created_at: z.string(),
  updated_at: z.string(),
  room: z
    .object({
      id: z.string(),
      room_number: z.string(),
      capacity: z.coerce.number(),
      current_occupancy: z.coerce.number(),
      status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
    })
    .nullable()
    .optional(),
});

export const wardenRoomSchema = z.object({
  id: z.string(),
  room_number: z.string(),
  capacity: z.coerce.number(),
  current_occupancy: z.coerce.number(),
  floor: z.coerce.number(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

export const attendanceStudentRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  name: z.string(),
  course: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  room: z.object({ room_number: z.string() }).nullable().optional(),
  attendance: z
    .object({
      status: z.enum(["PRESENT", "ABSENT", "LEAVE"]),
      leave_reason: z.string().nullable(),
    })
    .nullable(),
});

export const observationRowSchema = z.object({
  id: z.string(),
  note: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  created_at: z.string(),
  updated_at: z.string(),
  student: z.object({
    id: z.string(),
    student_id: z.string(),
    name: z.string(),
    course: z.string(),
  }),
  created_by: z.object({ id: z.string(), name: z.string() }),
});

export const leaveRecordRowSchema = z.object({
  id: z.string(),
  attendance_date: z.string(),
  leave_reason: z.string().nullable(),
  created_at: z.string(),
  student: z.object({
    id: z.string(),
    student_id: z.string(),
    name: z.string(),
    course: z.string(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
    room: z.object({ room_number: z.string() }).nullable().optional(),
  }),
});

export const wardenNotificationRowSchema = z.object({
  id: z.string(),
  category: z.enum([
    "ATTENDANCE_ALERT",
    "LEAVE_ALERT",
    "ABSENCE_PARENT",
    "NOTIFICATION_FAILURE",
    "SYSTEM",
  ]),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  metadata: z.unknown().optional().nullable(),
  created_at: z.string(),
});

export const parentLogRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  channel: z.enum(["SMS", "EMAIL"]),
  recipient: z.string(),
  message: z.string(),
  status: z.enum(["PENDING", "SENT", "FAILED"]),
  error: z.string().nullable().optional(),
  created_at: z.string(),
});

export const blueprintDisplayStatusSchema = z.enum([
  "EMPTY",
  "PARTIAL",
  "FULL",
  "MAINTENANCE",
  "LOCKED",
]);

export const blueprintOverviewSchema = z.object({
  hostel: z.object({
    id: z.string(),
    name: z.string(),
    floor_count: z.coerce.number(),
  }),
  floors: z.array(
    z.object({
      floor: z.coerce.number(),
      room_count: z.coerce.number(),
    }),
  ),
  default_floor: z.coerce.number(),
});

export const blueprintOccupantPreviewRowSchema = z.object({
  initials: z.string(),
  attendance_today: z.enum(["PRESENT", "ABSENT", "LEAVE"]).nullable(),
});

export const blueprintFloorRoomSchema = z.object({
  id: z.string(),
  room_number: z.string(),
  floor: z.coerce.number(),
  x: z.coerce.number(),
  y: z.coerce.number(),
  width: z.coerce.number(),
  height: z.coerce.number(),
  capacity: z.coerce.number(),
  occupancy: z.coerce.number(),
  room_status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  display_status: blueprintDisplayStatusSchema,
  occupant_preview: z.array(blueprintOccupantPreviewRowSchema).default([]),
});

export const blueprintFloorSchema = z.object({
  hostel: z.object({
    id: z.string(),
    name: z.string(),
    floor_count: z.coerce.number(),
  }),
  floor: z.coerce.number(),
  grid: z.object({
    columns: z.coerce.number(),
    rows: z.coerce.number(),
    layout_source: z.enum(["AUTO", "DATABASE"]),
    suggested_columns: z.coerce.number(),
  }),
  rooms: z.array(blueprintFloorRoomSchema),
});

/** Parsed floor payload with guaranteed `occupant_preview` arrays (Zod `.default` can still infer optional on nested objects). */
export type BlueprintFloorOccupantPreviewRow = z.infer<typeof blueprintOccupantPreviewRowSchema>;
export type BlueprintFloorRoomPayload = Omit<z.infer<typeof blueprintFloorRoomSchema>, "occupant_preview"> & {
  occupant_preview: BlueprintFloorOccupantPreviewRow[];
};
export type BlueprintFloorPayload = Omit<z.infer<typeof blueprintFloorSchema>, "rooms"> & {
  rooms: BlueprintFloorRoomPayload[];
};

export const blueprintRoomDetailStudentSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  name: z.string(),
  course: z.string(),
  phone: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  attendance_status_today: z.enum(["PRESENT", "ABSENT", "LEAVE"]).nullable(),
});

export const blueprintRoomDetailSchema = z.object({
  room: z.object({
    id: z.string(),
    room_number: z.string(),
    floor: z.coerce.number(),
    capacity: z.coerce.number(),
    occupancy: z.coerce.number(),
    room_status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
    display_status: blueprintDisplayStatusSchema,
    x_position: z.coerce.number(),
    y_position: z.coerce.number(),
    width: z.coerce.number(),
    height: z.coerce.number(),
  }),
  attendance_snapshot: z.object({
    date: z.string(),
    present: z.coerce.number(),
    absent: z.coerce.number(),
    leave: z.coerce.number(),
    unmarked: z.coerce.number(),
  }),
  students: z.array(blueprintRoomDetailStudentSchema),
});

export const wardenProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string(),
  updated_at: z.string(),
  assigned_hostel: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["BOYS", "GIRLS"]),
      capacity: z.number(),
      status: z.enum(["ACTIVE", "INACTIVE"]),
    })
    .nullable(),
});

export const attendanceHistoryRowSchema = z.object({
  id: z.string(),
  attendance_date: z.string(),
  status: z.enum(["PRESENT", "ABSENT", "LEAVE"]),
  leave_reason: z.string().nullable(),
  remark: z.string().nullable().optional(),
  created_at: z.string(),
});

function parseData<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Malformed ${label}`);
  }
  return parsed.data;
}

export function parseDashboardStats(data: unknown) {
  return parseData(wardenDashboardStatsSchema, data, "dashboard stats");
}

export function parseActivity(data: unknown) {
  return z.array(wardenActivityItemSchema).parse(data);
}

export function parseCharts(data: unknown) {
  return parseData(wardenChartsSchema, data, "charts");
}

export function parseStudentListPayload(data: unknown) {
  const schema = z.object({
    items: z.array(wardenStudentRowSchema),
    meta: paginationMetaSchema,
  });
  return parseData(schema, data, "student list");
}

export function parseStudentDetail(data: unknown) {
  return parseData(wardenStudentDetailSchema, data, "student");
}

export function parseRooms(data: unknown) {
  return z.array(wardenRoomSchema).parse(data);
}

export function parseAttendanceByDate(data: unknown) {
  return z.array(attendanceStudentRowSchema).parse(data);
}

export function parseAttendanceHistory(data: unknown) {
  const schema = z.object({
    items: z.array(attendanceHistoryRowSchema),
    meta: paginationMetaSchema,
  });
  return parseData(schema, data, "attendance history");
}

export function parseObservations(data: unknown) {
  const schema = z.object({
    items: z.array(observationRowSchema),
    meta: paginationMetaSchema,
  });
  return parseData(schema, data, "observations");
}

export function parseObservation(data: unknown) {
  return parseData(observationRowSchema, data, "observation");
}

export function parseLeaveRecords(data: unknown) {
  const schema = z.object({
    items: z.array(leaveRecordRowSchema),
    meta: paginationMetaSchema,
  });
  return parseData(schema, data, "leave records");
}

export function parseNotifications(data: unknown) {
  const schema = z.object({
    items: z.array(wardenNotificationRowSchema),
    meta: paginationMetaSchema,
  });
  return parseData(schema, data, "notifications");
}

export function parseParentLogs(data: unknown) {
  const schema = z.object({
    items: z.array(parentLogRowSchema),
    meta: paginationMetaSchema,
  });
  return parseData(schema, data, "parent logs");
}

export function parseProfile(data: unknown) {
  return parseData(wardenProfileSchema, data, "profile");
}

export function parseBlueprintOverview(data: unknown) {
  return parseData(blueprintOverviewSchema, data, "blueprint overview");
}

export function parseBlueprintFloor(data: unknown): BlueprintFloorPayload {
  const parsed = parseData(blueprintFloorSchema, data, "blueprint floor");
  return {
    ...parsed,
    rooms: parsed.rooms.map((room) => ({
      ...room,
      occupant_preview: room.occupant_preview ?? [],
    })),
  };
}

export function parseBlueprintRoomDetail(data: unknown) {
  return parseData(blueprintRoomDetailSchema, data, "room blueprint detail");
}
