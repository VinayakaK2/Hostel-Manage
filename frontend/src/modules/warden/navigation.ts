export interface WardenNavItem {
  label: string;
  to: string;
  end?: boolean;
}

export const WARDEN_NAV: WardenNavItem[] = [
  { label: "Dashboard", to: "/warden/dashboard", end: true },
  { label: "Room Blueprint", to: "/warden/blueprint" },
  { label: "Student Management", to: "/warden/students" },
  { label: "Attendance", to: "/warden/attendance" },
  { label: "Study Observations", to: "/warden/observations" },
  { label: "Leave Records", to: "/warden/leave-records" },
  { label: "Notifications", to: "/warden/notifications" },
  { label: "Profile", to: "/warden/profile" },
];

export function wardenTitleForPath(pathname: string): string {
  if (pathname.startsWith("/warden/blueprint")) return "Room Blueprint";
  if (pathname.startsWith("/warden/students")) return "Student Management";
  if (pathname.startsWith("/warden/attendance")) return "Attendance Management";
  if (pathname.startsWith("/warden/observations")) return "Study Observations";
  if (pathname.startsWith("/warden/leave-records")) return "Leave Records";
  if (pathname.startsWith("/warden/notifications")) return "Notifications";
  if (pathname.startsWith("/warden/profile")) return "Profile";
  return "Operational Dashboard";
}
