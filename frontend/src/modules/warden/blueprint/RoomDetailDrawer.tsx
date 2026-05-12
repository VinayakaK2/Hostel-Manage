import { AnimatePresence, motion } from "framer-motion";
import type { BlueprintRoomDetail } from "@/stores/wardenBlueprintStore";

function attendancePill(status: "PRESENT" | "ABSENT" | "LEAVE" | null) {
  if (!status) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
        —
      </span>
    );
  }
  if (status === "PRESENT") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
        Present
      </span>
    );
  }
  if (status === "ABSENT") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
        Absent
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
      Leave
    </span>
  );
}

export interface RoomDetailDrawerProps {
  open: boolean;
  loading: boolean;
  detail: BlueprintRoomDetail | null;
  onClose: () => void;
}

export function RoomDetailDrawer({ open, loading, detail, onClose }: RoomDetailDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close room details"
            className="fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-detail-title"
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Room detail</p>
                <h2 id="room-detail-title" className="truncate text-lg font-bold text-slate-900">
                  {loading ? "Loading…" : detail ? `Room ${detail.room.room_number}` : "Room"}
                </h2>
                {!loading && detail ? (
                  <p className="text-xs font-medium text-slate-500">Floor {detail.room.floor}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-52 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ) : !detail ? (
                <p className="text-sm font-medium text-slate-600">No data available.</p>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-50/80 to-white p-4 shadow-sm">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacity</dt>
                        <dd className="font-bold text-slate-900">{detail.room.capacity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Occupancy</dt>
                        <dd className="font-bold text-slate-900">{detail.room.occupancy}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                        <dd className="font-bold text-slate-900">{detail.room.display_status}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room state</dt>
                        <dd className="font-bold text-slate-900">{detail.room.room_status}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-900">Attendance snapshot</h3>
                    <p className="mb-2 text-xs text-slate-500">{detail.attendance_snapshot.date} (UTC)</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase text-emerald-800">Present</p>
                        <p className="text-xl font-bold text-emerald-900">{detail.attendance_snapshot.present}</p>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase text-rose-800">Absent</p>
                        <p className="text-xl font-bold text-rose-900">{detail.attendance_snapshot.absent}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase text-amber-900">Leave</p>
                        <p className="text-xl font-bold text-amber-950">{detail.attendance_snapshot.leave}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-600">Unmarked</p>
                        <p className="text-xl font-bold text-slate-800">{detail.attendance_snapshot.unmarked}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-900">Students inside</h3>
                    {detail.students.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
                        No active students assigned to this room.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {detail.students.map((s) => (
                          <li
                            key={s.id}
                            className="flex flex-col gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-slate-900">{s.name}</p>
                              {attendancePill(s.attendance_status_today)}
                            </div>
                            <p className="text-xs text-slate-600">
                              <span className="font-semibold">{s.student_id}</span> · {s.course}
                            </p>
                            <p className="text-xs text-slate-500">
                              Phone:{" "}
                              <span className="font-medium text-slate-700">{s.phone ?? "—"}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
