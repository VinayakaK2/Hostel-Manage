import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";

/**
 * @param {import("zod").infer<typeof import("./notifications.validation.js").listNotificationsQuerySchema>} q
 */
export async function listNotifications(q) {
  /** @type {import("@prisma/client").Prisma.AdminNotificationWhereInput} */
  const where = {};
  if (q.read === "true") where.read = true;
  if (q.read === "false") where.read = false;

  const skip = (q.page - 1) * q.limit;
  const [total, items] = await Promise.all([
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: q.limit,
      select: {
        id: true,
        category: true,
        title: true,
        message: true,
        read: true,
        created_at: true,
      },
    }),
  ]);

  return { items, total };
}

export async function markRead(id) {
  try {
    return await prisma.adminNotification.update({
      where: { id },
      data: { read: true },
      select: {
        id: true,
        category: true,
        title: true,
        message: true,
        read: true,
        created_at: true,
      },
    });
  } catch (e) {
    if (/** @type {any} */ (e)?.code === "P2025") {
      throw new HttpError(404, "Notification not found");
    }
    throw e;
  }
}
