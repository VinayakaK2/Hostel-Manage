import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "@/modules/admin/navigation";
import { useAdminLayoutStore } from "@/stores/adminLayoutStore";
import { useAuth } from "@/hooks/useAuth";
import { IconChevron, IconMenu, IconSearch } from "@/modules/admin/components/icons";

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
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 md:hidden"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 md:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconChevron
            className={`h-5 w-5 transition ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        <div className="min-w-0 flex-1 basis-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h1>
          <p className="hidden text-xs text-slate-600 sm:block">
            Enterprise operations overview
          </p>
        </div>

        <div className="hidden min-w-0 flex-1 basis-0 md:flex">
          <label className="relative w-full">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              placeholder="Search students, hostels, wardens…"
              aria-label="Global search"
            />
          </label>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="inline-flex max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              {(user?.name ?? "A").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate">{user?.name ?? "Admin"}</span>
              <span className="block truncate text-xs font-medium text-slate-500">
                {user?.email ?? ""}
              </span>
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft"
            >
              <button
                role="menuitem"
                type="button"
                className="w-full px-4 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  setMenuOpen(false);
                  setMobileNavOpen(false);
                  logout();
                }}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
