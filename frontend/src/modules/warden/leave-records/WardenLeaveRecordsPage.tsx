import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WardenClientError } from "@/lib/api/wardenClient";
import { fetchWardenLeaveRecords, fetchWardenStudents } from "@/modules/warden/api/wardenApi";
import type { z as Z } from "zod";
import { leaveRecordRowSchema } from "@/modules/warden/api/schemas";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";

type Row = Z.infer<typeof leaveRecordRowSchema>;

export function WardenLeaveRecordsPage() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const studentFilterRef = useRef<HTMLDetailsElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const page = Number(params.get("page") ?? "1") || 1;
      const [data, studs] = await Promise.all([
        fetchWardenLeaveRecords(
          {
            page,
            limit: 20,
            date_from: params.get("date_from") || undefined,
            date_to: params.get("date_to") || undefined,
            student_id: params.get("student_id") || undefined,
            leave_type: params.get("leave_type") || undefined,
            student_status: params.get("student_status") || undefined,
          },
          ac.signal,
        ),
        fetchWardenStudents({ page: 1, limit: 100 }, ac.signal),
      ]);
      setRows(data.items);
      setMeta(data.meta);
      setStudents(studs.items.map((s) => ({ id: s.id, name: `${s.name} (${s.student_id})` })));
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load leave records.");
    } finally {
      setLoading(false);
    }
  }, [params.toString()]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (!value) p.delete(key);
    else p.set(key, value);
    p.set("page", "1");
    setParams(p);
  };

  const closeStudentFilter = () => {
    const el = studentFilterRef.current;
    if (el) el.open = false;
  };

  const selectedStudentId = params.get("student_id") ?? "";
  const selectedStudentLabel =
    selectedStudentId === ""
      ? "All students"
      : (students.find((s) => s.id === selectedStudentId)?.name ?? "Student");

  return (
    <div className="erp-page-tight flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">Leave records</h2>
        <p className="text-sm text-slate-600">Attendance-linked leave marks for your hostel.</p>
      </div>

      <div className="shrink-0 erp-metric-grid">
        <label className="text-sm font-medium text-slate-700">
          From
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={params.get("date_from") ?? ""}
            onChange={(e) => setField("date_from", e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          To
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={params.get("date_to") ?? ""}
            onChange={(e) => setField("date_to", e.target.value)}
          />
        </label>
        <div className="text-sm font-medium text-slate-700">
          <span className="mb-1 block">Student</span>
          <details ref={studentFilterRef} className="relative">
            <summary className="mt-1 w-full cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm [&::-webkit-details-marker]:hidden">
              <span className="block truncate">{selectedStudentLabel}</span>
            </summary>
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  setField("student_id", "");
                  closeStudentFilter();
                }}
              >
                All students
              </button>
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    setField("student_id", s.id);
                    closeStudentFilter();
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </details>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Leave contains
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Reason filter"
            value={params.get("leave_type") ?? ""}
            onChange={(e) => setField("leave_type", e.target.value)}
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <AsyncState
          loading={loading}
          error={error}
          empty={!loading && !error && rows.length === 0}
          onRetry={() => void load()}
        >
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Student status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{r.attendance_date.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.student.name}</p>
                      <p className="text-xs text-slate-600">{r.student.student_id}</p>
                    </td>
                    <td className="px-4 py-3">{r.leave_reason ?? "—"}</td>
                    <td className="px-4 py-3">{r.student.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>

        <div className="shrink-0 flex justify-between">
          <Button
            variant="secondary"
            disabled={meta.page <= 1}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set("page", String(meta.page - 1));
              setParams(p);
            }}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={meta.page >= meta.totalPages}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set("page", String(meta.page + 1));
              setParams(p);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
