import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./analytics.service.js";
import { attendanceAnalyticsQuerySchema } from "./analytics.validation.js";

export const attendance = asyncHandler(async (req, res) => {
  const parsed = attendanceAnalyticsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const data = await service.getAttendanceAnalytics(parsed.data);
  res.json({ success: true, message: "OK", data });
});
