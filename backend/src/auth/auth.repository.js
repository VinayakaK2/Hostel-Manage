import { prisma } from "../lib/prisma.js";

/**
 * @typedef {import("@prisma/client").Admin} Admin
 * @typedef {import("@prisma/client").Warden} Warden
 */

/**
 * @param {string} email - normalized lowercase email
 * @returns {Promise<{ kind: "admin"; record: Admin } | { kind: "warden"; record: Warden } | null>}
 */
export async function findAccountByEmail(email) {
  const [admin, warden] = await Promise.all([
    prisma.admin.findUnique({ where: { email } }),
    prisma.warden.findUnique({ where: { email } }),
  ]);

  if (admin) return { kind: "admin", record: admin };
  if (warden) return { kind: "warden", record: warden };
  return null;
}

/**
 * @param {string} id
 * @param {"admin" | "warden"} kind
 */
export async function findAccountById(id, kind) {
  if (kind === "admin") {
    return prisma.admin.findUnique({ where: { id } });
  }
  return prisma.warden.findUnique({ where: { id } });
}

/**
 * @param {string} id
 */
export async function findHostelSummaryById(id) {
  return prisma.hostel.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, status: true },
  });
}

/**
 * @param {string} id
 */
export async function findWardenWithHostel(id) {
  return prisma.warden.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      assigned_hostel: {
        select: { id: true, name: true, type: true, status: true },
      },
    },
  });
}
