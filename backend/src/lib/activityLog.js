import { prisma } from "./prisma.js";

/**
 * @param {{ type: string; title: string; metadata?: unknown; actorId?: string | null; actorType?: "ADMIN" | "SYSTEM" }} input
 */
export async function logAdminActivity(input) {
  await prisma.adminActivity.create({
    data: {
      type: input.type,
      title: input.title,
      metadata: input.metadata === undefined ? undefined : input.metadata,
      actor_id: input.actorId ?? null,
      actor_type: input.actorType ?? "SYSTEM",
    },
  });
}
