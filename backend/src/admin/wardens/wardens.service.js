import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logAdminActivity } from "../../lib/activityLog.js";
import * as repo from "./wardens.repository.js";

/**
 * @param {import("zod").infer<typeof import("./wardens.validation.js").listWardensQuerySchema>} q
 */
export async function listWardens(q) {
  const where = repo.buildWardenWhere(q);
  const orderBy = repo.wardenOrderBy(q.sort);
  const skip = (q.page - 1) * q.limit;
  const [total, items] = await Promise.all([
    repo.countWardens(where),
    repo.listWardens(where, orderBy, skip, q.limit),
  ]);
  return { items, total };
}

export async function getWarden(id) {
  const w = await repo.findWarden(id);
  if (!w) throw new HttpError(404, "Warden not found");
  return w;
}

/**
 * @param {import("zod").infer<typeof import("./wardens.validation.js").createWardenSchema>} input
 * @param {string} adminId
 */
export async function createWarden(input, adminId) {
  const existing = await repo.findWardenByEmail(input.email);
  if (existing) throw new HttpError(400, "Email already in use");

  if (input.assigned_hostel_id) {
    const hostel = await prisma.hostel.findUnique({
      where: { id: input.assigned_hostel_id },
    });
    if (!hostel || hostel.status !== "ACTIVE") {
      throw new HttpError(400, "Invalid hostel");
    }
  }

  const password_hash = await bcrypt.hash(input.password, 12);
  const warden = await prisma.warden.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      password_hash,
      assigned_hostel_id: input.assigned_hostel_id ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      assigned_hostel: { select: { id: true, name: true, type: true } },
    },
  });

  await logAdminActivity({
    type: "WARDEN_CREATED",
    title: "Warden created",
    metadata: { wardenId: warden.id },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return warden;
}

/**
 * @param {string} id
 * @param {import("zod").infer<typeof import("./wardens.validation.js").updateWardenSchema>} input
 * @param {string} adminId
 */
export async function updateWarden(id, input, adminId) {
  const current = await prisma.warden.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Warden not found");

  if (input.email && input.email !== current.email) {
    const clash = await repo.findWardenByEmail(input.email);
    if (clash) throw new HttpError(400, "Email already in use");
  }

  const warden = await prisma.warden.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      assigned_hostel: { select: { id: true, name: true, type: true } },
    },
  });

  await logAdminActivity({
    type: "WARDEN_UPDATED",
    title: "Warden updated",
    metadata: { wardenId: id },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return warden;
}

/**
 * @param {string} id
 * @param {string | null} hostelId
 * @param {string} adminId
 */
export async function assignHostel(id, hostelId, adminId) {
  const current = await prisma.warden.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Warden not found");

  if (hostelId) {
    const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel || hostel.status !== "ACTIVE") {
      throw new HttpError(400, "Invalid hostel");
    }
  }

  const warden = await prisma.warden.update({
    where: { id },
    data: { assigned_hostel_id: hostelId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      assigned_hostel: { select: { id: true, name: true, type: true } },
    },
  });

  await logAdminActivity({
    type: "WARDEN_ASSIGNED",
    title: "Warden hostel assignment updated",
    metadata: { wardenId: id, hostelId },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return warden;
}

/**
 * @param {string} id
 * @param {import("@prisma/client").AccountStatus} status
 * @param {string} adminId
 */
export async function setWardenStatus(id, status, adminId) {
  const current = await prisma.warden.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Warden not found");

  const warden = await prisma.warden.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      assigned_hostel: { select: { id: true, name: true, type: true } },
    },
  });

  await logAdminActivity({
    type: "WARDEN_STATUS",
    title: "Warden status updated",
    metadata: { wardenId: id, status },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return warden;
}

/**
 * @param {string} id
 * @param {string} newPassword
 * @param {string} adminId
 */
export async function resetPassword(id, newPassword, adminId) {
  const current = await prisma.warden.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Warden not found");

  const password_hash = await bcrypt.hash(newPassword, 12);
  await prisma.warden.update({ where: { id }, data: { password_hash } });

  await logAdminActivity({
    type: "WARDEN_PASSWORD_RESET",
    title: "Warden password reset",
    metadata: { wardenId: id },
    actorId: adminId,
    actorType: "ADMIN",
  });

  return { success: true };
}
