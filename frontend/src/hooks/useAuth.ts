import { useCallback, useMemo } from "react";
import { logoutRequest } from "@/lib/api/authApi";
import { clearAdminPersistedStores } from "@/stores/adminLayoutStore";
import { clearWardenPersistedStores } from "@/stores/wardenLayoutStore";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const wardenHostel = useAuthStore((s) => s.wardenHostel);
  const isAuthenticated = useAuthStore((s) => s.hasValidSession());
  const isSessionExpired = useAuthStore((s) => s.hasExpiredCredentials());
  const clearSession = useAuthStore((s) => s.clearSession);

  const logout = useCallback(() => {
    const controller = new AbortController();
    void logoutRequest(controller.signal).finally(() => {
      clearSession();
      clearAdminPersistedStores();
      clearWardenPersistedStores();
    });
  }, [clearSession]);

  return useMemo(
    () => ({
      token,
      user,
      wardenHostel,
      isAuthenticated,
      isSessionExpired,
      logout,
      clearSession,
    }),
    [token, user, wardenHostel, isAuthenticated, isSessionExpired, logout, clearSession],
  );
}
