import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { BlueprintDisplayStatus } from "@/stores/wardenBlueprintStore";
import type { BlueprintFloorRoom } from "@/modules/warden/blueprint/blueprintGeometry";
import { roomPixelRect } from "@/modules/warden/blueprint/blueprintGeometry";

/** Minimal, blueprint-like room plate — state only via border/fill tone (no chips or badges). */
const STATUS_CLASS: Record<BlueprintDisplayStatus, string> = {
  EMPTY:
    "border-slate-500/60 bg-slate-900/40 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  PARTIAL:
    "border-amber-500/45 bg-amber-500/[0.07] text-amber-50/95 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]",
  FULL:
    "border-emerald-500/45 bg-emerald-500/[0.08] text-emerald-50/95 shadow-[inset_0_1px_0_rgba(52,211,153,0.12)]",
  MAINTENANCE:
    "border-rose-500/50 bg-rose-950/35 text-rose-100/90 shadow-[inset_0_1px_0_rgba(251,113,133,0.12)]",
  LOCKED: "border-slate-600/70 bg-slate-950/80 text-slate-300",
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
    <motion.button
      type="button"
      data-room-card
      className={`room-card absolute flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center shadow-md transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${tone} ${
        locked
          ? "cursor-pointer opacity-95"
          : dimmed
            ? "pointer-events-none opacity-[0.28]"
            : "cursor-pointer hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_12px_40px_-18px_rgba(15,23,42,0.9)]"
      }`}
      style={{ left, top, width, height }}
      aria-label={`Room ${room.room_number}, ${room.occupancy} of ${room.capacity} occupied`}
      whileHover={dimmed ? undefined : { scale: 1.012 }}
      whileTap={dimmed ? undefined : { scale: 0.992 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => {
        if (!dimmed) onSelect(room.id);
      }}
    >
      <span className="select-none font-mono text-[clamp(0.95rem,2.6vw,1.35rem)] font-semibold leading-none tracking-tight text-white">
        {room.room_number}
      </span>
      <span className="select-none font-mono text-[clamp(0.7rem,1.8vw,0.95rem)] font-medium tabular-nums text-slate-300/95">
        {room.occupancy} / {room.capacity}
      </span>
    </motion.button>
  );
}

export const BlueprintRoomCard = memo(BlueprintRoomCardInner);
