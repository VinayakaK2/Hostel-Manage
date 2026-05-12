import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./profile.service.js";
import {
  updatePasswordSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "./profile.validation.js";

function adminId(req) {
  return /** @type {import("../../auth/auth.middleware.js").RequestAuth} */ (req.auth).userId;
}

export const getMe = asyncHandler(async (req, res) => {
  const data = await service.getProfile(adminId(req));
  res.json({ success: true, message: "OK", data });
});

export const patchMe = asyncHandler(async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const data = await service.updateProfile(adminId(req), parsed.data);
  res.json({ success: true, message: "Profile updated", data });
});

export const patchPassword = asyncHandler(async (req, res) => {
  const parsed = updatePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  await service.updatePassword(adminId(req), parsed.data);
  res.json({ success: true, message: "Password updated", data: null });
});

export const getActivity = asyncHandler(async (req, res) => {
  const items = await service.listActivity(adminId(req));
  res.json({ success: true, message: "OK", data: { items } });
});

export const getSettings = asyncHandler(async (req, res) => {
  const data = await service.getSettings(adminId(req));
  res.json({ success: true, message: "OK", data });
});

export const patchSettings = asyncHandler(async (req, res) => {
  const parsed = updatePreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({ success: false, message: first?.message ?? "Invalid body" });
    return;
  }
  const data = await service.updateSettings(adminId(req), parsed.data);
  res.json({ success: true, message: "Settings updated", data });
});
