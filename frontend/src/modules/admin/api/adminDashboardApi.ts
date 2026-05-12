import { AdminClientError, adminRequest } from "@/lib/api/adminClient";
import {
  activityItemSchema,
  chartsPayloadSchema,
  dashboardStatsSchema,
} from "@/modules/admin/api/schemas";
import { z } from "zod";

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AdminClientError("MALFORMED", 500, `${label}: unexpected response`);
  }
  return parsed.data;
}

export async function fetchDashboardStats(signal?: AbortSignal) {
  const data = await adminRequest<unknown>("/api/admin/dashboard/stats", {
    signal,
  });
  return parseOrThrow(dashboardStatsSchema, data, "Dashboard stats");
}

export async function fetchDashboardActivity(signal?: AbortSignal) {
  const data = await adminRequest<unknown>("/api/admin/dashboard/activity", {
    signal,
  });
  const items =
    data && typeof data === "object" && "items" in data ? (data as { items: unknown }).items : [];
  return parseOrThrow(z.array(activityItemSchema), items, "Dashboard activity");
}

export async function fetchDashboardCharts(
  params: { from?: string; to?: string },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const q = qs.toString();
  const data = await adminRequest<unknown>(
    `/api/admin/dashboard/charts${q ? `?${q}` : ""}`,
    { signal },
  );
  return parseOrThrow(chartsPayloadSchema, data, "Dashboard charts");
}