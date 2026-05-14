import { z } from "zod";
import { queryPrismaIdOptional } from "../../lib/prismaIdSchema.js";

export const attendanceAnalyticsQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hostelId: queryPrismaIdOptional,
  })
  .strict();
