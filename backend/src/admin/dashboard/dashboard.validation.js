import { z } from "zod";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");

export const chartsQuerySchema = z
  .object({
    from: dateStr.optional(),
    to: dateStr.optional(),
  })
  .strict();

/**
 * @param {unknown} input
 */
export function parseChartsQuery(input) {
  return chartsQuerySchema.parse(input);
}

function parseIsoDate(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

/**
 * @param {{ from?: string; to?: string }} q
 */
export function resolveChartRange(q) {
  const to = q.to ? parseIsoDate(q.to) : new Date();
  const fromDefault = new Date(to);
  fromDefault.setUTCDate(fromDefault.getUTCDate() - 13);
  const from = q.from ? parseIsoDate(q.from) : fromDefault;
  if (from.getTime() > to.getTime()) {
    throw new Error("Invalid range");
  }
  return { from, to };
}
