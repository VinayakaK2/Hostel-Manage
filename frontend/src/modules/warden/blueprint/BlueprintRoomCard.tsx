import { memo, useMemo } from "react";
import type { BlueprintDisplayStatus } from "@/stores/wardenBlueprintStore";
import type { BlueprintFloorRoom } from "@/modules/warden/blueprint/blueprintGeometry";
import { roomPixelRect } from "@/modules/warden/blueprint/blueprintGeometry";

/** Occupancy: empty = green, partial = yellow, full = red. */
const STATUS_CLASS: Record<BlueprintDisplayStatus, string> = {
  EMPTY:
    "border-emerald-500/50 bg-emerald-950/40 text-emerald-100/95 shadow-[inset_0_1px_0_rgba(167,243,208,0.06)] hover:shadow-[0_0_26px_rgba(52,211,153,0.28)]",
  PARTIAL:
    "border-yellow-500/45 bg-yellow-950/45 text-yellow-100/95 shadow-[inset_0_1px_0_rgba(253,224,71,0.08)] hover:shadow-[0_0_26px_rgba(234,179,8,0.28)]",
  FULL:
    "border-red-600/50 bg-red-950/55 text-red-100/95 shadow-[inset_0_1px_0_rgba(252,165,165,0.06)] hover:shadow-[0_0_26px_rgba(248,113,113,0.3)]",
  MAINTENANCE:
    "border-orange-600/50 bg-orange-950/50 text-orange-100/90 hover:shadow-[0_0_22px_rgba(251,146,60,0.22)]",
  LOCKED:
    "border-slate-500/45 bg-slate-900/55 text-slate-300/90 hover:shadow-[0_0_20px_rgba(148,163,184,0.2)]",
};

export interface BlueprintRoomCardProps {
  room: BlueprintFloorRoom;
  dimmed: boolean;
  onSelect: (id: string) => void;
}

function BlueprintRoomCardInner({ room, dimmed, onSelect }: BlueprintRoomCardProps) {
  const { left, top, width, height } = useMemo(() => roomPixelRect(room), [room]);
  const tone = STATUS_CLASS[room.display_status];
  const locked = room.display_status === "LOCKED" || room.room_status === "INACTIVE";

  return (
    <button
      type="button"
      data-room-card
      className={`room-card absolute z-[3] flex flex-col items-center justify-center gap-1 rounded-none border px-1 py-1 text-center transition-[box-shadow,filter,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/75 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${tone} ${
        locked
          ? "cursor-pointer opacity-95"
          : dimmed
            ? "pointer-events-none opacity-[0.28]"
            : "cursor-pointer hover:brightness-[1.06]"
      }`}
      style={{ left, top, width, height }}
      aria-label={`Room ${room.room_number}, ${room.occupancy} of ${room.capacity} occupied`}
      onClick={() => {
        if (!dimmed) onSelect(room.id);
      }}
    >
      <span className="select-none font-mono text-[clamp(1.05rem,2.8vmin,1.75rem)] font-semibold leading-none tracking-tight text-inherit">
        {room.room_number}
      </span>
      <span className="select-none font-mono text-[clamp(0.78rem,2vmin,1.1rem)] font-medium tabular-nums leading-none text-inherit opacity-85">
        {room.occupancy} / {room.capacity}
      </span>
    </button>
  );
}

export const BlueprintRoomCard = memo(BlueprintRoomCardInner);
