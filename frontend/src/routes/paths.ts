import type { UserRole } from "@/types/auth";

export function getRoleDashboardPath(role: UserRole): string {
  if (role === "ADMIN") return "/admin/dashboard";
  return "/warden/dashboard";
}
