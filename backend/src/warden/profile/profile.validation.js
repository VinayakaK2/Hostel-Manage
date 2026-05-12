import { z } from "zod";

export const updateWardenProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().transform((v) => v.toLowerCase()).optional(),
    phone: z.string().trim().max(24).optional().nullable(),
  })
  .strict();

export const updateWardenPasswordSchema = z
  .object({
    current_password: z.string().min(8).max(100),
    new_password: z.string().min(8).max(100),
  })
  .strict();
