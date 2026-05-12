import type { LoginFailureReason } from "@/types/auth";

interface LoginAlertsProps {
  sessionExpired: boolean;
  submitError: string | null;
  failureReason: LoginFailureReason | null;
  isEmptyFormError: boolean;
  emptyFormSummary: string | null;
  onDismissSubmitError: () => void;
}

export function LoginAlerts({
  sessionExpired,
  submitError,
  failureReason,
  isEmptyFormError,
  emptyFormSummary,
  onDismissSubmitError,
}: LoginAlertsProps) {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {sessionExpired ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Your session has expired. Please sign in again.
        </div>
      ) : null}

      {isEmptyFormError && emptyFormSummary ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {emptyFormSummary}
        </div>
      ) : null}

      {submitError && failureReason !== "ABORTED" ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          <span>{submitError}</span>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-red-800 underline"
            onClick={onDismissSubmitError}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
