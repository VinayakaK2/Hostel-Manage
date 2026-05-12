import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .max(10);

export const submitAttendanceSchema = z
  .object({
    date: isoDate,
    entries: z
      .array(
        z
          .object({
            student_id: z.string().cuid(),
            status: z.enum(["PRESENT", "ABSENT", "LEAVE"]),
            leave_reason: z.string().trim().max(240).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict()
  .superRefine((val, ctx) => {
    val.entries.forEach((e, idx) => {
      if (e.status === "LEAVE" && (!e.leave_reason || e.leave_reason.trim().length < 3)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Leave reason is required for LEAVE status",
          path: ["entries", idx, "leave_reason"],
        });
      }
    });
  });

export const attendanceDateParamSchema = z.object({
  date: isoDate,
});

export const studentIdParamSchema = z.object({
  id: z.string().cuid(),
});
