import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./profile.service.js";
import { updateWardenPasswordSchema, updateWardenProfileSchema } from "./profile.validation.js";

export const getMe = asyncHandler(async (req, res) => {
  const { wardenId, hostelId } = req.warden;
  const data = await service.getProfile(wardenId, hostelId);
  res.json({ success: true, message: "OK", data });
});

export const updateMe = asyncHandler(async (req, res) => {
  const parsed = updateWardenProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { wardenId, hostelId } = req.warden;
  const data = await service.updateProfile(wardenId, hostelId, parsed.data);
  res.json({ success: true, message: "Profile updated", data });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const parsed = updateWardenPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const { wardenId, hostelId } = req.warden;
  const data = await service.updatePassword(wardenId, hostelId, parsed.data);
  res.json({ success: true, message: "Password updated", data });
});
