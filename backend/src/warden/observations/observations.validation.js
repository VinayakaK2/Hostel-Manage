import { z } from "zod";

export const createObservationSchema = z
  .object({
    student_id: z.string().cuid(),
    note: z.string().trim().min(3).max(4000),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  })
  .strict();

export const updateObservationSchema = z
  .object({
    note: z.string().trim().min(3).max(4000).optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  })
  .strict();

export const listObservationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    student_id: z.string().cuid().optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.enum(["created_desc", "created_asc"]).default("created_desc"),
  })
  .strict();
