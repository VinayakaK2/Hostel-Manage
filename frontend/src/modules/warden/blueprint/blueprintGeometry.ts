import type { z } from "zod";
import { blueprintFloorRoomSchema } from "@/modules/warden/api/schemas";

export type BlueprintFloorRoom = z.infer<typeof blueprintFloorRoomSchema>;

/** Interior size of one grid cell (room footprint) — large for floor-plate immersion. */
export const BLUEPRINT_GRID_CELL = 328;
/** Structural wall thickness between adjacent cells (shared partition). */
export const BLUEPRINT_STRUCT_WALL = 4;
/** Outer margin around the building slab. */
export const BLUEPRINT_PAD = 48;

export function gridStrideX(): number {
  return BLUEPRINT_GRID_CELL + BLUEPRINT_STRUCT_WALL;
}

export function gridStrideY(): number {
  return BLUEPRINT_GRID_CELL + BLUEPRINT_STRUCT_WALL;
}

/** Interior plate size in px (cells + shared walls), excluding `BLUEPRINT_PAD`. */
export function blueprintInnerPlatePixels(cols: number, rows: number): { width: number; height: number } {
  const c = Math.max(1, cols);
  const r = Math.max(1, rows);
  return {
    width: c * BLUEPRINT_GRID_CELL + Math.max(0, c - 1) * BLUEPRINT_STRUCT_WALL,
    height: r * BLUEPRINT_GRID_CELL + Math.max(0, r - 1) * BLUEPRINT_STRUCT_WALL,
  };
}

/**
 * Pixel rect for a room occupying w×h grid cells at (x,y).
 * Adjacent rooms share a single STRUCT_WALL line (no floating gaps).
 */
/** Inclusive grid span → pixel rect (same math as multi-cell rooms). */
export function regionPixelRect(
  gx0: number,
  gy0: number,
  gx1: number,
  gy1: number,
): { left: number; top: number; width: number; height: number } {
  const sx = gridStrideX();
  const sy = gridStrideY();
  const wCells = Math.max(gx0, gx1) - Math.min(gx0, gx1) + 1;
  const hCells = Math.max(gy0, gy1) - Math.min(gy0, gy1) + 1;
  const gxMin = Math.min(gx0, gx1);
  const gyMin = Math.min(gy0, gy1);
  return {
    left: BLUEPRINT_PAD + gxMin * sx,
    top: BLUEPRINT_PAD + gyMin * sy,
    width: wCells * BLUEPRINT_GRID_CELL + (wCells - 1) * BLUEPRINT_STRUCT_WALL,
    height: hCells * BLUEPRINT_GRID_CELL + (hCells - 1) * BLUEPRINT_STRUCT_WALL,
  };
}

export function roomPixelRect(room: BlueprintFloorRoom): { left: number; top: number; width: number; height: number } {
  const w = Math.max(1, room.width);
  const h = Math.max(1, room.height);
  return regionPixelRect(room.x, room.y, room.x + w - 1, room.y + h - 1);
}

/** One grid cell (e.g. corridor tile). */
export function corridorCellRect(gx: number, gy: number): { left: number; top: number; width: number; height: number } {
  const sx = gridStrideX();
  const sy = gridStrideY();
  return {
    left: BLUEPRINT_PAD + gx * sx,
    top: BLUEPRINT_PAD + gy * sy,
    width: BLUEPRINT_GRID_CELL,
    height: BLUEPRINT_GRID_CELL,
  };
}

export function collectOccupiedGridCells(rooms: BlueprintFloorRoom[]): Set<string> {
  const cells = new Set<string>();
  for (const r of rooms) {
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    for (let dx = 0; dx < w; dx += 1) {
      for (let dy = 0; dy < h; dy += 1) {
        cells.add(`${r.x + dx},${r.y + dy}`);
      }
    }
  }
  return cells;
}

/**
 * Full building slab size from API grid (includes empty corridor cells).
 */
export function computeBlueprintCanvasSize(
  rooms: BlueprintFloorRoom[],
  grid: { columns: number; rows: number } | null | undefined,
): { width: number; height: number } {
  let cols = grid?.columns ?? 1;
  let rows = grid?.rows ?? 1;
  if (!grid && rooms.length > 0) {
    cols = 1;
    rows = 1;
    for (const r of rooms) {
      cols = Math.max(cols, r.x + Math.max(1, r.width));
      rows = Math.max(rows, r.y + Math.max(1, r.height));
    }
  }
  cols = Math.max(1, cols);
  rows = Math.max(1, rows);
  const width = BLUEPRINT_PAD * 2 + cols * BLUEPRINT_GRID_CELL + Math.max(0, cols - 1) * BLUEPRINT_STRUCT_WALL;
  const height = BLUEPRINT_PAD * 2 + rows * BLUEPRINT_GRID_CELL + Math.max(0, rows - 1) * BLUEPRINT_STRUCT_WALL;
  return {
    width: Math.max(520, width),
    height: Math.max(520, height),
  };
}

function gridDimensionsFromPayload(
  rooms: BlueprintFloorRoom[],
  grid: { columns: number; rows: number } | null | undefined,
): { cols: number; rows: number } {
  let cols = grid?.columns ?? 1;
  let rows = grid?.rows ?? 1;
  if (!grid && rooms.length > 0) {
    cols = 1;
    rows = 1;
    for (const r of rooms) {
      cols = Math.max(cols, r.x + Math.max(1, r.width));
      rows = Math.max(rows, r.y + Math.max(1, r.height));
    }
  }
  return { cols: Math.max(1, cols), rows: Math.max(1, rows) };
}

/** Outer building outline around the full grid (rooms + corridor void). */
export function buildingOutlineRect(
  rooms: BlueprintFloorRoom[],
  grid: { columns: number; rows: number } | null | undefined,
): { left: number; top: number; width: number; height: number } {
  const { cols, rows } = gridDimensionsFromPayload(rooms, grid);
  const innerW = cols * BLUEPRINT_GRID_CELL + Math.max(0, cols - 1) * BLUEPRINT_STRUCT_WALL;
  const innerH = rows * BLUEPRINT_GRID_CELL + Math.max(0, rows - 1) * BLUEPRINT_STRUCT_WALL;
  const inset = 12;
  return {
    left: BLUEPRINT_PAD - inset,
    top: BLUEPRINT_PAD - inset,
    width: innerW + 2 * inset,
    height: innerH + 2 * inset,
  };
}

/** List empty grid coordinates inside the building bbox (for corridor tiles). */
export function listCorridorCells(
  rooms: BlueprintFloorRoom[],
  grid: { columns: number; rows: number } | null | undefined,
): { gx: number; gy: number }[] {
  const { cols, rows } = gridDimensionsFromPayload(rooms, grid);
  const occ = collectOccupiedGridCells(rooms);
  const out: { gx: number; gy: number }[] = [];
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      if (!occ.has(`${gx},${gy}`)) out.push({ gx, gy });
    }
  }
  return out;
}

type GridSpan = { gx0: number; gx1: number; gy0: number; gy1: number };

/**
 * Merge adjacent empty cells into axis-aligned rectangles so the void reads as
 * continuous passage (not a per-cell widget grid).
 */
export function listCorridorMergedRects(
  rooms: BlueprintFloorRoom[],
  grid: { columns: number; rows: number } | null | undefined,
): { left: number; top: number; width: number; height: number }[] {
  const cells = listCorridorCells(rooms, grid);
  if (cells.length === 0) return [];

  const byGy = new Map<number, number[]>();
  for (const { gx, gy } of cells) {
    const row = byGy.get(gy);
    if (row) row.push(gx);
    else byGy.set(gy, [gx]);
  }

  type RowInt = { gx0: number; gx1: number; gy: number };
  const rowIntervals: RowInt[] = [];
  const sortedRows = [...byGy.keys()].sort((a, b) => a - b);
  for (const gy of sortedRows) {
    const gxs = [...new Set(byGy.get(gy) ?? [])].sort((a, b) => a - b);
    let i = 0;
    while (i < gxs.length) {
      const gx0 = gxs[i]!;
      let gx1 = gx0;
      i += 1;
      while (i < gxs.length) {
        const nx = gxs[i]!;
        if (nx !== gx1 + 1) break;
        gx1 = nx;
        i += 1;
      }
      rowIntervals.push({ gx0, gx1, gy });
    }
  }

  rowIntervals.sort((a, b) => a.gx0 - b.gx0 || a.gx1 - b.gx1 || a.gy - b.gy);
  const merged: GridSpan[] = [];
  let cur: GridSpan | null = null;
  for (const r of rowIntervals) {
    if (cur && cur.gx0 === r.gx0 && cur.gx1 === r.gx1 && r.gy === cur.gy1 + 1) {
      cur.gy1 = r.gy;
    } else {
      if (cur) merged.push(cur);
      cur = { gx0: r.gx0, gx1: r.gx1, gy0: r.gy, gy1: r.gy };
    }
  }
  if (cur) merged.push(cur);

  return merged.map((m) => regionPixelRect(m.gx0, m.gy0, m.gx1, m.gy1));
}
