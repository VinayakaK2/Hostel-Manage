export interface AdminNavItem {
  label: string;
  to: string;
  end?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", end: true },
  { label: "Student Management", to: "/admin/students" },
  { label: "Warden Management", to: "/admin/wardens" },
  { label: "Hostel Management", to: "/admin/hostels" },
];

export const ADMIN_PAGE_TITLE: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/students": "Student Management",
  "/admin/wardens": "Warden Management",
  "/admin/hostels": "Hostel Management",
};

export function titleForPath(pathname: string): string {
  const direct = ADMIN_PAGE_TITLE[pathname];
  if (direct) return direct;
  const hit = Object.keys(ADMIN_PAGE_TITLE).find((p) => pathname.startsWith(p));
  return hit ? (ADMIN_PAGE_TITLE[hit] ?? "Admin") : "Admin";
}
