import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

const AdminLayout = lazy(() =>
  import("@/modules/admin/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboardHomePage = lazy(() =>
  import("@/modules/admin/dashboard/AdminDashboardHomePage").then((m) => ({
    default: m.AdminDashboardHomePage,
  })),
);
const AdminStudentsPage = lazy(() =>
  import("@/modules/admin/students/AdminStudentsPage").then((m) => ({ default: m.AdminStudentsPage })),
);
const AdminWardensPage = lazy(() =>
  import("@/modules/admin/wardens/AdminWardensPage").then((m) => ({ default: m.AdminWardensPage })),
);
const AdminHostelsPage = lazy(() =>
  import("@/modules/admin/hostels/AdminHostelsPage").then((m) => ({ default: m.AdminHostelsPage })),
);

const WardenLayout = lazy(() =>
  import("@/modules/warden/layout/WardenLayout").then((m) => ({ default: m.WardenLayout })),
);
const WardenDashboardHomePage = lazy(() =>
  import("@/modules/warden/dashboard/WardenDashboardHomePage").then((m) => ({
    default: m.WardenDashboardHomePage,
  })),
);
const WardenBlueprintPage = lazy(() =>
  import("@/modules/warden/blueprint/WardenBlueprintPage").then((m) => ({
    default: m.WardenBlueprintPage,
  })),
);
const WardenStudentsPage = lazy(() =>
  import("@/modules/warden/students/WardenStudentsPage").then((m) => ({ default: m.WardenStudentsPage })),
);
const WardenAttendancePage = lazy(() =>
  import("@/modules/warden/attendance/WardenAttendancePage").then((m) => ({
    default: m.WardenAttendancePage,
  })),
);
const WardenObservationsPage = lazy(() =>
  import("@/modules/warden/observations/WardenObservationsPage").then((m) => ({
    default: m.WardenObservationsPage,
  })),
);
const WardenLeaveRecordsPage = lazy(() =>
  import("@/modules/warden/leave-records/WardenLeaveRecordsPage").then((m) => ({
    default: m.WardenLeaveRecordsPage,
  })),
);
const WardenNotificationsPage = lazy(() =>
  import("@/modules/warden/notifications/WardenNotificationsPage").then((m) => ({
    default: m.WardenNotificationsPage,
  })),
);
function AdminFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-slate-600">
      Loading admin console…
    </div>
  );
}

function WardenFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-slate-600">
      Loading warden console…
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminDashboardHomePage />
            </Suspense>
          }
        />
        <Route
          path="students"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminStudentsPage />
            </Suspense>
          }
        />
        <Route
          path="wardens"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminWardensPage />
            </Suspense>
          }
        />
        <Route
          path="hostels"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminHostelsPage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="/warden"
        element={
          <ProtectedRoute allowedRoles={["WARDEN"]}>
            <Suspense fallback={<WardenFallback />}>
              <WardenLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenDashboardHomePage />
            </Suspense>
          }
        />
        <Route
          path="blueprint"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenBlueprintPage />
            </Suspense>
          }
        />
        <Route
          path="students"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenStudentsPage />
            </Suspense>
          }
        />
        <Route
          path="attendance"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenAttendancePage />
            </Suspense>
          }
        />
        <Route
          path="observations"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenObservationsPage />
            </Suspense>
          }
        />
        <Route
          path="leave-records"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenLeaveRecordsPage />
            </Suspense>
          }
        />
        <Route
          path="notifications"
          element={
            <Suspense fallback={<WardenFallback />}>
              <WardenNotificationsPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
