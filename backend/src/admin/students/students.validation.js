import { z } from "zod";

export const listStudentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
    hostelId: z.string().cuid().optional(),
    sort: z.enum(["name_asc", "name_desc", "created_desc", "created_asc"]).default("name_asc"),
  })
  .strict();

export const createStudentSchema = z
  .object({
    student_id: z.string().trim().min(3).max(32),
    name: z.string().trim().min(2).max(120),
    gender: z.enum(["MALE", "FEMALE"]),
    course: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(20).optional().nullable(),
    parent_contact: z.string().trim().min(6).max(32),
    hostel_id: z.string().cuid(),
    room_id: z.string().cuid().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  })
  .strict();

export const updateStudentSchema = z
  .object({
    student_id: z.string().trim().min(3).max(32).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    course: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    parent_contact: z.string().trim().min(6).max(32).optional(),
    hostel_id: z.string().cuid().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
  })
  .strict();

export const transferRoomSchema = z
  .object({
    room_id: z.string().cuid(),
  })
  .strict();

export const updateStudentStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  })
  .strict();
