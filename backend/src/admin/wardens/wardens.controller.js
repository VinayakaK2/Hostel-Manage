import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./wardens.service.js";
import {
  assignHostelSchema,
  createWardenSchema,
  listWardensQuerySchema,
  resetWardenPasswordSchema,
  updateWardenSchema,
  wardenStatusSchema,
} from "./wardens.validation.js";

function adminId(req) {
  return /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
}

export const list = asyncHandler(async (req, res) => {
  const parsed = listWardensQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const q = parsed.data;
  const { items, total } = await service.listWardens(q);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const warden = await service.getWarden(req.params.id);
  res.json({ success: true, message: "OK", data: warden });
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createWardenSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const warden = await service.createWarden(parsed.data, adminId(req));
  res.status(201).json({ success: true, message: "Warden created", data: warden });
});

export const update = asyncHandler(async (req, res) => {
  const parsed = updateWardenSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const warden = await service.updateWarden(req.params.id, parsed.data, adminId(req));
  res.json({ success: true, message: "Warden updated", data: warden });
});

export const assignHostel = asyncHandler(async (req, res) => {
  const parsed = assignHostelSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const warden = await service.assignHostel(
    req.params.id,
    parsed.data.hostel_id,
    adminId(req),
  );
  res.json({ success: true, message: "Assignment updated", data: warden });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const parsed = wardenStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const warden = await service.setWardenStatus(req.params.id, parsed.data.status, adminId(req));
  res.json({ success: true, message: "Status updated", data: warden });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const parsed = resetWardenPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  await service.resetPassword(req.params.id, parsed.data.new_password, adminId(req));
  res.json({ success: true, message: "Password updated", data: null });
});
