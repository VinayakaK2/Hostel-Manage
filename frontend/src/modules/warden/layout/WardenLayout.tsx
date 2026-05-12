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
    <div className="min-h-dvh bg-admin-gradient">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div
        className={`mx-auto flex min-h-dvh w-full ${isBlueprint ? "max-w-none" : "max-w-[1600px]"}`}
      >
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } transition md:translate-x-0`}
        >
          <WardenSidebar />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WardenTopbar />
          <main
            className={
              isBlueprint
                ? "flex min-h-0 flex-1 flex-col p-0"
                : "flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6"
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
