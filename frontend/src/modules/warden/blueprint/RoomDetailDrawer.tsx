import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WardenClientError } from "@/lib/api/wardenClient";
import { useAuth } from "@/hooks/useAuth";
import { fetchWardenStudents, transferWardenStudentRoom } from "@/modules/warden/api/wardenApi";
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
  /** Called after a student is successfully assigned to the open room (server-side transfer completed). */
  onStudentAssignedToRoom?: (roomId: string) => void;
}

type UnassignedRow = {
  id: string;
  student_id: string;
  name: string;
  gender: "MALE" | "FEMALE";
  class_year: number;
  course: string;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
};

export function RoomDetailDrawer({
  open,
  loading,
  detail,
  onClose,
  onStudentAssignedToRoom,
}: RoomDetailDrawerProps) {
  const { wardenHostel } = useAuth();

  const [assignSearch, setAssignSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignRows, setAssignRows] = useState<UnassignedRow[]>([]);
  const [assignTotal, setAssignTotal] = useState(0);
  const [assignListError, setAssignListError] = useState<string | null>(null);
  const [assignActionError, setAssignActionError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [showAssignFlow, setShowAssignFlow] = useState(false);

  const slotsRemaining = useMemo(() => {
    if (!detail) return 0;
    return Math.max(0, detail.room.capacity - detail.room.occupancy);
  }, [detail]);

  const canAssignStudents = useMemo(() => {
    if (!detail) return false;
    if (detail.room.room_status !== "ACTIVE") return false;
    if (detail.room.display_status === "MAINTENANCE" || detail.room.display_status === "LOCKED") return false;
    return slotsRemaining > 0;
  }, [detail, slotsRemaining]);

  const roomIdForAssign = detail?.room.id;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(assignSearch.trim()), 350);
    return () => window.clearTimeout(t);
  }, [assignSearch]);

  useEffect(() => {
    if (!open) {
      setAssignSearch("");
      setDebouncedSearch("");
      setAssignRows([]);
      setAssignTotal(0);
      setAssignListError(null);
      setAssignActionError(null);
      setAssignSuccess(null);
      setAssigningStudentId(null);
      setShowAssignFlow(false);
    }
  }, [open]);

  const filterRowForHostel = useCallback(
    (row: UnassignedRow): boolean => {
      if (!wardenHostel) return true;
      if (wardenHostel.type === "BOYS" && row.gender !== "MALE") return false;
      if (wardenHostel.type === "GIRLS" && row.gender !== "FEMALE") return false;
      return true;
    },
    [wardenHostel],
  );

  useEffect(() => {
    if (!open || loading || !detail || !canAssignStudents || !roomIdForAssign || !showAssignFlow) {
      return;
    }

    const ac = new AbortController();
    setAssignLoading(true);
    setAssignListError(null);

    void (async () => {
      try {
        const payload = await fetchWardenStudents(
          {
            page: 1,
            limit: 100,
            room_assignment: "unassigned",
            sort: "name_asc",
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
          },
          ac.signal,
        );
        if (ac.signal.aborted) return;
        const rows = payload.items.filter(filterRowForHostel) as UnassignedRow[];
        setAssignRows(rows);
        setAssignTotal(payload.meta.total);
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setAssignRows([]);
        setAssignTotal(0);
        setAssignListError(e instanceof WardenClientError ? e.message : "Could not load unassigned students.");
      } finally {
        if (!ac.signal.aborted) setAssignLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, loading, detail, canAssignStudents, roomIdForAssign, showAssignFlow, debouncedSearch, filterRowForHostel]);

  const handleAssign = useCallback(
    async (studentId: string) => {
      if (!detail?.room.id || assigningStudentId) return;
      setAssignActionError(null);
      setAssignSuccess(null);
      setAssigningStudentId(studentId);
      const ac = new AbortController();
      try {
        await transferWardenStudentRoom(studentId, detail.room.id, ac.signal);
        setAssignSuccess("Student assigned to this room.");
        onStudentAssignedToRoom?.(detail.room.id);
        setAssignRows((prev) => prev.filter((r) => r.id !== studentId));
        setAssignTotal((t) => Math.max(0, t - 1));
        window.setTimeout(() => setAssignSuccess(null), 4000);
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setAssignActionError(e instanceof WardenClientError ? e.message : "Assignment failed. Try again.");
      } finally {
        setAssigningStudentId(null);
      }
    },
    [assigningStudentId, detail?.room.id, onStudentAssignedToRoom],
  );

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

                  {canAssignStudents && !showAssignFlow ? (
                    <div className="rounded-2xl border border-brand-200/80 bg-brand-50/40 p-4 shadow-sm">
                      <p className="mb-3 text-xs text-slate-600">
                        {slotsRemaining} bed{slotsRemaining === 1 ? "" : "s"} free. Add a student who does not have a
                        room yet.
                      </p>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
                        onClick={() => setShowAssignFlow(true)}
                      >
                        Add student to this room
                      </button>
                    </div>
                  ) : null}

                  {canAssignStudents && showAssignFlow ? (
                    <div className="rounded-2xl border border-brand-200/80 bg-brand-50/40 p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Add student to this room</h3>
                          <p className="text-xs text-slate-600">
                            Only students without a room are listed ({slotsRemaining} bed
                            {slotsRemaining === 1 ? "" : "s"} free).
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setShowAssignFlow(false);
                            setAssignSearch("");
                            setDebouncedSearch("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>

                      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Search
                        <input
                          type="search"
                          value={assignSearch}
                          onChange={(e) => setAssignSearch(e.target.value)}
                          placeholder="Name, ID, course…"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          autoComplete="off"
                        />
                      </label>

                      {assignSuccess ? (
                        <p className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                          {assignSuccess}
                        </p>
                      ) : null}
                      {assignActionError ? (
                        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900">
                          {assignActionError}
                        </p>
                      ) : null}
                      {assignListError ? (
                        <p className="mb-2 text-sm font-medium text-rose-700">{assignListError}</p>
                      ) : null}

                      {assignLoading ? (
                        <div className="space-y-2">
                          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                        </div>
                      ) : assignRows.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
                          {debouncedSearch
                            ? "No unassigned students match this search."
                            : "No unassigned students are available for this hostel."}
                        </p>
                      ) : (
                        <>
                          {assignTotal > 100 ? (
                            <p className="mb-2 text-xs font-medium text-amber-800">
                              Showing up to 100 unassigned students. Refine search or use Student Management for full
                              roster.
                            </p>
                          ) : null}
                          <ul className="max-h-[min(40vh,320px)] space-y-2 overflow-y-auto pr-1">
                            {assignRows.map((s) => (
                              <li
                                key={s.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold text-slate-900">{s.name}</p>
                                  <p className="truncate text-xs text-slate-600">
                                    <span className="font-semibold">{s.student_id}</span> · {s.course} · Class{" "}
                                    {s.class_year}
                                  </p>
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                    {s.gender === "MALE" ? "Male" : "Female"}
                                    {s.status === "ON_LEAVE" ? (
                                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                                        On leave
                                      </span>
                                    ) : null}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={!!assigningStudentId || slotsRemaining <= 0}
                                  className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => void handleAssign(s.id)}
                                >
                                  {assigningStudentId === s.id ? "…" : "Assign"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  ) : null}

                  {!canAssignStudents && detail.room.room_status !== "ACTIVE" ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      This room is not active, so new assignments are disabled.
                    </p>
                  ) : !canAssignStudents && slotsRemaining <= 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      Room is at capacity. Assignments are disabled.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
