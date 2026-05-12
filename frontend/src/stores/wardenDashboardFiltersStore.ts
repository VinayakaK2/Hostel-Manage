import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

interface WardenDashboardFiltersState {
  chartFrom: string;
  chartTo: string;
  setChartRange: (from: string, to: string) => void;
  resetToDefault: () => void;
}

function defaultRange() {
  const to = new Date();
  const from = addDays(to, -13);
  return { chartFrom: isoDate(from), chartTo: isoDate(to) };
}

export const useWardenDashboardFiltersStore = create<WardenDashboardFiltersState>()(
  persist(
    (set) => ({
      ...defaultRange(),
      setChartRange: (chartFrom, chartTo) => set({ chartFrom, chartTo }),
      resetToDefault: () => set(defaultRange()),
    }),
    {
      name: "hostel-warden-dashboard-filters",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
