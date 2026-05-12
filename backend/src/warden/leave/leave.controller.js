import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./leave.service.js";
import { listLeaveRecordsQuerySchema } from "./leave.validation.js";

export const list = asyncHandler(async (req, res) => {
  const parsed = listLeaveRecordsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const { hostelId } = req.warden;
  const q = parsed.data;
  const { total, items } = await service.listLeaveRecords(q, hostelId);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});
