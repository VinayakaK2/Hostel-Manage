import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  fetchWardenDashboardActivity,
  fetchWardenDashboardOperations,
  fetchWardenDashboardStats,
} from "@/modules/warden/api/wardenApi";
import { z } from "zod";
import { wardenActivityItemSchema, wardenDashboardStatsSchema, wardenOperationsSchema } from "@/modules/warden/api/schemas";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { IconBuilding, IconShield, IconUsers } from "@/modules/admin/components/icons";
import { StatMetricCard } from "@/modules/admin/components/StatMetricCard";
import { Button } from "@/components/ui/Button";

type Stats = z.infer<typeof wardenDashboardStatsSchema>;
type ActivityItem = z.infer<typeof wardenActivityItemSchema>;
type Operations = z.infer<typeof wardenOperationsSchema>;

export function WardenDashboardHomePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [operations, setOperations] = useState<Operations | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, o] = await Promise.all([
        fetchWardenDashboardStats(signal),
        fetchWardenDashboardActivity(signal),
        fetchWardenDashboardOperations(signal),
      ]);
      setStats(s);
      setActivity(a);
      setOperations(o);
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const activityNarrative = useCallback((row: ActivityItem) => {
    switch (row.type) {
      case "ATTENDANCE_SUBMITTED":
        return "Attendance submitted for your hostel.";
      case "STUDENT_ADDED":
        return "A new student record was created.";
      case "STUDENT_UPDATED":
        return "Student profile was updated.";
      case "STUDENT_DISABLED":
        return "A student was disabled.";
      case "STUDENT_ROOM_TRANSFER":
        return "Room assignment changed.";
      case "OBSERVATION_ADDED":
        return "Study observation logged.";
      case "OBSERVATION_UPDATED":
        return "Study observation updated.";
      case "PROFILE_UPDATED":
        return "Warden profile updated.";
      case "PASSWORD_CHANGED":
        return "Password changed.";
      default:
        return "Operational update recorded.";
    }
  }, []);

  const occ = operations?.occupancy_snapshot;

  return (
    <div className="erp-page">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Operational overview</h2>
          <p className="mt-1 text-sm text-slate-600">
            Live metrics and today&apos;s workflow signals for your assigned hostel.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load(new AbortController().signal)}>
          Refresh
        </Button>
      </div>

      <div className="erp-metric-grid">
        <StatMetricCard
          title="Total hostel students"
          value={stats ? String(stats.total_students) : "—"}
          icon={<IconUsers className="h-6 w-6" />}
          loading={loading}
          trendLabel="All records"
          trendVariant="neutral"
        />
        <StatMetricCard
          title="Present today"
          value={stats ? String(stats.present_today) : "—"}
          icon={<IconShield className="h-6 w-6" />}
          loading={loading}
          trendLabel="Marked present"
          trendVariant="up"
        />
        <StatMetricCard
          title="Absent today"
          value={stats ? String(stats.absent_today) : "—"}
          icon={<IconUsers className="h-6 w-6" />}
          loading={loading}
          trendLabel="Queued parent flow"
          trendVariant="neutral"
        />
        <StatMetricCard
          title="Students on leave"
          value={stats ? String(stats.leave_today) : "—"}
          icon={<IconBuilding className="h-6 w-6" />}
          loading={loading}
          trendLabel="Attendance-linked"
          trendVariant="neutral"
        />
        <StatMetricCard
          title="Hostel occupancy"
          value={stats ? `${stats.occupancy_percentage}%` : "—"}
          subtitle={stats ? `${stats.sheltered_count} / ${stats.hostel_capacity} beds` : undefined}
          icon={<IconBuilding className="h-6 w-6" />}
          loading={loading}
          trendLabel="Sheltered headcount vs capacity"
          trendVariant="neutral"
        />
        <StatMetricCard
          title="Pending notifications"
          value={stats ? String(stats.pending_notifications) : "—"}
          icon={<IconShield className="h-6 w-6" />}
          loading={loading}
          trendLabel="Unread in your inbox"
          trendVariant="neutral"
        />
        <StatMetricCard
          title="Study observation alerts"
          value={stats ? String(stats.observation_alerts) : "—"}
          icon={<IconShield className="h-6 w-6" />}
          loading={loading}
          trendLabel="High severity (7d)"
          trendVariant="neutral"
        />
        <StatMetricCard
          title="Attendance % (30d)"
          value={stats?.attendance_percentage_30d != null ? `${stats.attendance_percentage_30d}%` : "—"}
          icon={<IconUsers className="h-6 w-6" />}
          loading={loading}
          trendLabel="Present share of marks"
          trendVariant="neutral"
        />
      </div>

      <AsyncState
        loading={loading}
        error={error}
        empty={!stats && !error}
        onRetry={() => {
          const ac = new AbortController();
          void load(ac.signal);
        }}
        emptyTitle="No dashboard data"
        emptyDescription="Try refreshing. If the issue persists, contact the administrator."
      >
        {operations ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">Recent attendance activity</h3>
              <p className="text-xs text-slate-600">Today&apos;s marks, newest first</p>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
                {operations.recent_attendance.length === 0 ? (
                  <li className="text-slate-600">No attendance recorded yet today.</li>
                ) : (
                  operations.recent_attendance.map((row, i) => (
                    <li
                      key={`${row.student_code}-${row.at}-${i}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2 last:border-0"
                    >
                      <span className="font-medium text-slate-900">
                        {row.student_name}{" "}
                        <span className="font-normal text-slate-500">· Class {row.class_year}</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {row.status}
                        <span className="ml-2 font-normal text-slate-400">
                          {new Date(row.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">Recently added students</h3>
              <p className="text-xs text-slate-600">Latest enrollments in your hostel</p>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
                {operations.recent_students.length === 0 ? (
                  <li className="text-slate-600">No students yet.</li>
                ) : (
                  operations.recent_students.map((s) => (
                    <li
                      key={s.student_id}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2 last:border-0"
                    >
                      <span className="font-medium text-slate-900">{s.name}</span>
                      <span className="text-xs text-slate-500">
                        {s.student_id} · Class {s.class_year}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">Leave today</h3>
              <p className="text-xs text-slate-600">Students marked on leave for today&apos;s roll</p>
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
                {operations.leave_today.length === 0 ? (
                  <li className="text-slate-600">No leave marks today.</li>
                ) : (
                  operations.leave_today.map((s) => (
                    <li key={s.student_id} className="border-b border-slate-100 py-2 last:border-0">
                      <span className="font-medium text-slate-900">{s.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {s.student_id} · Class {s.class_year}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">Occupancy snapshot</h3>
              <p className="text-xs text-slate-600">Beds and rooms at a glance</p>
              {occ ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Rooms</dt>
                    <dd className="text-lg font-semibold text-slate-900">{occ.room_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Beds filled</dt>
                    <dd className="text-lg font-semibold text-slate-900">
                      {occ.occupied_beds}/{occ.total_bed_capacity}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Empty rooms</dt>
                    <dd className="text-lg font-semibold text-emerald-800">{occ.empty_rooms}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Full rooms</dt>
                    <dd className="text-lg font-semibold text-rose-800">{occ.full_rooms}</dd>
                  </div>
                </dl>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900">Notification activity</h3>
              <p className="text-xs text-slate-600">Latest inbox items</p>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                {operations.notification_activity.length === 0 ? (
                  <li className="text-slate-600">No notifications.</li>
                ) : (
                  operations.notification_activity.map((n) => (
                    <li
                      key={n.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0"
                    >
                      <span className={`font-medium ${n.read ? "text-slate-600" : "text-slate-900"}`}>
                        {n.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {n.category.replaceAll("_", " ")} · {new Date(n.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        ) : null}
      </AsyncState>

      <div className="erp-main-aside">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
            <span className="text-xs font-medium text-slate-500">Hostel-scoped audit trail</span>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {activity.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-600">No recent activity.</li>
            ) : (
              activity.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-600">{activityNarrative(row)}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
          <p className="mt-1 text-xs text-slate-600">Jump straight into daily workflows.</p>
          <div className="mt-4 grid gap-2">
            <Button type="button" onClick={() => navigate("/warden/students?class=11&create=1")}>
              Add student
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/warden/attendance")}>
              Mark attendance
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/warden/observations")}>
              Add observation
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/warden/blueprint")}>
              Room blueprint
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/warden/leave-records")}>
              View leave records
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
