import { z } from "zod";

export const listLeaveRecordsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    student_id: z.string().cuid().optional(),
    leave_type: z.string().trim().max(120).optional(),
    student_status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
    sort: z.enum(["date_desc", "date_asc"]).default("date_desc"),
  })
  .strict();
