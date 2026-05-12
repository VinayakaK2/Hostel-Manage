import { useMemo } from "react";
import { getRoleFromToken } from "@/lib/auth/jwt";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types/auth";

/**
 * Returns the authenticated role from verified server payload (user),
 * with a JWT decode fallback when user is temporarily unavailable.
 */
export function useAuthRole(): UserRole | null {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  return useMemo(() => {
    if (user?.role) return user.role;
    if (!token) return null;
    return getRoleFromToken(token);
  }, [user?.role, token]);
}
