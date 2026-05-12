import { z } from "zod";
import type { AuthUser } from "@/types/auth";
import type { WardenHostelSummary } from "@/types/warden";

export const authUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "WARDEN"]),
});

export const wardenHostelSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["BOYS", "GIRLS"]),
});

export const loginSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    token: z.string().min(1),
    user: authUserSchema,
    hostel: wardenHostelSummarySchema.nullable().optional(),
  }),
});

export const apiErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type LoginSuccessPayload = z.infer<typeof loginSuccessSchema>;

export interface LoginSuccessResult {
  token: string;
  user: AuthUser;
  hostel: WardenHostelSummary | null;
}

export const meSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    user: authUserSchema,
    hostel: wardenHostelSummarySchema.nullable().optional(),
  }),
});
