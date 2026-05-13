import { useCallback, useEffect, useMemo, useState } from "react";
import { WardenClientError } from "@/lib/api/wardenClient";
import { fetchWardenAttendanceByDate, submitWardenAttendance } from "@/modules/warden/api/wardenApi";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import {
  useWardenAttendanceStore,
  type AttendanceMark,
} from "@/stores/wardenAttendanceStore";

const LEAVE_PRESETS = [
  "Medical Emergency",
  "Family Function",
  "Approved Permission",
  "Personal Reason",
] as const;

function circleClass(mark: AttendanceMark, selected: AttendanceMark): string {
  const base =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const inactive = "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  if (selected !== mark) return `${base} ${inactive}`;
  if (mark === "PRESENT") {
    return `${base} border-emerald-600 bg-emerald-500 text-white shadow-md focus-visible:ring-emerald-600`;
  }
  if (mark === "ABSENT") {
    return `${base} border-red-600 bg-red-500 text-white shadow-md focus-visible:ring-red-600`;
  }
  return `${base} border-amber-600 bg-amber-500 text-white shadow-md focus-visible:ring-amber-600`;
}

export function WardenAttendancePage() {
  const selectedDate = useWardenAttendanceStore((s) => s.selectedDate);
  const setSelectedDate = useWardenAttendanceStore((s) => s.setSelectedDate);
  const drafts = useWardenAttendanceStore((s) => s.drafts);
  const setDraft = useWardenAttendanceStore((s) => s.setDraft);
  const hydrateFromServer = useWardenAttendanceStore((s) => s.hydrateFromServer);

  const [rows, setRows] = useState<
    {
      id: string;
      student_id: string;
      name: string;
      course: string;
      status: string;
      room?: { room_number: string } | null;
      attendance: { status: AttendanceMark; leave_reason: string | null } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaveModal, setLeaveModal] = useState<{ studentId: string; name: string } | null>(null);
  const [leaveReason, setLeaveReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const data = await fetchWardenAttendanceByDate(selectedDate, ac.signal);
      setRows(data);
      hydrateFromServer(data);
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, hydrateFromServer]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusFor = useCallback(
    (studentId: string, fallback: AttendanceMark | null): AttendanceMark => {
      const d = drafts[studentId];
      if (d) return d.status;
      if (fallback) return fallback;
      return "PRESENT";
    },
    [drafts],
  );

  const entriesPayload = useMemo(() => {
    return rows.map((r) => {
      const st = statusFor(r.id, r.attendance?.status ?? null);
      const leave =
        st === "LEAVE"
          ? drafts[r.id]?.leaveReason ?? r.attendance?.leave_reason ?? undefined
          : undefined;
      return {
        student_id: r.id,
        status: st,
        leave_reason: leave,
      };
    });
  }, [rows, drafts, statusFor]);

  const openLeaveModal = (studentId: string, name: string) => {
    setLeaveModal({ studentId, name });
    setLeaveReason(drafts[studentId]?.leaveReason ?? "");
  };

  const applyLeave = () => {
    if (!leaveModal) return;
    const trimmed = leaveReason.trim();
    if (trimmed.length < 3) return;
    setDraft(leaveModal.studentId, {
      studentId: leaveModal.studentId,
      status: "LEAVE",
      leaveReason: trimmed,
    });
    setLeaveModal(null);
  };

  const submit = async () => {
    for (const r of rows) {
      const st = statusFor(r.id, r.attendance?.status ?? null);
      if (st === "LEAVE") {
        const reason = drafts[r.id]?.leaveReason ?? r.attendance?.leave_reason ?? "";
        if (!reason || reason.trim().length < 3) {
          openLeaveModal(r.id, r.name);
          return;
        }
      }
    }
    setSubmitting(true);
    const ac = new AbortController();
    try {
      await submitWardenAttendance({ date: selectedDate, entries: entriesPayload }, ac.signal);
      await load();
    } catch (e) {
      alert(e instanceof WardenClientError ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const pickMark = (r: (typeof rows)[0], mark: AttendanceMark) => {
    if (mark === "LEAVE") {
      const existing = drafts[r.id]?.leaveReason ?? r.attendance?.leave_reason ?? "";
      setDraft(r.id, {
        studentId: r.id,
        status: "LEAVE",
        leaveReason: existing,
      });
      if (!existing.trim() || existing.trim().length < 3) {
        openLeaveModal(r.id, r.name);
      }
      return;
    }
    setDraft(r.id, { studentId: r.id, status: mark });
  };

  return (
    <div className="erp-page-tight flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Attendance management</h2>
          <p className="text-sm text-slate-600">
            Har student ke naam ke baad <span className="font-semibold">P</span> /{" "}
            <span className="font-semibold">A</span> / <span className="font-semibold">L</span>{" "}
            dabayein — submit se pehle bhi rang dikhega. LEAVE ke liye reason zaroori hai.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={selectedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Reload
          </Button>
          <Button type="button" isLoading={submitting} onClick={() => void submit()}>
            Submit attendance
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && !error && rows.length === 0}
        onRetry={() => void load()}
        emptyTitle="No students to mark"
        emptyDescription="Only active and on-leave residents appear here."
      >
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Student & attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const st = statusFor(r.id, r.attendance?.status ?? null);
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-600">
                            {r.student_id} · {r.course} · Room {r.room?.room_number ?? "—"}
                          </p>
                          {st === "LEAVE" ? (
                            <p className="mt-1 text-xs text-amber-900">
                              Reason: {drafts[r.id]?.leaveReason ?? r.attendance?.leave_reason ?? "Required"}
                            </p>
                          ) : null}
                        </div>
                        <div
                          className="flex shrink-0 items-center gap-2 sm:gap-2.5"
                          role="radiogroup"
                          aria-label={`Attendance for ${r.name}`}
                        >
                          {(["PRESENT", "ABSENT", "LEAVE"] as const).map((mark) => (
                            <button
                              key={mark}
                              type="button"
                              role="radio"
                              aria-checked={st === mark}
                              className={circleClass(mark, st)}
                              title={
                                mark === "PRESENT"
                                  ? "Present"
                                  : mark === "ABSENT"
                                    ? "Absent"
                                    : "Leave"
                              }
                              onClick={() => pickMark(r, mark)}
                            >
                              {mark === "PRESENT" ? "P" : mark === "ABSENT" ? "A" : "L"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AsyncState>
      </div>

      <AppModal
        open={!!leaveModal}
        title="Leave reason required"
        description={leaveModal ? `${leaveModal.name} is marked on leave.` : undefined}
        onClose={() => setLeaveModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaveModal(null)}>
              Cancel
            </Button>
            <Button onClick={applyLeave}>Save reason</Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {LEAVE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                onClick={() => setLeaveReason(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="text-sm font-medium text-slate-700">
            Reason
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
            />
          </label>
        </div>
      </AppModal>
    </div>
  );
}
