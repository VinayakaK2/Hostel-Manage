import { z } from "zod";

export const listNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    unread_only: z
      .union([z.literal("true"), z.literal("false")])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    category: z
      .enum(["ATTENDANCE_ALERT", "LEAVE_ALERT", "ABSENCE_PARENT", "NOTIFICATION_FAILURE", "SYSTEM"])
      .optional(),
  })
  .strict();

export const listParentLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["PENDING", "SENT", "FAILED"]).optional(),
  })
  .strict();
