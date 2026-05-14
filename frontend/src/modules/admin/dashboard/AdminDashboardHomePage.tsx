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
import { motion } from "framer-motion";

type Stats = z.infer<typeof dashboardStatsSchema>;
type ActivityItem = z.infer<typeof activityItemSchema>;

const PIE_COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#1e3a8a"];

import type { Variants } from "framer-motion";

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

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
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants} 
      className="erp-page"
    >
      <motion.div variants={itemVariants} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
            Overview
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Command Center
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Live operational metrics across students, hostels, wardens, and attendance signals.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <label className="flex items-center text-xs font-medium text-slate-500">
            From
            <input
              type="date"
              className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              value={chartFrom}
              onChange={(e) => setChartRange(e.target.value, chartTo)}
            />
          </label>
          <label className="flex items-center text-xs font-medium text-slate-500">
            To
            <input
              type="date"
              className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              value={chartTo}
              onChange={(e) => setChartRange(chartFrom, e.target.value)}
            />
          </label>
        </div>
      </motion.div>

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
          <motion.div variants={itemVariants} className="erp-metric-grid mt-4">
            <StatMetricCard
              title="Total Students"
              value={String(stats.totalStudents)}
              subtitle="Active + on leave"
              icon={<IconUsers className="h-5 w-5" />}
              trendLabel="Stable enrollment"
              trendVariant="neutral"
            />
            <StatMetricCard
              title="Boys Students"
              value={String(stats.boysStudents)}
              subtitle="Across boys hostels"
              icon={<IconUsers className="h-5 w-5" />}
            />
            <StatMetricCard
              title="Girls Students"
              value={String(stats.girlsStudents)}
              subtitle="Across girls hostels"
              icon={<IconUsers className="h-5 w-5" />}
            />
            <StatMetricCard
              title="Active Wardens"
              value={String(stats.activeWardens)}
              subtitle="Operational staff"
              icon={<IconShield className="h-5 w-5" />}
            />
            <StatMetricCard
              title="Today attendance"
              value={String(stats.todayPresentCount)}
              subtitle={`${stats.todayAttendancePct}% attendance today`}
              icon={<IconChart className="h-5 w-5" />}
            />
            <StatMetricCard
              title="Students On Leave"
              value={String(stats.studentsOnLeave)}
              subtitle="Operational leave load"
              icon={<IconUsers className="h-5 w-5" />}
            />
            <StatMetricCard
              title="Absent Students"
              value={String(stats.absentStudents)}
              subtitle="Today’s absent marks"
              icon={<IconChart className="h-5 w-5" />}
              trendVariant="down"
            />
          </motion.div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <motion.div variants={containerVariants} className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.section variants={itemVariants} className="rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Attendance Trend</p>
                  <p className="text-xs text-slate-500 mt-0.5">Present-rate by day</p>
                </div>
              </div>
              <div className="erp-chart-viewport h-48">
              {charts && charts.attendanceTrend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No attendance data in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts?.attendanceTrend ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontSize: '13px', fontWeight: 500 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="attendancePct"
                      stroke="#3b82f6"
                      fill="url(#attFill)"
                      strokeWidth={2}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            </motion.section>

            <motion.section variants={itemVariants} className="rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hostel Occupancy</p>
                  <p className="text-xs text-slate-500 mt-0.5">Occupancy % by hostel</p>
                </div>
              </div>
              <div className="erp-chart-viewport h-48">
              {charts && charts.occupancy.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No hostels available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.occupancy ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hostelName" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="occupancyPct" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            </motion.section>

            <motion.section variants={itemVariants} className="rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Leave Statistics</p>
                  <p className="text-xs text-slate-500 mt-0.5">Leave marks by day</p>
                </div>
              </div>
              <div className="erp-chart-viewport h-48">
              {charts && charts.leaveStatistics.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No leave marks in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts?.leaveStatistics ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leaveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="leaveCount"
                      stroke="#8b5cf6"
                      fill="url(#leaveFill)"
                      strokeWidth={2}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#7c3aed' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            </motion.section>

            <motion.section variants={itemVariants} className="rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Gender Distribution</p>
                  <p className="text-xs text-slate-500 mt-0.5">Active + on leave</p>
                </div>
              </div>
              <div className="erp-chart-viewport h-48">
              {genderPie.every((x) => x.value === 0) ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No student records.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      dataKey="value" 
                      data={genderPie} 
                      innerRadius={60} 
                      outerRadius={85} 
                      paddingAngle={5}
                      stroke="none"
                    >
                      {genderPie.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            </motion.section>
          </motion.div>

          <motion.div variants={containerVariants} className="flex flex-col gap-4">
            <motion.section variants={itemVariants} className="rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Recent Activity</p>
                <p className="text-xs text-slate-500 mt-0.5">Latest system events</p>
              </div>
            </div>
            <ul className="mt-2 divide-y divide-slate-100/80">
              {activity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3.5 group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-brand-600 transition-colors">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{a.type}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-slate-400">
                    {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section variants={itemVariants} className="rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:shadow-md">
            <p className="text-sm font-semibold text-slate-900">Quick Actions</p>
            <p className="mt-0.5 text-xs text-slate-500">Jump into high-frequency workflows</p>
            <div className="mt-5 grid grid-cols-1 gap-2.5">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start py-2.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
                onClick={() => setQuickOpen("student")}
              >
                <div className="flex items-center">
                  <span className="flex items-center justify-center w-6 h-6 rounded bg-brand-50 text-brand-600 mr-2">
                    <IconUsers className="w-3.5 h-3.5" />
                  </span>
                  Add Student
                </div>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start py-2.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
                onClick={() => setQuickOpen("warden")}
              >
                <div className="flex items-center">
                  <span className="flex items-center justify-center w-6 h-6 rounded bg-purple-50 text-purple-600 mr-2">
                    <IconShield className="w-3.5 h-3.5" />
                  </span>
                  Add Warden
                </div>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start py-2.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
                onClick={() => setQuickOpen("hostel")}
              >
                <div className="flex items-center">
                  <span className="flex items-center justify-center w-6 h-6 rounded bg-amber-50 text-amber-600 mr-2">
                    <IconChart className="w-3.5 h-3.5" />
                  </span>
                  Create Hostel
                </div>
              </Button>
            </div>
          </motion.section>
          </motion.div>
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
              Cancel
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
              Continue to Module
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This action opens the dedicated module where validations, role-based access control, and audit trails are
          enforced end-to-end.
        </p>
      </AppModal>
    </motion.div>
  );
}
