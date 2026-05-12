import { Outlet } from "react-router-dom";
import { useAdminLayoutStore } from "@/stores/adminLayoutStore";
import { AdminSidebar } from "@/modules/admin/layout/AdminSidebar";
import { AdminTopbar } from "@/modules/admin/layout/AdminTopbar";

export function AdminLayout() {
  const mobileNavOpen = useAdminLayoutStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAdminLayoutStore((s) => s.setMobileNavOpen);

  return (
    <div className="min-h-dvh bg-admin-gradient">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="flex min-h-dvh w-full min-w-0">
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } transition md:translate-x-0`}
        >
          <AdminSidebar />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
