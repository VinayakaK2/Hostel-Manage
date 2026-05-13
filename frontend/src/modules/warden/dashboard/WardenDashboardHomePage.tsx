import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  fetchWardenDashboardActivity,
  fetchWardenDashboardStats,
} from "@/modules/warden/api/wardenApi";
import { z } from "zod";
import { wardenActivityItemSchema, wardenDashboardStatsSchema } from "@/modules/warden/api/schemas";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { IconBuilding, IconShield, IconUsers } from "@/modules/admin/components/icons";
import { StatMetricCard } from "@/modules/admin/components/StatMetricCard";
import { Button } from "@/components/ui/Button";

type Stats = z.infer<typeof wardenDashboardStatsSchema>;
type ActivityItem = z.infer<typeof wardenActivityItemSchema>;

export function WardenDashboardHomePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([
        fetchWardenDashboardStats(signal),
        fetchWardenDashboardActivity(signal),
      ]);
      setStats(s);
      setActivity(a);
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
