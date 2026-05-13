import { WardenClientError, wardenRequest } from "@/lib/api/wardenClient";
import {
  parseActivity,
  parseAttendanceByDate,
  parseAttendanceHistory,
  parseCharts,
  parseDashboardStats,
  parseWardenOperations,
  parseLeaveRecords,
  parseNotifications,
  parseObservation,
  parseObservations,
  parseBlueprintFloor,
  parseBlueprintOverview,
  parseBlueprintRoomDetail,
  parseParentLogs,
  parseProfile,
  parseRooms,
  parseStudentDetail,
  parseStudentListPayload,
  wardenNotificationRowSchema,
} from "@/modules/warden/api/schemas";

function guardParse<T>(fn: () => T): T {
  try {
    return fn();
  } catch {
    throw new WardenClientError("MALFORMED", 200, "Unexpected response shape");
  }
}

export async function fetchWardenDashboardStats(signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/dashboard/stats", { signal });
  return guardParse(() => parseDashboardStats(data));
}

export async function fetchWardenDashboardActivity(signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/dashboard/activity", { signal });
  return guardParse(() => parseActivity(data));
}

export async function fetchWardenDashboardCharts(
  params: { from: string; to: string },
  signal: AbortSignal,
) {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  const data = await wardenRequest<unknown>(`/api/warden/dashboard/charts?${qs.toString()}`, {
    signal,
  });
  return guardParse(() => parseCharts(data));
}

export async function fetchWardenDashboardOperations(signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/dashboard/operations", { signal });
  return guardParse(() => parseWardenOperations(data));
}

export async function fetchWardenStudents(
  params: Record<string, string | number | undefined>,
  signal: AbortSignal,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    qs.set(k, String(v));
  }
  const data = await wardenRequest<unknown>(`/api/warden/students?${qs.toString()}`, { signal });
  return guardParse(() => parseStudentListPayload(data));
}

export async function fetchWardenStudent(id: string, signal: AbortSignal) {
  const data = await wardenRequest<unknown>(`/api/warden/students/${id}`, { signal });
  return guardParse(() => parseStudentDetail(data));
}

export async function fetchWardenRooms(signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/students/rooms", { signal });
  return guardParse(() => parseRooms(data));
}

export async function fetchWardenBlueprintOverview(signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/blueprint", { signal });
  return guardParse(() => parseBlueprintOverview(data));
}

export async function fetchWardenBlueprintFloor(floor: number, signal: AbortSignal) {
  const data = await wardenRequest<unknown>(`/api/warden/blueprint/floor/${floor}`, { signal });
  return guardParse(() => parseBlueprintFloor(data));
}

export async function fetchWardenRoomBlueprintDetail(id: string, signal: AbortSignal) {
  const data = await wardenRequest<unknown>(`/api/warden/rooms/${id}`, { signal });
  return guardParse(() => parseBlueprintRoomDetail(data));
}

export async function createWardenStudent(
  body: Record<string, unknown>,
  signal: AbortSignal,
) {
  const data = await wardenRequest<unknown>("/api/warden/students", {
    method: "POST",
    body,
    signal,
  });
  return guardParse(() => parseStudentDetail(data));
}

export async function updateWardenStudent(
  id: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
) {
  const data = await wardenRequest<unknown>(`/api/warden/students/${id}`, {
    method: "PATCH",
    body,
    signal,
  });
  return guardParse(() => parseStudentDetail(data));
}

export async function transferWardenStudentRoom(
  id: string,
  roomId: string,
  signal: AbortSignal,
) {
  const data = await wardenRequest<unknown>(`/api/warden/students/${id}/transfer-room`, {
    method: "POST",
    body: { room_id: roomId },
    signal,
  });
  return guardParse(() => parseStudentDetail(data));
}

export async function disableWardenStudent(id: string, signal: AbortSignal) {
  const data = await wardenRequest<unknown>(`/api/warden/students/${id}/disable`, {
    method: "POST",
    signal,
  });
  return guardParse(() => parseStudentDetail(data));
}

export async function fetchWardenAttendanceByDate(date: string, signal: AbortSignal) {
  const data = await wardenRequest<unknown>(`/api/warden/attendance/date/${date}`, { signal });
  return guardParse(() => parseAttendanceByDate(data));
}

export async function submitWardenAttendance(
  body: { date: string; entries: { student_id: string; status: string; leave_reason?: string }[] },
  signal: AbortSignal,
) {
  return wardenRequest<{ date: string; saved: number }>("/api/warden/attendance", {
    method: "POST",
    body,
    signal,
  });
}

export async function fetchWardenAttendanceHistory(
  studentId: string,
  params: { page: number; limit: number },
  signal: AbortSignal,
) {
  const qs = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  const data = await wardenRequest<unknown>(
    `/api/warden/attendance/student/${studentId}?${qs.toString()}`,
    { signal },
  );
  return guardParse(() => parseAttendanceHistory(data));
}

export async function fetchWardenObservations(
  params: Record<string, string | number | undefined>,
  signal: AbortSignal,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    qs.set(k, String(v));
  }
  const data = await wardenRequest<unknown>(`/api/warden/observations?${qs.toString()}`, {
    signal,
  });
  return guardParse(() => parseObservations(data));
}

export async function createWardenObservation(
  body: { student_id: string; note: string; severity: string },
  signal: AbortSignal,
) {
  const data = await wardenRequest<unknown>("/api/warden/observations", {
    method: "POST",
    body,
    signal,
  });
  return guardParse(() => parseObservation(data));
}

export async function updateWardenObservation(
  id: string,
  body: { note?: string; severity?: string },
  signal: AbortSignal,
) {
  const data = await wardenRequest<unknown>(`/api/warden/observations/${id}`, {
    method: "PATCH",
    body,
    signal,
  });
  return guardParse(() => parseObservation(data));
}

export async function fetchWardenLeaveRecords(
  params: Record<string, string | number | undefined>,
  signal: AbortSignal,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    qs.set(k, String(v));
  }
  const data = await wardenRequest<unknown>(`/api/warden/leave-records?${qs.toString()}`, {
    signal,
  });
  return guardParse(() => parseLeaveRecords(data));
}

export async function fetchWardenNotifications(
  params: Record<string, string | number | undefined>,
  signal: AbortSignal,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    qs.set(k, String(v));
  }
  const data = await wardenRequest<unknown>(`/api/warden/notifications?${qs.toString()}`, {
    signal,
  });
  return guardParse(() => parseNotifications(data));
}

export async function fetchWardenParentLogs(
  params: Record<string, string | number | undefined>,
  signal: AbortSignal,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    qs.set(k, String(v));
  }
  const data = await wardenRequest<unknown>(`/api/warden/notifications/parent-logs?${qs.toString()}`, {
    signal,
  });
  return guardParse(() => parseParentLogs(data));
}

export async function markWardenNotificationRead(id: string, signal: AbortSignal) {
  const data = await wardenRequest<unknown>(`/api/warden/notifications/${id}/read`, {
    method: "PATCH",
    signal,
  });
  return guardParse(() => wardenNotificationRowSchema.parse(data));
}

export async function fetchWardenProfile(signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/profile", { signal });
  return guardParse(() => parseProfile(data));
}

export async function updateWardenProfile(body: Record<string, unknown>, signal: AbortSignal) {
  const data = await wardenRequest<unknown>("/api/warden/profile", {
    method: "PATCH",
    body,
    signal,
  });
  return guardParse(() => parseProfile(data));
}

export async function updateWardenPassword(
  body: { current_password: string; new_password: string },
  signal: AbortSignal,
) {
  return wardenRequest<{ success: boolean }>("/api/warden/profile/password", {
    method: "POST",
    body,
    signal,
  });
}
