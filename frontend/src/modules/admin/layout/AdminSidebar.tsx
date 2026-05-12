import { NavLink } from "react-router-dom";
import { ADMIN_NAV } from "@/modules/admin/navigation";
import { useAdminLayoutStore } from "@/stores/adminLayoutStore";
import {
  IconBuilding,
  IconDashboard,
  IconLogout,
  IconShield,
  IconUsers,
} from "@/modules/admin/components/icons";
import { useAuth } from "@/hooks/useAuth";

function NavIcon({ to }: { to: string }) {
  if (to.includes("dashboard")) return <IconDashboard className="h-5 w-5" />;
  if (to.includes("students")) return <IconUsers className="h-5 w-5" />;
  if (to.includes("wardens")) return <IconShield className="h-5 w-5" />;
  if (to.includes("hostels")) return <IconBuilding className="h-5 w-5" />;
  return <IconDashboard className="h-5 w-5" />;
}

export function AdminSidebar() {
  const collapsed = useAdminLayoutStore((s) => s.sidebarCollapsed);
  const setMobileNavOpen = useAdminLayoutStore((s) => s.setMobileNavOpen);
  const { logout } = useAuth();

  return (
    <aside
      className={`relative z-40 flex h-full flex-col border-r border-slate-200/80 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white shadow-soft transition-[width] duration-200 ${
        collapsed ? "w-[76px]" : "w-[280px]"
      }`}
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <IconBuilding className="h-6 w-6 text-white" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Hostel ERP</p>
            <p className="truncate text-xs text-white/70">Admin Console</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-white/15 text-white shadow-insetGlass ring-1 ring-white/15"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              ].join(" ")
            }
          >
            <span className="text-white/90">
              <NavIcon to={item.to} />
            </span>
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => {
            setMobileNavOpen(false);
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
        >
          <IconLogout className="h-5 w-5" />
          {!collapsed ? <span>Logout</span> : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
