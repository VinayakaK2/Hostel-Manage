import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "@/modules/admin/navigation";
import { useAdminLayoutStore } from "@/stores/adminLayoutStore";
import { useAuth } from "@/hooks/useAuth";
import { IconChevron, IconMenu, IconSearch } from "@/modules/admin/components/icons";
import { motion, AnimatePresence } from "framer-motion";

export function AdminTopbar() {
  const location = useLocation();
  const title = useMemo(() => titleForPath(location.pathname), [location.pathname]);
  const { user, logout } = useAuth();
  const toggleSidebar = useAdminLayoutStore((s) => s.toggleSidebar);
  const collapsed = useAdminLayoutStore((s) => s.sidebarCollapsed);
  const toggleMobileNav = useAdminLayoutStore((s) => s.toggleMobileNav);
  const setMobileNavOpen = useAdminLayoutStore((s) => s.setMobileNavOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/60 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 md:hidden"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
        >
          <IconMenu className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200/60 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 md:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconChevron
            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        <div className="min-w-0 flex-1 basis-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="hidden text-[11px] font-medium text-slate-500 uppercase tracking-wider sm:block">
            Enterprise overview
          </p>
        </div>

        <div className="hidden min-w-0 flex-1 basis-0 md:flex md:justify-end">
          <label className="relative w-full max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              className="w-full rounded-full border border-slate-200/80 bg-slate-50/50 py-1.5 pl-9 pr-4 text-sm text-slate-900 shadow-inner transition-all placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
              placeholder="Search..."
              aria-label="Global search"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
               <kbd className="hidden rounded bg-white border border-slate-200 px-1.5 text-[10px] font-medium text-slate-400 sm:inline-block">⌘</kbd>
               <kbd className="hidden rounded bg-white border border-slate-200 px-1.5 text-[10px] font-medium text-slate-400 sm:inline-block">K</kbd>
            </div>
          </label>
        </div>

        <div className="relative ml-2" ref={menuRef}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white p-1 pl-3 text-left text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hidden min-w-0 sm:block pr-1">
              <span className="block truncate text-xs font-semibold">{user?.name ?? "Admin"}</span>
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-brand-500 text-[10px] font-bold text-white shadow-inner">
              {(user?.name ?? "A").slice(0, 1).toUpperCase()}
            </span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name ?? "Admin"}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
                </div>
                <div className="p-1">
                  <button
                    role="menuitem"
                    type="button"
                    className="w-full flex items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setMobileNavOpen(false);
                      logout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
