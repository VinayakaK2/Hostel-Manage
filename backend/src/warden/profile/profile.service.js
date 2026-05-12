import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logWardenActivity } from "../../lib/wardenActivityLog.js";

/**
 * @param {string} wardenId
 * @param {string} hostelId
 */
export async function getProfile(wardenId, hostelId) {
  const warden = await prisma.warden.findFirst({
    where: { id: wardenId, assigned_hostel_id: hostelId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      created_at: true,
      updated_at: true,
      assigned_hostel: { select: { id: true, name: true, type: true, capacity: true, status: true } },
    },
  });
  if (!warden) throw new HttpError(404, "Profile not found");
  return warden;
}

/**
 * @param {string} wardenId
 * @param {string} hostelId
 * @param {import("zod").infer<typeof import("./profile.validation.js").updateWardenProfileSchema>} input
 */
export async function updateProfile(wardenId, hostelId, input) {
  const current = await prisma.warden.findFirst({
    where: { id: wardenId, assigned_hostel_id: hostelId },
    select: { id: true },
  });
  if (!current) throw new HttpError(404, "Profile not found");

  if (input.email) {
    const clash = await prisma.warden.findFirst({
      where: { email: input.email, NOT: { id: wardenId } },
    });
    if (clash) throw new HttpError(400, "Email already in use");
  }

  const warden = await prisma.warden.update({
    where: { id: wardenId },
    data: {
      name: input.name ?? undefined,
      email: input.email ?? undefined,
      phone: input.phone === null ? null : input.phone ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      created_at: true,
      updated_at: true,
      assigned_hostel: { select: { id: true, name: true, type: true, capacity: true, status: true } },
    },
  });

  await logWardenActivity({
    hostelId,
    type: "PROFILE_UPDATED",
    title: "Profile updated",
    metadata: {},
    actorId: wardenId,
  });

  return warden;
}

/**
 * @param {string} wardenId
 * @param {string} hostelId
 * @param {import("zod").infer<typeof import("./profile.validation.js").updateWardenPasswordSchema>} input
 */
export async function updatePassword(wardenId, hostelId, input) {
  const warden = await prisma.warden.findFirst({
    where: { id: wardenId, assigned_hostel_id: hostelId },
  });
  if (!warden) throw new HttpError(404, "Profile not found");

  const ok = await bcrypt.compare(input.current_password, warden.password_hash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");

  const password_hash = await bcrypt.hash(input.new_password, 12);
  await prisma.warden.update({ where: { id: wardenId }, data: { password_hash } });

  await logWardenActivity({
    hostelId,
    type: "PASSWORD_CHANGED",
    title: "Password changed",
    metadata: {},
    actorId: wardenId,
  });

  return { success: true };
}
