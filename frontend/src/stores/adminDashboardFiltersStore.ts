import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 13);
  return { from: isoDate(from), to: isoDate(to) };
}

interface AdminDashboardFiltersState {
  chartFrom: string;
  chartTo: string;
  analyticsFrom: string;
  analyticsTo: string;
  reportsFrom: string;
  reportsTo: string;
  setChartRange: (from: string, to: string) => void;
  setAnalyticsRange: (from: string, to: string) => void;
  setReportsRange: (from: string, to: string) => void;
  resetChartRange: () => void;
}

const initial = defaultRange();

export const useAdminDashboardFiltersStore = create<AdminDashboardFiltersState>()(
  persist(
    (set) => ({
      chartFrom: initial.from,
      chartTo: initial.to,
      analyticsFrom: initial.from,
      analyticsTo: initial.to,
      reportsFrom: initial.from,
      reportsTo: initial.to,
      setChartRange: (chartFrom, chartTo) => set({ chartFrom, chartTo }),
      setAnalyticsRange: (analyticsFrom, analyticsTo) =>
        set({ analyticsFrom, analyticsTo }),
      setReportsRange: (reportsFrom, reportsTo) => set({ reportsFrom, reportsTo }),
      resetChartRange: () => {
        const r = defaultRange();
        set({ chartFrom: r.from, chartTo: r.to });
      },
    }),
    {
      name: "hostel-admin-dashboard-filters",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
