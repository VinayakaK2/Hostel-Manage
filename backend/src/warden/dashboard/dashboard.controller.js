import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./dashboard.service.js";
import { chartsQuerySchema } from "./dashboard.validation.js";

export const stats = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.getDashboardStats(hostelId);
  res.json({ success: true, message: "OK", data });
});

export const activity = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.listRecentActivity(hostelId);
  res.json({ success: true, message: "OK", data });
});

export const charts = asyncHandler(async (req, res) => {
  const parsed = chartsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const { hostelId } = req.warden;
  const data = await service.getCharts(hostelId, { from: parsed.data.from, to: parsed.data.to });
  res.json({ success: true, message: "OK", data });
});

export const operations = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.getOperationalSnapshot(hostelId);
  res.json({ success: true, message: "OK", data });
});
