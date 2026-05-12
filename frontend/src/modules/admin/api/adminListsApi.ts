import { adminRequest, AdminClientError } from "@/lib/api/adminClient";
import {
  hostelListResponseSchema,
  notificationListResponseSchema,
  roomListResponseSchema,
  studentListResponseSchema,
  studentRowSchema,
  wardenListResponseSchema,
  wardenRowSchema,
  hostelRowSchema,
} from "@/modules/admin/api/schemas";
import { z } from "zod";

function parseData<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AdminClientError("MALFORMED", 500, `${label}: unexpected response`);
  }
  return parsed.data;
}

export type StudentRow = z.infer<typeof studentRowSchema>;
export type WardenRow = z.infer<typeof wardenRowSchema>;
export type HostelRow = z.infer<typeof hostelRowSchema>;

export async function listStudents(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: "MALE" | "FEMALE";
    status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
    hostelId?: string;
    sort?: string;
  },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.gender) qs.set("gender", params.gender);
  if (params.status) qs.set("status", params.status);
  if (params.hostelId) qs.set("hostelId", params.hostelId);
  if (params.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  const data = await adminRequest<unknown>(`/api/admin/students${q ? `?${q}` : ""}`, {
    signal,
  });
  return parseData(studentListResponseSchema, data, "Students list");
}

export async function listWardens(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    hostelId?: string;
    sort?: string;
  },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.hostelId) qs.set("hostelId", params.hostelId);
  if (params.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  const data = await adminRequest<unknown>(`/api/admin/wardens${q ? `?${q}` : ""}`, {
    signal,
  });
  return parseData(wardenListResponseSchema, data, "Wardens list");
}

export async function listHostels(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: "BOYS" | "GIRLS";
    status?: "ACTIVE" | "INACTIVE";
    sort?: string;
  },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  if (params.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  const data = await adminRequest<unknown>(`/api/admin/hostels${q ? `?${q}` : ""}`, {
    signal,
  });
  return parseData(hostelListResponseSchema, data, "Hostels list");
}

export async function fetchHostelRooms(hostelId: string, signal?: AbortSignal) {
  const data = await adminRequest<unknown>(`/api/admin/hostels/${hostelId}/rooms`, {
    signal,
  });
  return parseData(roomListResponseSchema, data, "Hostel rooms");
}

export async function createStudent(body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/students", {
    method: "POST",
    body,
    signal,
  });
}

export async function updateStudent(id: string, body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>(`/api/admin/students/${id}`, {
    method: "PATCH",
    body,
    signal,
  });
}

export async function transferStudentRoom(
  id: string,
  roomId: string,
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/students/${id}/room`, {
    method: "PATCH",
    body: { room_id: roomId },
    signal,
  });
}

export async function setStudentStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE",
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/students/${id}/status`, {
    method: "PATCH",
    body: { status },
    signal,
  });
}

export async function createWarden(body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/wardens", { method: "POST", body, signal });
}

export async function updateWarden(id: string, body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>(`/api/admin/wardens/${id}`, {
    method: "PATCH",
    body,
    signal,
  });
}

export async function assignWardenHostel(
  id: string,
  hostel_id: string | null,
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/wardens/${id}/hostel`, {
    method: "PATCH",
    body: { hostel_id },
    signal,
  });
}

export async function setWardenStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE",
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/wardens/${id}/status`, {
    method: "PATCH",
    body: { status },
    signal,
  });
}

export async function resetWardenPassword(
  id: string,
  new_password: string,
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/wardens/${id}/reset-password`, {
    method: "POST",
    body: { new_password },
    signal,
  });
}

export async function createHostel(body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/hostels", { method: "POST", body, signal });
}

export async function updateHostel(id: string, body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>(`/api/admin/hostels/${id}`, {
    method: "PATCH",
    body,
    signal,
  });
}

export async function setHostelStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE",
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/hostels/${id}/status`, {
    method: "PATCH",
    body: { status },
    signal,
  });
}

export async function createHostelRoom(
  hostelId: string,
  body: unknown,
  signal?: AbortSignal,
) {
  return adminRequest<unknown>(`/api/admin/hostels/${hostelId}/rooms`, {
    method: "POST",
    body,
    signal,
  });
}

export async function fetchReportsSummary(
  params: { from: string; to: string; hostelId?: string },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  if (params.hostelId) qs.set("hostelId", params.hostelId);
  return adminRequest<unknown>(`/api/admin/reports/summary?${qs.toString()}`, { signal });
}

export async function fetchNotificationsPage(page = 1, signal?: AbortSignal) {
  const data = await adminRequest<unknown>(`/api/admin/notifications?page=${page}&limit=20`, {
    signal,
  });
  return parseData(notificationListResponseSchema, data, "Notifications list");
}

export async function markNotificationRead(id: string, signal?: AbortSignal) {
  return adminRequest<unknown>(`/api/admin/notifications/${id}/read`, {
    method: "PATCH",
    signal,
  });
}

export async function fetchAdminSettings(signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/settings", { signal });
}

export async function patchAdminSettings(body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/settings", { method: "PATCH", body, signal });
}

export async function fetchAdminProfile(signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/profile", { signal });
}

export async function patchAdminProfile(body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/profile", { method: "PATCH", body, signal });
}

export async function patchAdminPassword(body: unknown, signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/profile/password", {
    method: "PATCH",
    body,
    signal,
  });
}

export async function fetchAdminProfileActivity(signal?: AbortSignal) {
  return adminRequest<unknown>("/api/admin/profile/activity", { signal });
}
