import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./students.service.js";
import {
  createWardenStudentSchema,
  listWardenStudentsQuerySchema,
  transferWardenRoomSchema,
  updateWardenStudentSchema,
} from "./students.validation.js";

export const list = asyncHandler(async (req, res) => {
  const parsed = listWardenStudentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const { hostelId } = req.warden;
  const q = parsed.data;
  const { items, total } = await service.listStudents(q, hostelId);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const rooms = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.listRooms(hostelId);
  res.json({ success: true, message: "OK", data });
});

export const getOne = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const student = await service.getStudent(req.params.id, hostelId);
  res.json({ success: true, message: "OK", data: student });
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createWardenStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { hostelId, wardenId } = req.warden;
  const student = await service.createStudent(parsed.data, hostelId, wardenId);
  res.status(201).json({ success: true, message: "Student created", data: student });
});

export const update = asyncHandler(async (req, res) => {
  const parsed = updateWardenStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { hostelId, wardenId } = req.warden;
  const student = await service.updateStudent(req.params.id, parsed.data, hostelId, wardenId);
  res.json({ success: true, message: "Student updated", data: student });
});

export const transferRoom = asyncHandler(async (req, res) => {
  const parsed = transferWardenRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { hostelId, wardenId } = req.warden;
  const student = await service.transferStudentRoom(
    req.params.id,
    parsed.data.room_id,
    hostelId,
    wardenId,
  );
  res.json({ success: true, message: "Room transferred", data: student });
});

export const disable = asyncHandler(async (req, res) => {
  const { hostelId, wardenId } = req.warden;
  const student = await service.disableStudent(req.params.id, hostelId, wardenId);
  res.json({ success: true, message: "Student disabled", data: student });
});
