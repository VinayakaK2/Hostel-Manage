import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { prismaOrFallback } from "../../lib/optionalDb.js";

/**
 * @param {import("zod").infer<typeof import("./notifications.validation.js").listNotificationsQuerySchema>} query
 * @param {string} hostelId
 */
export async function listNotifications(query, hostelId) {
  /** @type {import("@prisma/client").Prisma.WardenNotificationWhereInput} */
  const where = { hostel_id: hostelId };
  if (query.unread_only) where.read = false;
  if (query.category) where.category = query.category;

  const skip = (query.page - 1) * query.limit;
  return prismaOrFallback(async () => {
    const [total, items] = await Promise.all([
      prisma.wardenNotification.count({ where }),
      prisma.wardenNotification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: query.limit,
        select: {
          id: true,
          category: true,
          title: true,
          message: true,
          read: true,
          metadata: true,
          created_at: true,
        },
      }),
    ]);
    return { total, items };
  }, { total: 0, items: [] });
}

/**
 * @param {string} id
 * @param {string} hostelId
 */
export async function markRead(id, hostelId) {
  const existing = await prisma.wardenNotification.findFirst({
    where: { id, hostel_id: hostelId },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, "Notification not found");

  return prisma.wardenNotification.update({
    where: { id },
    data: { read: true },
    select: {
      id: true,
      category: true,
      title: true,
      message: true,
      read: true,
      metadata: true,
      created_at: true,
    },
  });
}

/**
 * @param {import("zod").infer<typeof import("./notifications.validation.js").listParentLogsQuerySchema>} query
 * @param {string} hostelId
 */
export async function listParentLogs(query, hostelId) {
  /** @type {import("@prisma/client").Prisma.ParentCommunicationLogWhereInput} */
  const where = { hostel_id: hostelId };
  if (query.status) where.status = query.status;

  const skip = (query.page - 1) * query.limit;
  return prismaOrFallback(async () => {
    const [total, items] = await Promise.all([
      prisma.parentCommunicationLog.count({ where }),
      prisma.parentCommunicationLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: query.limit,
        select: {
          id: true,
          student_id: true,
          channel: true,
          recipient: true,
          message: true,
          status: true,
          error: true,
          created_at: true,
        },
      }),
    ]);
    return { total, items };
  }, { total: 0, items: [] });
}
