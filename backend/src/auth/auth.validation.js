import { z } from "zod";

export const loginBodySchema = z
  .object({
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
      })
      .trim()
      .min(1, "Email is required")
      .email("Invalid email format")
      .transform((v) => v.toLowerCase()),
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters"),
  })
  .strict();
