import { HttpError } from "../../lib/httpError.js";
import * as repo from "./dashboard.repository.js";
import { resolveChartRange } from "./dashboard.validation.js";

/**
 * @param {{ from?: string; to?: string }} query
 */
export async function getStats() {
  return repo.getDashboardStats();
}

export async function getActivity() {
  const items = await repo.getRecentActivity(25);
  return { items };
}

/**
 * @param {{ from?: string; to?: string }} query
 */
export async function getCharts(query) {
  try {
    const range = resolveChartRange(query);
    return await repo.getChartsPayload(range);
  } catch {
    throw new HttpError(400, "Invalid chart range");
  }
}
