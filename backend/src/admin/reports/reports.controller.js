import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./reports.service.js";
import { reportsSummaryQuerySchema } from "./reports.validation.js";

export const summary = asyncHandler(async (req, res) => {
  const parsed = reportsSummaryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const data = await service.getSummary(parsed.data);
  res.json({ success: true, message: "OK", data });
});
