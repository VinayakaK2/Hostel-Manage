import { Navigate, useLocation } from "react-router-dom";
import { isJwtExpired } from "@/lib/auth/jwt";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: readonly UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (!token || !user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (isJwtExpired(token)) {
    return (
      <Navigate
        to="/login?reason=session_expired"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === "ADMIN" ? "/admin/dashboard" : "/warden/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
