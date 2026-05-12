import { z } from "zod";

export const listWardensQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    hostelId: z.string().cuid().optional(),
    sort: z.enum(["name_asc", "name_desc", "created_desc"]).default("name_asc"),
  })
  .strict();

export const createWardenSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().transform((v) => v.toLowerCase()),
    phone: z.string().trim().min(8).max(20),
    password: z.string().min(8).max(100),
    assigned_hostel_id: z.string().cuid().optional().nullable(),
  })
  .strict();

export const updateWardenSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(8).max(20).optional(),
    email: z.string().trim().email().transform((v) => v.toLowerCase()).optional(),
  })
  .strict();

export const assignHostelSchema = z
  .object({
    hostel_id: z.string().cuid().nullable(),
  })
  .strict();

export const wardenStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();

export const resetWardenPasswordSchema = z
  .object({
    new_password: z.string().min(8).max(100),
  })
  .strict();
