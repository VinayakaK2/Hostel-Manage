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
import { AdminClientError } from "@/lib/api/adminClient";
import {
  fetchDashboardActivity,
  fetchDashboardCharts,
  fetchDashboardStats,
} from "@/modules/admin/api/adminDashboardApi";
import { z } from "zod";
import { activityItemSchema, dashboardStatsSchema } from "@/modules/admin/api/schemas";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { IconChart, IconShield, IconUsers } from "@/modules/admin/components/icons";
import { StatMetricCard } from "@/modules/admin/components/StatMetricCard";
import { useAdminDashboardFiltersStore } from "@/stores/adminDashboardFiltersStore";
import { Button } from "@/components/ui/Button";

type Stats = z.infer<typeof dashboardStatsSchema>;
type ActivityItem = z.infer<typeof activityItemSchema>;

const PIE_COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#1e3a8a"];

export function AdminDashboardHomePage() {
  const navigate = useNavigate();
  const chartFrom = useAdminDashboardFiltersStore((s) => s.chartFrom);
  const chartTo = useAdminDashboardFiltersStore((s) => s.chartTo);
  const setChartRange = useAdminDashboardFiltersStore((s) => s.setChartRange);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [charts, setCharts] = useState<Awaited<ReturnType<typeof fetchDashboardCharts>> | null>(
    null,
  );

  const [quickOpen, setQuickOpen] = useState<null | "student" | "warden" | "hostel">(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [s, a, c] = await Promise.all([
          fetchDashboardStats(signal),
          fetchDashboardActivity(signal),
          fetchDashboardCharts({ from: chartFrom, to: chartTo }, signal),
        ]);
        setStats(s);
        setActivity(a);
        setCharts(c);
      } catch (e) {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load dashboard.");
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

  const genderPie = useMemo(() => {
    if (!charts) return [];
    return charts.genderDistribution.map((g) => ({
      name: g.gender === "MALE" ? "Boys" : "Girls",
      value: g.count,
    }));
  }, [charts]);

  return (
    <div className="erp-page">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            Overview
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Command center
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Live operational metrics across students, hostels, wardens, and attendance signals.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Charts from
            <input
              type="date"
              className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
              value={chartFrom}
              onChange={(e) => setChartRange(e.target.value, chartTo)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            to
            <input
              type="date"
              className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
              value={chartTo}
              onChange={(e) => setChartRange(chartFrom, e.target.value)}
            />
          </label>
        </div>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        empty={false}
        onRetry={() => {
          const ac = new AbortController();
          void load(ac.signal);
        }}
      >
        {stats ? (
          <div className="erp-metric-grid">
            <StatMetricCard
              title="Total Students"
              value={String(stats.totalStudents)}
              subtitle="Active + on leave"
              icon={<IconUsers className="h-6 w-6" />}
              trendLabel="Stable enrollment"
              trendVariant="neutral"
            />
            <StatMetricCard
              title="Boys Students"
              value={String(stats.boysStudents)}
              subtitle="Across boys hostels"
              icon={<IconUsers className="h-6 w-6" />}
            />
            <StatMetricCard
              title="Girls Students"
              value={String(stats.girlsStudents)}
              subtitle="Across girls hostels"
              icon={<IconUsers className="h-6 w-6" />}
            />
            <StatMetricCard
              title="Active Wardens"
              value={String(stats.activeWardens)}
              subtitle="Operational staff"
              icon={<IconShield className="h-6 w-6" />}
            />
            <StatMetricCard
              title="Today attendance"
              value={`${stats.todayPresentCount} Present`}
              subtitle={`${stats.todayAttendancePct}% attendance today`}
              icon={<IconChart className="h-6 w-6" />}
            />
            <StatMetricCard
              title="Students On Leave"
              value={String(stats.studentsOnLeave)}
              subtitle="Operational leave load"
              icon={<IconUsers className="h-6 w-6" />}
            />
            <StatMetricCard
              title="Absent Students"
              value={String(stats.absentStudents)}
              subtitle="Today’s absent marks"
              icon={<IconChart className="h-6 w-6" />}
              trendVariant="down"
            />
          </div>
        ) : null}

        <div className="erp-panel-grid">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Attendance trend</p>
                <p className="text-xs text-slate-600">Present-rate by day</p>
              </div>
            </div>
            <div className="erp-chart-viewport">
              {charts && charts.attendanceTrend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-600">
                  No attendance data in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts?.attendanceTrend ?? []}>
                    <defs>
                      <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" domain={[0, 100]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="attendancePct"
                      stroke="#1d4ed8"
                      fill="url(#attFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Hostel occupancy</p>
                <p className="text-xs text-slate-600">Occupancy % by hostel</p>
              </div>
            </div>
            <div className="erp-chart-viewport">
              {charts && charts.occupancy.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-600">
                  No hostels available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.occupancy ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hostelName" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="occupancyPct" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Leave statistics</p>
                <p className="text-xs text-slate-600">Leave marks by day</p>
              </div>
            </div>
            <div className="erp-chart-viewport">
              {charts && charts.leaveStatistics.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-600">
                  No leave marks in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts?.leaveStatistics ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="leaveCount"
                      stroke="#1e40af"
                      fill="#bfdbfe"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Gender distribution</p>
                <p className="text-xs text-slate-600">Active + on leave students</p>
              </div>
            </div>
            <div className="erp-chart-viewport">
              {genderPie.every((x) => x.value === 0) ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-600">
                  No student records.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={genderPie} innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {genderPie.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>

        <div className="erp-main-aside">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Recent activity</p>
                <p className="text-xs text-slate-600">Latest admin and system events</p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {activity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{a.type}</p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <p className="text-sm font-semibold text-slate-900">Quick actions</p>
            <p className="mt-1 text-xs text-slate-600">Jump into high-frequency workflows</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => setQuickOpen("student")}
              >
                Add Student
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => setQuickOpen("warden")}
              >
                Add Warden
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => setQuickOpen("hostel")}
              >
                Create Hostel
              </Button>
            </div>
          </section>
        </div>
      </AsyncState>

      <AppModal
        open={quickOpen !== null}
        title={
          quickOpen === "student"
            ? "Add Student"
            : quickOpen === "warden"
              ? "Add Warden"
              : "Create Hostel"
        }
        description="Choose whether to continue in a guided page or stay on the dashboard."
        onClose={() => setQuickOpen(null)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setQuickOpen(null)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                const target =
                  quickOpen === "student"
                    ? "/admin/students"
                    : quickOpen === "warden"
                      ? "/admin/wardens"
                      : "/admin/hostels";
                setQuickOpen(null);
                navigate(target);
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          This action opens the dedicated module where validations, RBAC checks, and audit trails are
          enforced end-to-end.
        </p>
      </AppModal>
    </div>
  );
}
