import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./notifications.service.js";
import {
  listNotificationsQuerySchema,
  listParentLogsQuerySchema,
} from "./notifications.validation.js";

export const list = asyncHandler(async (req, res) => {
  const parsed = listNotificationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const { hostelId } = req.warden;
  const q = parsed.data;
  const { total, items } = await service.listNotifications(q, hostelId);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const parentLogs = asyncHandler(async (req, res) => {
  const parsed = listParentLogsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const { hostelId } = req.warden;
  const q = parsed.data;
  const { total, items } = await service.listParentLogs(q, hostelId);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const markRead = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.markRead(req.params.id, hostelId);
  res.json({ success: true, message: "OK", data });
});
