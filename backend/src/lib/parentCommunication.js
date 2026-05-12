import { prisma } from "./prisma.js";

/**
 * Production hook: replace with SMS/Email provider integrations.
 * @param {{ hostelId: string; studentId: string; channel: "SMS" | "EMAIL"; recipient: string; message: string }} input
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>}
 */
export async function deliverParentMessage(input) {
  try {
    await prisma.parentCommunicationLog.create({
      data: {
        hostel_id: input.hostelId,
        student_id: input.studentId,
        channel: input.channel,
        recipient: input.recipient,
        message: input.message,
        status: "SENT",
      },
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delivery failed";
    try {
      await prisma.parentCommunicationLog.create({
        data: {
          hostel_id: input.hostelId,
          student_id: input.studentId,
          channel: input.channel,
          recipient: input.recipient,
          message: input.message,
          status: "FAILED",
          error: message,
        },
      });
    } catch {
      // ignore secondary logging failure
    }
    return { ok: false, error: message };
  }
}
