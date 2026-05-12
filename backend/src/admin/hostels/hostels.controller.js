import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import { HttpError } from "../../lib/httpError.js";
import * as service from "./hostels.service.js";
import {
  createHostelSchema,
  createRoomSchema,
  hostelStatusSchema,
  listHostelsQuerySchema,
  updateHostelSchema,
  updateRoomSchema,
} from "./hostels.validation.js";

function adminId(req) {
  return /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
}

export const patchRoom = asyncHandler(async (req, res) => {
  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const room = await service.updateRoom(req.params.roomId, parsed.data, adminId(req));
  res.json({ success: true, message: "Room updated", data: room });
});

export const list = asyncHandler(async (req, res) => {
  const parsed = listHostelsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const q = parsed.data;
  const { items, total } = await service.listHostels(q);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createHostelSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const hostel = await service.createHostel(parsed.data, adminId(req));
  res.status(201).json({ success: true, message: "Hostel created", data: hostel });
});

export const occupancy = asyncHandler(async (req, res) => {
  const data = await service.getOccupancy(req.params.hostelId);
  res.json({ success: true, message: "OK", data });
});

export const roomsList = asyncHandler(async (req, res) => {
  const items = await service.listRooms(req.params.hostelId);
  res.json({ success: true, message: "OK", data: { items } });
});

export const roomsCreate = asyncHandler(async (req, res) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const room = await service.createRoom(req.params.hostelId, parsed.data, adminId(req));
  res.status(201).json({ success: true, message: "Room created", data: room });
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await service.getHostel(req.params.hostelId);
  res.json({ success: true, message: "OK", data });
});

export const update = asyncHandler(async (req, res) => {
  const parsed = updateHostelSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  try {
    const hostel = await service.updateHostel(req.params.hostelId, parsed.data, adminId(req));
    res.json({ success: true, message: "Hostel updated", data: hostel });
  } catch (e) {
    if (/** @type {any} */ (e)?.code === "P2025") throw new HttpError(404, "Hostel not found");
    throw e;
  }
});

export const updateStatus = asyncHandler(async (req, res) => {
  const parsed = hostelStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  try {
    const hostel = await service.setHostelStatus(
      req.params.hostelId,
      parsed.data.status,
      adminId(req),
    );
    res.json({ success: true, message: "Status updated", data: hostel });
  } catch (e) {
    if (/** @type {any} */ (e)?.code === "P2025") throw new HttpError(404, "Hostel not found");
    throw e;
  }
});
