import { z } from "zod";
import { prismaStringId } from "../../lib/prismaIdSchema.js";

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().transform((v) => v.toLowerCase()).optional(),
  })
  .strict();

export const updatePasswordSchema = z
  .object({
    current_password: z.string().min(8).max(100),
    new_password: z.string().min(8).max(100),
  })
  .strict();

export const updatePreferencesSchema = z
  .object({
    theme: z.string().max(32).optional(),
    emailDigest: z.boolean().optional(),
    pushAlerts: z.boolean().optional(),
    defaultHostelFilter: z.preprocess(
      (v) => (v === "" ? null : v),
      prismaStringId.nullable().optional(),
    ),
  })
  .strict();
