import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  fetchWardenDashboardActivity,
  fetchWardenDashboardCharts,
  fetchWardenDashboardStats,
} from "@/modules/warden/api/wardenApi";
import { z } from "zod";
import { wardenActivityItemSchema, wardenDashboardStatsSchema } from "@/modules/warden/api/schemas";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import {
  IconBuilding,
  IconChart,
  IconShield,
  IconUsers,
} from "@/modules/admin/components/icons";
import { StatMetricCard } from "@/modules/admin/components/StatMetricCard";
import { useWardenDashboardFiltersStore } from "@/stores/wardenDashboardFiltersStore";
import { Button } from "@/components/ui/Button";

type Stats = z.infer<typeof wardenDashboardStatsSchema>;
type ActivityItem = z.infer<typeof wardenActivityItemSchema>;

const PIE_COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#1e3a8a"];

export function WardenDashboardHomePage() {
  const navigate = useNavigate();
  const chartFrom = useWardenDashboardFiltersStore((s) => s.chartFrom);
  const chartTo = useWardenDashboardFiltersStore((s) => s.chartTo);
  const setChartRange = useWardenDashboardFiltersStore((s) => s.setChartRange);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [charts, setCharts] = useState<Awaited<ReturnType<typeof fetchWardenDashboardCharts>> | null>(
    null,
  );

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [s, a, c] = await Promise.all([
          fetchWardenDashboardStats(signal),
          fetchWardenDashboardActivity(signal),
          fetchWardenDashboardCharts({ from: chartFrom, to: chartTo }, signal),
        ]);
        setStats(s);
        setActivity(a);
        setCharts(c);
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setError(e instanceof WardenClientError ? e.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [chartFrom, chartTo],
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const attendanceTrend = charts?.attendance_trend ?? [];
  const leaveTrend = charts?.leave_trend ?? [];
  const dailySummary = charts?.daily_attendance_summary ?? [];
  const statusDistribution = charts?.student_status_distribution ?? [];

  const pieData = useMemo(
    () =>
      statusDistribution.map((row) => ({
        name: row.status.replaceAll("_", " "),
        value: row.count,
      })),
    [statusDistribution],
  );

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
            Live metrics scoped to your assigned hostel. Charts respect the selected range.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(from.getDate() - 13);
              setChartRange(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
            }}
          >
            Last 14 days
          </Button>
          <Button type="button" variant="secondary" onClick={() => void load(new AbortController().signal)}>
            Refresh
          </Button>
        </div>
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
          icon={<IconChart className="h-6 w-6" />}
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
          icon={<IconChart className="h-6 w-6" />}
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
        <div className="erp-panel-grid">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Attendance trend</p>
                <p className="text-xs text-slate-600">Daily counts for selected range</p>
              </div>
            </div>
            <div className="erp-chart-viewport">
              {attendanceTrend.length === 0 ? (
                <p className="text-sm text-slate-600">No attendance data in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend}>
                    <defs>
                      <linearGradient id="wardenColorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stackId="1"
                      stroke="#1d4ed8"
                      fill="url(#wardenColorPresent)"
                      name="Present"
                    />
                    <Area type="monotone" dataKey="absent" stackId="2" stroke="#f97316" fill="#fdba74" name="Absent" />
                    <Area type="monotone" dataKey="leave" stackId="3" stroke="#64748b" fill="#cbd5e1" name="Leave" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <p className="text-sm font-semibold text-slate-900">Leave trend</p>
            <p className="text-xs text-slate-600">Leave marks per day</p>
            <div className="erp-chart-viewport">
              {leaveTrend.length === 0 ? (
                <p className="text-sm text-slate-600">No leave marks in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="leave_count" fill="#2563eb" name="Leave" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <p className="text-sm font-semibold text-slate-900">Daily attendance summary</p>
            <p className="text-xs text-slate-600">Today&apos;s hostel-wide snapshot</p>
            <div className="erp-chart-viewport">
              {dailySummary.length === 0 ? (
                <p className="text-sm text-slate-600">No attendance captured for today yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySummary.map((d) => ({ name: d.status, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <p className="text-sm font-semibold text-slate-900">Student status distribution</p>
            <p className="text-xs text-slate-600">Operational mix</p>
            <div className="erp-chart-viewport">
              {pieData.length === 0 ? (
                <p className="text-sm text-slate-600">No students found.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
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
            <Button type="button" onClick={() => navigate("/warden/students?create=1")}>
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
