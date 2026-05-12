import { z } from "zod";

export const chartsQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.to.getTime() < val.from.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid range" });
    }
  });
