import { z } from "zod";
import { prismaStringId, queryPrismaIdOptional } from "../../lib/prismaIdSchema.js";

export const listStudentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    gender: z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]).optional(),
    /** Class 11 or 12 (query: ?class=11) */
    class: z.coerce.number().int().refine((n) => n === 11 || n === 12).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
    hostelId: queryPrismaIdOptional,
    sort: z.enum(["name_asc", "name_desc", "created_desc", "created_asc"]).default("name_asc"),
  })
  .strict();

export const createStudentSchema = z
  .object({
    student_id: z.string().trim().min(3).max(32),
    name: z.string().trim().min(2).max(120),
    gender: z.enum(["MALE", "FEMALE"]),
    class_year: z.coerce.number().int().refine((n) => n === 11 || n === 12).optional(),
    course: z.enum(["PCM", "PCMB"]),
    phone: z.string().trim().max(20).optional().nullable(),
    parent_contact: z.string().trim().min(6).max(64),
    hostel_id: prismaStringId,
    room_id: prismaStringId.optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  })
  .strict();

export const updateStudentSchema = z
  .object({
    student_id: z.string().trim().min(3).max(32).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    class_year: z.coerce.number().int().refine((n) => n === 11 || n === 12).optional(),
    course: z.enum(["PCM", "PCMB"]).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    parent_contact: z.string().trim().min(6).max(64).optional(),
    hostel_id: prismaStringId.optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
  })
  .strict();

export const transferRoomSchema = z
  .object({
    room_id: prismaStringId,
  })
  .strict();

export const updateStudentStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  })
  .strict();
