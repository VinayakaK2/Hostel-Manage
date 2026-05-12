import { z } from "zod";

export const attendanceAnalyticsQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hostelId: z.string().cuid().optional(),
  })
  .strict();
