import { useEffect, useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { LoginAlerts } from "@/components/auth/LoginAlerts";
import { SystemLogo } from "@/components/auth/SystemLogo";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import {
  DEV_ADMIN_CREDENTIALS,
  DEV_WARDEN_CREDENTIALS,
  isDevQuickFillEnabled,
} from "@/config/devCredentials";
import { useAuth } from "@/hooks/useAuth";
import { useLoginController } from "@/hooks/useLoginController";
import { isJwtExpired } from "@/lib/auth/jwt";
import { getRoleDashboardPath } from "@/routes/paths";
import { useAuthStore } from "@/stores/authStore";

export function LoginPage() {
  const { isAuthenticated, user } = useAuth();
  const clearSession = useAuthStore((s) => s.clearSession);
  const token = useAuthStore((s) => s.token);
  const [params] = useSearchParams();
  const sessionExpired = params.get("reason") === "session_expired";

  useEffect(() => {
    if (sessionExpired || (token && isJwtExpired(token))) {
      clearSession();
    }
  }, [sessionExpired, token, clearSession]);

  const {
    form,
    onSubmit,
    ui,
    dismissError,
    submitErrorMessage,
    hasFieldErrorsAfterSubmit,
    emptyFormSummary,
  } = useLoginController();

  const redirectPath = useMemo(() => {
    if (!user) return "/admin/dashboard";
    return getRoleDashboardPath(user.role);
  }, [user]);

  if (isAuthenticated && user) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <SystemLogo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Hostel Management
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in with your institutional account.
            </p>
          </div>
        </header>

        <section
          aria-labelledby="login-heading"
          className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-100 sm:p-8"
        >
          <h2 id="login-heading" className="sr-only">
            Sign in
          </h2>

          {ui.phase === "success" ? (
            <p className="sr-only" role="status">
              Login successful. Redirecting…
            </p>
          ) : null}

          <LoginAlerts
            sessionExpired={sessionExpired}
            submitError={submitErrorMessage}
            failureReason={ui.failureReason}
            isEmptyFormError={hasFieldErrorsAfterSubmit}
            emptyFormSummary={emptyFormSummary}
            onDismissSubmitError={dismissError}
          />

          <form
            className="mt-4 flex flex-col gap-5"
            onSubmit={onSubmit}
            onInput={() => {
              if (ui.phase === "error") dismissError();
            }}
            noValidate
          >
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@institution.edu"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />

            <PasswordField
              label="Password"
              placeholder="Enter your password"
              error={form.formState.errors.password?.message}
              {...form.register("password")}
            />

            {isDevQuickFillEnabled() ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 min-w-[8rem] py-2 text-xs"
                  onClick={() => {
                    form.setValue("email", DEV_ADMIN_CREDENTIALS.email, {
                      shouldValidate: true,
                    });
                    form.setValue("password", DEV_ADMIN_CREDENTIALS.password, {
                      shouldValidate: true,
                    });
                  }}
                >
                  Admin quick-fill
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 min-w-[8rem] py-2 text-xs"
                  onClick={() => {
                    form.setValue("email", DEV_WARDEN_CREDENTIALS.email, {
                      shouldValidate: true,
                    });
                    form.setValue("password", DEV_WARDEN_CREDENTIALS.password, {
                      shouldValidate: true,
                    });
                  }}
                >
                  Warden quick-fill
                </Button>
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full py-3 text-base"
              isLoading={ui.phase === "loading"}
              loadingLabel="Signing in…"
              disabled={ui.phase === "loading"}
            >
              Sign in
            </Button>
          </form>
        </section>

        <p className="text-center text-xs text-slate-500">
          Protected system. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
