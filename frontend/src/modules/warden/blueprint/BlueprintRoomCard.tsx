import { memo, useMemo } from "react";
import type { BlueprintDisplayStatus } from "@/stores/wardenBlueprintStore";
import type { BlueprintFloorRoom } from "@/modules/warden/blueprint/blueprintGeometry";
import { roomPixelRect } from "@/modules/warden/blueprint/blueprintGeometry";

/** Minimal, blueprint-like room plate — state only via border/fill tone (no chips or badges). */
const STATUS_CLASS: Record<BlueprintDisplayStatus, string> = {
  EMPTY:
    "border-emerald-800/45 bg-emerald-950/35 text-emerald-100/95 shadow-[inset_0_1px_0_rgba(167,243,208,0.08)]",
  PARTIAL:
    "border-amber-700/40 bg-amber-950/30 text-amber-100/90 shadow-[inset_0_1px_0_rgba(251,191,36,0.1)]",
  FULL:
    "border-rose-800/50 bg-rose-950/40 text-rose-100/95 shadow-[inset_0_1px_0_rgba(251,113,133,0.1)]",
  MAINTENANCE:
    "border-red-950/70 bg-red-950/55 text-red-100/90 shadow-[inset_0_1px_0_rgba(127,29,29,0.35)]",
  LOCKED: "border-slate-700/75 bg-slate-950/85 text-slate-400",
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
      className={`room-card absolute flex flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${tone} ${
        locked
          ? "cursor-pointer opacity-95"
          : dimmed
            ? "pointer-events-none opacity-[0.28]"
            : "cursor-pointer hover:brightness-[1.04] hover:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.28)]"
      }`}
      style={{ left, top, width, height }}
      aria-label={`Room ${room.room_number}, ${room.occupancy} of ${room.capacity} occupied`}
      onClick={() => {
        if (!dimmed) onSelect(room.id);
      }}
    >
      <span className="select-none font-mono text-[clamp(0.95rem,2.6vw,1.35rem)] font-semibold leading-none tracking-tight text-inherit">
        {room.room_number}
      </span>
      <span className="select-none font-mono text-[clamp(0.7rem,1.8vw,0.95rem)] font-medium tabular-nums opacity-80">
        {room.occupancy} / {room.capacity}
      </span>
    </button>
  );
}

export const BlueprintRoomCard = memo(BlueprintRoomCardInner);
