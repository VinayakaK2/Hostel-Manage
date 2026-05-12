import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./attendance.service.js";
import {
  attendanceDateParamSchema,
  studentIdParamSchema,
  submitAttendanceSchema,
} from "./attendance.validation.js";

export const byDate = asyncHandler(async (req, res) => {
  const parsed = attendanceDateParamSchema.safeParse(req.params);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid date" });
    return;
  }
  const day = service.assertNotFutureDate(parsed.data.date);
  const { hostelId } = req.warden;
  const data = await service.listStudentsWithAttendance(hostelId, day);
  res.json({ success: true, message: "OK", data });
});

export const byStudent = asyncHandler(async (req, res) => {
  const parsedId = studentIdParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    const first = parsedId.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid student" });
    return;
  }
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Math.min(100, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 20));
  const { hostelId } = req.warden;
  const { total, items } = await service.listAttendanceForStudent(parsedId.data.id, hostelId, {
    page: safePage,
    limit: safeLimit,
  });
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, safePage, safeLimit) },
  });
});

export const submit = asyncHandler(async (req, res) => {
  const parsed = submitAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { hostelId, wardenId } = req.warden;
  const data = await service.submitAttendance(parsed.data, hostelId, wardenId);
  res.status(201).json({ success: true, message: "Attendance saved", data });
});
