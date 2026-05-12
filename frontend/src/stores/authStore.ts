import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isJwtExpired } from "@/lib/auth/jwt";
import type { AuthUser } from "@/types/auth";
import type { WardenHostelSummary } from "@/types/warden";

export interface AuthSession {
  token: string;
  user: AuthUser;
  wardenHostel?: WardenHostelSummary | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  wardenHostel: WardenHostelSummary | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  /** True when a non-expired token and user exist. */
  hasValidSession: () => boolean;
  /** True when a token exists but is expired (refresh/tab restore). */
  hasExpiredCredentials: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      wardenHostel: null,
      setSession: (session) =>
        set({
          token: session.token,
          user: session.user,
          wardenHostel: session.wardenHostel ?? null,
        }),
      clearSession: () => set({ token: null, user: null, wardenHostel: null }),
      hasValidSession: () => {
        const { token, user } = get();
        if (!token || !user) return false;
        return !isJwtExpired(token);
      },
      hasExpiredCredentials: () => {
        const { token } = get();
        if (!token) return false;
        return isJwtExpired(token);
      },
    }),
    {
      name: "hostel-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        wardenHostel: state.wardenHostel,
      }),
    },
  ),
);
