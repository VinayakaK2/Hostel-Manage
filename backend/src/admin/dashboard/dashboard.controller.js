import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./dashboard.service.js";
import { chartsQuerySchema } from "./dashboard.validation.js";

export const getStats = asyncHandler(async (_req, res) => {
  const data = await service.getStats();
  res.json({ success: true, message: "OK", data });
});

export const getActivity = asyncHandler(async (_req, res) => {
  const data = await service.getActivity();
  res.json({ success: true, message: "OK", data });
});

export const getCharts = asyncHandler(async (req, res) => {
  const parsed = chartsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const data = await service.getCharts(parsed.data);
  res.json({ success: true, message: "OK", data });
});
