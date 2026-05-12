import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./notifications.service.js";
import { listNotificationsQuerySchema } from "./notifications.validation.js";

export const list = asyncHandler(async (req, res) => {
  const parsed = listNotificationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const q = parsed.data;
  const { items, total } = await service.listNotifications(q);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const readOne = asyncHandler(async (req, res) => {
  const item = await service.markRead(req.params.id);
  res.json({ success: true, message: "OK", data: item });
});
