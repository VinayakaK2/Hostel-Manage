import { Outlet, useLocation } from "react-router-dom";
import { useWardenLayoutStore } from "@/stores/wardenLayoutStore";
import { WardenSidebar } from "@/modules/warden/layout/WardenSidebar";
import { WardenTopbar } from "@/modules/warden/layout/WardenTopbar";

export function WardenLayout() {
  const location = useLocation();
  const isBlueprint = location.pathname.startsWith("/warden/blueprint");
  const mobileNavOpen = useWardenLayoutStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useWardenLayoutStore((s) => s.setMobileNavOpen);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden bg-admin-gradient">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } transition md:translate-x-0`}
        >
          <WardenSidebar />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!isBlueprint ? <WardenTopbar /> : null}
          <main
            className={
              isBlueprint
                ? "relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-0"
                : "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8"
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
