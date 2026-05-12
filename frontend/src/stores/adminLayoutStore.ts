import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AdminLayoutState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  notificationPanelOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  toggleNotificationPanel: () => void;
}

export const useAdminLayoutStore = create<AdminLayoutState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      notificationPanelOpen: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      toggleMobileNav: () => set({ mobileNavOpen: !get().mobileNavOpen }),
      setNotificationPanelOpen: (notificationPanelOpen) =>
        set({ notificationPanelOpen }),
      toggleNotificationPanel: () =>
        set({ notificationPanelOpen: !get().notificationPanelOpen }),
    }),
    {
      name: "hostel-admin-layout",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

export function clearAdminPersistedStores(): void {
  try {
    localStorage.removeItem("hostel-admin-layout");
    localStorage.removeItem("hostel-admin-dashboard-filters");
  } catch {
    // ignore
  }
}
