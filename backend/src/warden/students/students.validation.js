import { z } from "zod";

export const listWardenStudentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    class: z.coerce.number().int().refine((n) => n === 11 || n === 12).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
    sort: z.enum(["name_asc", "name_desc", "created_desc", "created_asc"]).default("name_asc"),
  })
  .strict();

export const createWardenStudentSchema = z
  .object({
    student_id: z.string().trim().min(3).max(32),
    name: z.string().trim().min(2).max(120),
    gender: z.enum(["MALE", "FEMALE"]),
    class_year: z.coerce.number().int().refine((n) => n === 11 || n === 12).optional(),
    course: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(20).optional().nullable(),
    parent_contact: z.string().trim().min(6).max(64),
    room_id: z.string().cuid().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  })
  .strict();

export const updateWardenStudentSchema = z
  .object({
    student_id: z.string().trim().min(3).max(32).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    class_year: z.coerce.number().int().refine((n) => n === 11 || n === 12).optional(),
    course: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    parent_contact: z.string().trim().min(6).max(64).optional(),
    room_id: z.string().cuid().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
  })
  .strict();

export const transferWardenRoomSchema = z
  .object({
    room_id: z.string().cuid(),
  })
  .strict();
