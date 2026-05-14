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
import { motion, AnimatePresence } from "framer-motion";

function NavIcon({ to, className = "h-5 w-5" }: { to: string, className?: string }) {
  if (to.includes("dashboard")) return <IconDashboard className={className} />;
  if (to.includes("students")) return <IconUsers className={className} />;
  if (to.includes("wardens")) return <IconShield className={className} />;
  if (to.includes("hostels")) return <IconBuilding className={className} />;
  return <IconDashboard className={className} />;
}

export function AdminSidebar() {
  const collapsed = useAdminLayoutStore((s) => s.sidebarCollapsed);
  const setMobileNavOpen = useAdminLayoutStore((s) => s.setMobileNavOpen);
  const { logout } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-40 flex h-full flex-col border-r border-slate-200/80 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] overflow-hidden"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 shadow-sm border border-brand-100">
          <IconBuilding className="h-5 w-5 text-brand-600" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="min-w-0 overflow-hidden whitespace-nowrap"
            >
              <p className="truncate text-sm font-bold tracking-tight text-slate-900">Hostel ERP</p>
              <p className="truncate text-xs font-medium text-slate-500">Admin Console</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <div className="mb-2 px-3 pt-2">
          {!collapsed ? (
             <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main Menu</p>
          ) : (
             <div className="mx-auto h-[1px] w-4 bg-slate-200" />
          )}
        </div>
        
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-slate-50 text-brand-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl border border-slate-200/60 bg-white shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex h-6 w-6 items-center justify-center shrink-0 ${isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"}`}>
                  <NavIcon to={item.to} className="h-5 w-5" />
                </span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="relative z-10 truncate whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
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
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="truncate whitespace-nowrap"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
