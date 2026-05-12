import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminClientError, adminRequest } from "@/lib/api/adminClient";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { useAdminDashboardFiltersStore } from "@/stores/adminDashboardFiltersStore";
import { Button } from "@/components/ui/Button";

interface AnalyticsPayload {
  totals: { present: number; absent: number; leave: number; total: number; attendancePct: number };
  daily: { date: string; present: number; absent: number; leave: number; total: number }[];
  hostelWise: { hostelName: string; attendancePct: number; absent: number; leave: number }[];
}

export function AdminAttendanceAnalyticsPage() {
  const { analyticsFrom, analyticsTo, setAnalyticsRange } = useAdminDashboardFiltersStore();
  const [hostelId, setHostelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ from: analyticsFrom, to: analyticsTo });
    if (hostelId.trim()) qs.set("hostelId", hostelId.trim());
    void adminRequest<AnalyticsPayload>(`/api/admin/analytics/attendance?${qs.toString()}`, {
      signal: ac.signal,
    })
      .then(setPayload)
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load analytics.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [analyticsFrom, analyticsTo, hostelId]);

  const chartPoints = useMemo(() => {
    if (!payload) return [];
    return payload.daily.map((d) => ({
      date: d.date,
      attendancePct: d.total === 0 ? 0 : Math.round((100 * d.present) / d.total),
    }));
  }, [payload]);

  return (
    <div className="erp-page">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Analytics</p>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Attendance analytics</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Read-only operational insight. Attendance marking remains a warden workflow.
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <label className="text-xs font-semibold text-slate-600">
          From
          <input
            type="date"
            className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={analyticsFrom}
            onChange={(e) => setAnalyticsRange(e.target.value, analyticsTo)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          To
          <input
            type="date"
            className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={analyticsTo}
            onChange={(e) => setAnalyticsRange(analyticsFrom, e.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-slate-600 sm:min-w-[220px] sm:max-w-xl">
          Hostel ID (optional)
          <input
            className="w-full min-w-0 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs"
            placeholder="cuid…"
            value={hostelId}
            onChange={(e) => setHostelId(e.target.value)}
          />
        </label>
        <Button type="button" variant="secondary" onClick={() => setHostelId("")}>
          Clear hostel filter
        </Button>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        empty={false}
        onRetry={() => setAnalyticsRange(analyticsFrom, analyticsTo)}
        emptyTitle="No analytics"
        emptyDescription="No attendance rows matched this range."
      >
        {payload ? (
          <>
            <div className="erp-tile-grid-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="text-xs font-semibold uppercase text-slate-500">Attendance %</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{payload.totals.attendancePct}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="text-xs font-semibold uppercase text-slate-500">Absent marks</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{payload.totals.absent}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="text-xs font-semibold uppercase text-slate-500">Leave marks</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{payload.totals.leave}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-sm font-semibold text-slate-900">Attendance % trend</p>
              <div className="erp-chart-viewport">
                {chartPoints.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-600">
                    No points in range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="attendancePct" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-sm font-semibold text-slate-900">Hostel-wise attendance %</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Hostel</th>
                      <th className="py-2">Attendance %</th>
                      <th className="py-2">Absent</th>
                      <th className="py-2">Leave</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.hostelWise.map((h) => (
                      <tr key={h.hostelName}>
                        <td className="py-2 font-semibold text-slate-900">{h.hostelName}</td>
                        <td className="py-2">{h.attendancePct}%</td>
                        <td className="py-2">{h.absent}</td>
                        <td className="py-2">{h.leave}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </AsyncState>
    </div>
  );
}
