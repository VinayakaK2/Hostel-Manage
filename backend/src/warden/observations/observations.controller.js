import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildMeta } from "../../utils/pagination.js";
import * as service from "./observations.service.js";
import {
  createObservationSchema,
  listObservationsQuerySchema,
  updateObservationSchema,
} from "./observations.validation.js";

export const list = asyncHandler(async (req, res) => {
  const parsed = listObservationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid query" });
    return;
  }
  const { hostelId } = req.warden;
  const q = parsed.data;
  const { total, items } = await service.listObservations(q, hostelId);
  res.json({
    success: true,
    message: "OK",
    data: { items, meta: buildMeta(total, q.page, q.limit) },
  });
});

export const create = asyncHandler(async (req, res) => {
  const parsed = createObservationSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { hostelId, wardenId } = req.warden;
  const data = await service.createObservation(parsed.data, hostelId, wardenId);
  res.status(201).json({ success: true, message: "Observation created", data });
});

export const update = asyncHandler(async (req, res) => {
  const parsed = updateObservationSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { hostelId, wardenId } = req.warden;
  const data = await service.updateObservation(req.params.id, parsed.data, hostelId, wardenId);
  res.json({ success: true, message: "Observation updated", data });
});
