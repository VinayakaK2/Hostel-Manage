interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AsyncState({
  loading,
  error,
  empty,
  onRetry,
  children,
  emptyTitle = "No data",
  emptyDescription = "There is nothing to display yet.",
}: AsyncStateProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-card"
      >
        <p className="text-sm font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-rose-800">{error}</p>
        {onRetry ? (
          <button
            type="button"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <p className="text-base font-semibold text-slate-900">{emptyTitle}</p>
        <p className="mt-2 text-sm text-slate-600">{emptyDescription}</p>
      </div>
    );
  }

  return children;
}
