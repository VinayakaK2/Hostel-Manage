import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WardenLayoutState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
}

export const useWardenLayoutStore = create<WardenLayoutState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      toggleMobileNav: () => set({ mobileNavOpen: !get().mobileNavOpen }),
    }),
    {
      name: "hostel-warden-layout",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

export function clearWardenPersistedStores(): void {
  try {
    localStorage.removeItem("hostel-warden-layout");
    localStorage.removeItem("hostel-warden-dashboard-filters");
  } catch {
    // ignore
  }
}
