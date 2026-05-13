import type { z } from "zod";
import { blueprintFloorRoomSchema } from "@/modules/warden/api/schemas";

export type BlueprintFloorRoom = z.infer<typeof blueprintFloorRoomSchema>;

/** Interior size of one grid cell (room footprint) — larger for map-like scale. */
export const BLUEPRINT_GRID_CELL = 260;
/** Structural wall thickness between adjacent cells (shared partition). */
export const BLUEPRINT_STRUCT_WALL = 5;
/** Outer margin around the building slab. */
export const BLUEPRINT_PAD = 48;

export function gridStrideX(): number {
  return BLUEPRINT_GRID_CELL + BLUEPRINT_STRUCT_WALL;
}

export function gridStrideY(): number {
  return BLUEPRINT_GRID_CELL + BLUEPRINT_STRUCT_WALL;
}

/**
 * Pixel rect for a room occupying w×h grid cells at (x,y).
 * Adjacent rooms share a single STRUCT_WALL line (no floating gaps).
 */
export function roomPixelRect(room: BlueprintFloorRoom): { left: number; top: number; width: number; height: number } {
  const sx = gridStrideX();
  const sy = gridStrideY();
  const w = Math.max(1, room.width);
  const h = Math.max(1, room.height);
  return {
    left: BLUEPRINT_PAD + room.x * sx,
    top: BLUEPRINT_PAD + room.y * sy,
    width: w * BLUEPRINT_GRID_CELL + (w - 1) * BLUEPRINT_STRUCT_WALL,
    height: h * BLUEPRINT_GRID_CELL + (h - 1) * BLUEPRINT_STRUCT_WALL,
  };
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
