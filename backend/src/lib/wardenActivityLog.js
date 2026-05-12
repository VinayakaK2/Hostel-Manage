import { prisma } from "./prisma.js";

/**
 * @param {{ hostelId: string; type: string; title: string; metadata?: unknown; actorId?: string | null }} input
 */
export async function logWardenActivity(input) {
  await prisma.wardenActivity.create({
    data: {
      hostel_id: input.hostelId,
      type: input.type,
      title: input.title,
      metadata: input.metadata === undefined ? undefined : input.metadata,
      actor_id: input.actorId ?? null,
    },
  });
}
