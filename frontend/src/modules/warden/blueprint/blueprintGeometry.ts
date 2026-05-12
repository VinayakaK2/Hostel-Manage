import type { z } from "zod";
import { blueprintFloorRoomSchema } from "@/modules/warden/api/schemas";

export type BlueprintFloorRoom = z.infer<typeof blueprintFloorRoomSchema>;

/** Base room cell (px) — larger for readable floor-map scale. */
export const BLUEPRINT_CELL = 156;
/** Horizontal gap between columns (corridor / walkway rhythm). */
export const BLUEPRINT_GAP_X = 44;
/** Vertical gap between rows. */
export const BLUEPRINT_GAP_Y = 26;
/** Padding around the whole floor plate. */
export const BLUEPRINT_PAD = 56;

export function cellStrideX(): number {
  return BLUEPRINT_CELL + BLUEPRINT_GAP_X;
}

export function cellStrideY(): number {
  return BLUEPRINT_CELL + BLUEPRINT_GAP_Y;
}

/**
 * Pixel size of the absolute-positioned canvas for the current floor layout.
 */
export function computeBlueprintCanvasSize(rooms: BlueprintFloorRoom[]): { width: number; height: number } {
  const sx = cellStrideX();
  const sy = cellStrideY();
  let maxRight = BLUEPRINT_PAD + BLUEPRINT_CELL + BLUEPRINT_PAD;
  let maxBottom = BLUEPRINT_PAD + BLUEPRINT_CELL + BLUEPRINT_PAD;

  for (const r of rooms) {
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    const left = BLUEPRINT_PAD + r.x * sx;
    const top = BLUEPRINT_PAD + r.y * sy;
    const rw = w * BLUEPRINT_CELL + (w - 1) * BLUEPRINT_GAP_X;
    const rh = h * BLUEPRINT_CELL + (h - 1) * BLUEPRINT_GAP_Y;
    maxRight = Math.max(maxRight, left + rw + BLUEPRINT_PAD);
    maxBottom = Math.max(maxBottom, top + rh + BLUEPRINT_PAD);
  }

  return { width: Math.max(480, maxRight), height: Math.max(480, maxBottom) };
}

export function roomPixelRect(room: BlueprintFloorRoom): { left: number; top: number; width: number; height: number } {
  const sx = cellStrideX();
  const sy = cellStrideY();
  const w = Math.max(1, room.width);
  const h = Math.max(1, room.height);
  return {
    left: BLUEPRINT_PAD + room.x * sx,
    top: BLUEPRINT_PAD + room.y * sy,
    width: w * BLUEPRINT_CELL + (w - 1) * BLUEPRINT_GAP_X,
    height: h * BLUEPRINT_CELL + (h - 1) * BLUEPRINT_GAP_Y,
  };
}
