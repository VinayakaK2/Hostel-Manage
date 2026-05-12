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

      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } transition md:translate-x-0`}
        >
          <AdminSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
