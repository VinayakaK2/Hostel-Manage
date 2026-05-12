import { z } from "zod";

export const listHostelsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    type: z.enum(["BOYS", "GIRLS"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    sort: z.enum(["name_asc", "name_desc", "created_desc"]).default("name_asc"),
  })
  .strict();

export const createHostelSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    type: z.enum(["BOYS", "GIRLS"]),
    capacity: z.coerce.number().int().min(1).max(5000),
    floor_count: z.coerce.number().int().min(1).max(50).default(1),
  })
  .strict();

export const updateHostelSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    capacity: z.coerce.number().int().min(1).max(5000).optional(),
    floor_count: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const hostelStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();

export const createRoomSchema = z
  .object({
    room_number: z.string().trim().min(1).max(32),
    capacity: z.coerce.number().int().min(1).max(20),
    floor: z.coerce.number().int().min(0).max(100).default(1),
    x_position: z.coerce.number().int().min(0).max(500).optional(),
    y_position: z.coerce.number().int().min(0).max(500).optional(),
    layout_width: z.coerce.number().int().min(1).max(20).optional(),
    layout_height: z.coerce.number().int().min(1).max(20).optional(),
  })
  .strict();

export const updateRoomSchema = z
  .object({
    room_number: z.string().trim().min(1).max(32).optional(),
    capacity: z.coerce.number().int().min(1).max(20).optional(),
    floor: z.coerce.number().int().min(0).max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
    x_position: z.coerce.number().int().min(0).max(500).optional(),
    y_position: z.coerce.number().int().min(0).max(500).optional(),
    layout_width: z.coerce.number().int().min(1).max(20).optional(),
    layout_height: z.coerce.number().int().min(1).max(20).optional(),
  })
  .strict();
