import { prisma } from "./prisma.js";
import { deliverParentMessage } from "./parentCommunication.js";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15 * 60 * 1000;

/**
 * Processes due absent-student parent notification jobs for a hostel.
 * Revalidates attendance; cancels if student is no longer absent for that date.
 * @param {string} hostelId
 */
export async function processDueAbsentParentJobs(hostelId) {
  const now = new Date();
  const due = await prisma.absentParentNotificationJob.findMany({
    where: {
      hostel_id: hostelId,
      state: "QUEUED",
      process_after: { lte: now },
    },
    take: 50,
    orderBy: { process_after: "asc" },
    include: {
      attendance: true,
      student: {
        select: {
          id: true,
          name: true,
          parent_contact: true,
          student_id: true,
        },
      },
    },
  });

  for (const job of due) {
    const fresh = await prisma.attendance.findUnique({
      where: { id: job.attendance_id },
    });

    if (!fresh || fresh.status !== "ABSENT") {
      await prisma.absentParentNotificationJob.update({
        where: { id: job.id },
        data: { state: "CANCELLED", last_error: null },
      });
      continue;
    }

    const message = `Hostel notice: ${job.student.name} (${job.student.student_id}) was marked ABSENT on ${job.attendance_date.toISOString().slice(0, 10)}. Please contact the warden if needed.`;

    const smsResult = await deliverParentMessage({
      hostelId,
      studentId: job.student_id,
      channel: "SMS",
      recipient: job.student.parent_contact,
      message,
    });

    const emailResult = await deliverParentMessage({
      hostelId,
      studentId: job.student_id,
      channel: "EMAIL",
      recipient: job.student.parent_contact.includes("@")
        ? job.student.parent_contact
        : `parent+${job.student.student_id}@placeholder.local`,
      message,
    });

    const failed = !smsResult.ok || !emailResult.ok;
    const nextAttempts = job.attempt_count + 1;

    if (!failed) {
      await prisma.$transaction([
        prisma.absentParentNotificationJob.update({
          where: { id: job.id },
          data: { state: "COMPLETED", attempt_count: nextAttempts, last_error: null },
        }),
        prisma.wardenNotification.create({
          data: {
            hostel_id: hostelId,
            category: "ABSENCE_PARENT",
            title: "Parent notified — absence",
            message: `${job.student.name} parent channels attempted successfully.`,
            read: false,
            metadata: { studentId: job.student_id, jobId: job.id },
          },
        }),
      ]);
      continue;
    }

    const errParts = [smsResult.ok ? null : smsResult.error, emailResult.ok ? null : emailResult.error].filter(
      Boolean,
    );
    const lastError = errParts.join(" | ").slice(0, 500);

    if (nextAttempts >= MAX_ATTEMPTS) {
      await prisma.$transaction([
        prisma.absentParentNotificationJob.update({
          where: { id: job.id },
          data: {
            state: "FAILED",
            attempt_count: nextAttempts,
            last_error: lastError,
          },
        }),
        prisma.wardenNotification.create({
          data: {
            hostel_id: hostelId,
            category: "NOTIFICATION_FAILURE",
            title: "Parent notification failed",
            message: `Unable to notify parent for ${job.student.name} after ${MAX_ATTEMPTS} attempts.`,
            read: false,
            metadata: { studentId: job.student_id, jobId: job.id, error: lastError },
          },
        }),
      ]);
    } else {
      await prisma.absentParentNotificationJob.update({
        where: { id: job.id },
        data: {
          attempt_count: nextAttempts,
          last_error: lastError,
          process_after: new Date(Date.now() + RETRY_DELAY_MS),
        },
      });
    }
  }
}
