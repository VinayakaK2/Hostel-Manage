import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WardenClientError } from "@/lib/api/wardenClient";
import { useAuth } from "@/hooks/useAuth";
import { fetchWardenRooms, fetchWardenStudents, transferWardenStudentRoom } from "@/modules/warden/api/wardenApi";

export interface BlueprintAddStudentSheetProps {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
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

type RoomRow = {
  id: string;
  room_number: string;
  capacity: number;
  current_occupancy: number;
  floor: number;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

export function BlueprintAddStudentSheet({ open, onClose, onAssigned }: BlueprintAddStudentSheetProps) {
  const { wardenHostel } = useAuth();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [students, setStudents] = useState<UnassignedRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roomPick, setRoomPick] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const assignableRooms = useMemo(
    () =>
      [...rooms]
        .filter((r) => r.status === "ACTIVE" && r.current_occupancy < r.capacity)
        .sort((a, b) => a.floor - b.floor || a.room_number.localeCompare(b.room_number, undefined, { numeric: true })),
    [rooms],
  );

  const filterStudent = useCallback(
    (row: UnassignedRow) => {
      if (!wardenHostel) return true;
      if (wardenHostel.type === "BOYS" && row.gender !== "MALE") return false;
      if (wardenHostel.type === "GIRLS" && row.gender !== "FEMALE") return false;
      return true;
    },
    [wardenHostel],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setLoadState("idle");
      setLoadError(null);
      setStudents([]);
      setRooms([]);
      setSearch("");
      setDebouncedSearch("");
      setRoomPick({});
      setActionError(null);
      setAssigningId(null);
      return;
    }

    const ac = new AbortController();
    setLoadState("loading");
    setLoadError(null);

    void (async () => {
      try {
        const [roomList, payload] = await Promise.all([
          fetchWardenRooms(ac.signal),
          fetchWardenStudents(
            {
              page: 1,
              limit: 100,
              room_assignment: "unassigned",
              sort: "name_asc",
              ...(debouncedSearch ? { search: debouncedSearch } : {}),
            },
            ac.signal,
          ),
        ]);
        if (ac.signal.aborted) return;
        setRooms(roomList as RoomRow[]);
        setStudents(payload.items.filter(filterStudent) as UnassignedRow[]);
        setLoadState("ready");
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setLoadState("error");
        setLoadError(e instanceof WardenClientError ? e.message : "Could not load data.");
      }
    })();

    return () => ac.abort();
  }, [open, debouncedSearch, filterStudent]);

  const handleAssign = useCallback(
    async (studentId: string) => {
      const roomId = roomPick[studentId];
      if (!roomId || assigningId) return;
      setActionError(null);
      setAssigningId(studentId);
      const ac = new AbortController();
      try {
        await transferWardenStudentRoom(studentId, roomId, ac.signal);
        onAssigned();
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, current_occupancy: r.current_occupancy + 1 } : r,
          ),
        );
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setRoomPick((prev) => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setActionError(e instanceof WardenClientError ? e.message : "Could not assign room.");
      } finally {
        setAssigningId(null);
      }
    },
    [assigningId, onAssigned, roomPick],
  );

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close add student panel"
            className="fixed inset-0 z-[75] bg-slate-950/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blueprint-add-student-title"
            className="fixed inset-x-0 bottom-0 z-[80] max-h-[min(88dvh,720px)] flex flex-col rounded-t-2xl border border-slate-700/80 bg-slate-900 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-lg sm:rounded-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
              <h2 id="blueprint-add-student-title" className="text-base font-bold text-white">
                Add student to room
              </h2>
              <button
                type="button"
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            <p className="shrink-0 border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
              Pick a room for each student, then assign. Only students without a room are listed.
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {loadState === "loading" ? (
                <div className="space-y-2">
                  <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-800" />
                </div>
              ) : loadState === "error" ? (
                <p className="text-sm font-medium text-rose-300">{loadError ?? "Error"}</p>
              ) : assignableRooms.length === 0 ? (
                <p className="text-sm text-slate-400">No rooms with free beds right now.</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {debouncedSearch ? "No unassigned students match your search." : "No unassigned students."}
                </p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Search
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Name, ID, course…"
                      className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </label>
                  {actionError ? (
                    <p className="rounded-lg border border-rose-800/80 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
                      {actionError}
                    </p>
                  ) : null}
                  <ul className="space-y-3 pb-4">
                    {students.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 shadow-sm"
                      >
                        <p className="font-semibold text-slate-100">{s.name}</p>
                        <p className="text-xs text-slate-400">
                          {s.student_id} · {s.course}
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex-1"
                            value={roomPick[s.id] ?? ""}
                            onChange={(e) =>
                              setRoomPick((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                            aria-label={`Room for ${s.name}`}
                          >
                            <option value="">Select room…</option>
                            {assignableRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                F{r.floor} · Room {r.room_number} ({r.current_occupancy}/{r.capacity})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!roomPick[s.id] || !!assigningId}
                            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-50"
                            onClick={() => void handleAssign(s.id)}
                          >
                            {assigningId === s.id ? "…" : "Assign"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
