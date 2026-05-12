import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { wardenTitleForPath } from "@/modules/warden/navigation";
import { useWardenLayoutStore } from "@/stores/wardenLayoutStore";
import { useAuth } from "@/hooks/useAuth";
import {
  IconBell,
  IconChevron,
  IconMenu,
  IconSearch,
} from "@/modules/admin/components/icons";

export function WardenTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = useMemo(() => wardenTitleForPath(location.pathname), [location.pathname]);
  const isBlueprint = location.pathname.startsWith("/warden/blueprint");
  const { user, logout, wardenHostel } = useAuth();
  const toggleSidebar = useWardenLayoutStore((s) => s.toggleSidebar);
  const collapsed = useWardenLayoutStore((s) => s.sidebarCollapsed);
  const toggleMobileNav = useWardenLayoutStore((s) => s.toggleMobileNav);
  const setMobileNavOpen = useWardenLayoutStore((s) => s.setMobileNavOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
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

  const hostelLine = useMemo(() => {
    if (!wardenHostel) return "Hostel assignment pending";
    return `${wardenHostel.name} · ${wardenHostel.type === "BOYS" ? "Boys Hostel" : "Girls Hostel"}`;
  }, [wardenHostel]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
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
          <IconChevron className={`h-5 w-5 transition ${collapsed ? "rotate-180" : ""}`} />
        </button>

        <div className="min-w-0 flex-1 basis-[200px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{hostelLine}</p>
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h1>
        </div>

        {!isBlueprint ? (
          <div className="order-last flex w-full flex-1 basis-full items-center md:order-none md:w-[min(380px,32vw)] md:basis-auto">
            <label className="relative w-full">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                placeholder="Search students by name or ID…"
                aria-label="Search students"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) {
                    navigate(`/warden/students?search=${encodeURIComponent(q.trim())}`);
                  }
                }}
              />
            </label>
          </div>
        ) : null}

        <Link
          to="/warden/notifications"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
          aria-label="Notifications"
        >
          <IconBell className="h-5 w-5" />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="inline-flex max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              {(user?.name ?? "W").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate">{user?.name ?? "Warden"}</span>
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
              <Link
                role="menuitem"
                to="/warden/profile"
                className="block px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
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
