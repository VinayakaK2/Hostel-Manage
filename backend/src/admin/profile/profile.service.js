import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logAdminActivity } from "../../lib/activityLog.js";

export async function getProfile(adminId) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      preferences: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) throw new HttpError(404, "Profile not found");
  return admin;
}

/**
 * @param {string} adminId
 * @param {import("zod").infer<typeof import("./profile.validation.js").updateProfileSchema>} input
 */
export async function updateProfile(adminId, input) {
  if (input.email) {
    const clash = await prisma.admin.findFirst({
      where: { email: input.email, NOT: { id: adminId } },
    });
    if (clash) throw new HttpError(400, "Email already in use");
  }

  const admin = await prisma.admin.update({
    where: { id: adminId },
    data: {
      name: input.name ?? undefined,
      email: input.email ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      preferences: true,
      created_at: true,
      updated_at: true,
    },
  });

  await logAdminActivity({
    type: "ADMIN_PROFILE_UPDATED",
    title: "Profile updated",
    metadata: {},
    actorId: adminId,
    actorType: "ADMIN",
  });

  return admin;
}

/**
 * @param {string} adminId
 * @param {import("zod").infer<typeof import("./profile.validation.js").updatePasswordSchema>} input
 */
export async function updatePassword(adminId, input) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new HttpError(404, "Profile not found");

  const ok = await bcrypt.compare(input.current_password, admin.password_hash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");

  const password_hash = await bcrypt.hash(input.new_password, 12);
  await prisma.admin.update({ where: { id: adminId }, data: { password_hash } });

  await logAdminActivity({
    type: "ADMIN_PASSWORD_CHANGED",
    title: "Password changed",
    metadata: {},
    actorId: adminId,
    actorType: "ADMIN",
  });

  return { success: true };
}

/**
 * @param {string} adminId
 */
export async function listActivity(adminId) {
  return prisma.adminActivity.findMany({
    where: { actor_id: adminId },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      metadata: true,
      created_at: true,
    },
  });
}

/**
 * @param {string} adminId
 */
export async function getSettings(adminId) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { preferences: true },
  });
  if (!admin) throw new HttpError(404, "Settings not found");
  return admin.preferences ?? {};
}

/**
 * @param {string} adminId
 * @param {import("zod").infer<typeof import("./profile.validation.js").updatePreferencesSchema>} prefs
 */
export async function updateSettings(adminId, prefs) {
  const current = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { preferences: true },
  });
  if (!current) throw new HttpError(404, "Settings not found");

  const base =
    current.preferences && typeof current.preferences === "object" && !Array.isArray(current.preferences)
      ? /** @type {Record<string, unknown>} */ (current.preferences)
      : {};

  const next = { ...base, ...prefs };

  await prisma.admin.update({
    where: { id: adminId },
    data: { preferences: next },
  });

  await logAdminActivity({
    type: "ADMIN_SETTINGS_UPDATED",
    title: "Settings updated",
    metadata: {},
    actorId: adminId,
    actorType: "ADMIN",
  });

  return next;
}
