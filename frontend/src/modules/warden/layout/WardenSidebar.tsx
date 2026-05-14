import { NavLink } from "react-router-dom";
import { WARDEN_NAV } from "@/modules/warden/navigation";
import { useWardenLayoutStore } from "@/stores/wardenLayoutStore";
import { useAuth } from "@/hooks/useAuth";
import {
  IconBell,
  IconBuilding,
  IconChart,
  IconDashboard,
  IconLayoutGrid,
  IconLogout,
  IconUsers,
} from "@/modules/admin/components/icons";

function NavIcon({ to }: { to: string }) {
  if (to.includes("dashboard")) return <IconDashboard className="h-5 w-5" />;
  if (to.includes("blueprint")) return <IconLayoutGrid className="h-5 w-5" />;
  if (to.includes("students")) return <IconUsers className="h-5 w-5" />;
  if (to.includes("attendance")) return <IconChart className="h-5 w-5" />;
  if (to.includes("observations")) return <IconChart className="h-5 w-5" />;
  if (to.includes("leave")) return <IconChart className="h-5 w-5" />;
  if (to.includes("notifications")) return <IconBell className="h-5 w-5" />;
  return <IconDashboard className="h-5 w-5" />;
}

export function WardenSidebar() {
  const collapsed = useWardenLayoutStore((s) => s.sidebarCollapsed);
  const setMobileNavOpen = useWardenLayoutStore((s) => s.setMobileNavOpen);
  const { logout } = useAuth();

  return (
    <aside
      className={`relative z-40 flex h-full flex-col border-r border-slate-200/80 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] overflow-hidden transition-[width] duration-200 ${
        collapsed ? "w-[76px]" : "w-[280px]"
      }`}
      aria-label="Warden navigation"
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 shadow-sm border border-slate-200">
          <IconBuilding className="h-5 w-5 text-slate-700" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">Hostel Operations</p>
            <p className="truncate text-xs font-medium text-slate-500">Warden Console</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <div className="mb-2 px-3 pt-2">
          {!collapsed ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main Menu</p>
          ) : (
            <div className="mx-auto h-[1px] w-4 bg-slate-200" />
          )}
        </div>
        {WARDEN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              [
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-0 rounded-xl border border-slate-200/60 bg-white shadow-sm" />
                )}
                <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center ${
                  isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600 transition-colors"
                }`}>
                  <NavIcon to={item.to} />
                </span>
                {!collapsed ? <span className="relative z-10 truncate">{item.label}</span> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => {
            setMobileNavOpen(false);
            logout();
          }}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 group-hover:text-rose-600 transition-colors">
            <IconLogout className="h-5 w-5" />
          </span>
          {!collapsed ? <span>Logout</span> : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
