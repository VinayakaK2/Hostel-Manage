import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./students.service.js";
import {
  createStudentSchema,
  listStudentsQuerySchema,
  transferRoomSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from "./students.validation.js";

export const list = asyncHandler(async (req, res) => {
  const parsed = listStudentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const q = parsed.data;
  const { items, total } = await service.listStudents(q);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const student = await service.getStudent(req.params.id);
  res.json({ success: true, message: "OK", data: student });
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const adminId = /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
  const student = await service.createStudent(parsed.data, adminId);
  res.status(201).json({ success: true, message: "Student created", data: student });
});

export const update = asyncHandler(async (req, res) => {
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const adminId = /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
  const student = await service.updateStudent(req.params.id, parsed.data, adminId);
  res.json({ success: true, message: "Student updated", data: student });
});

export const transferRoom = asyncHandler(async (req, res) => {
  const parsed = transferRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const adminId = /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
  const student = await service.transferStudentRoom(
    req.params.id,
    parsed.data.room_id,
    adminId,
  );
  res.json({ success: true, message: "Room transferred", data: student });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const parsed = updateStudentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const adminId = /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
  const student = await service.setStudentStatus(req.params.id, parsed.data.status, adminId);
  res.json({ success: true, message: "Status updated", data: student });
});
