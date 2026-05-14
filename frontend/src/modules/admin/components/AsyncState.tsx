import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

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
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display at this time.",
}: AsyncStateProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm"
      >
        <div className="space-y-4">
          <div className="h-5 w-48 overflow-hidden rounded-md bg-slate-100 relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
          <div className="h-4 w-full overflow-hidden rounded-md bg-slate-50 relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
          <div className="h-4 w-5/6 overflow-hidden rounded-md bg-slate-50 relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
          <div className="h-4 w-2/3 overflow-hidden rounded-md bg-slate-50 relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-8 text-center shadow-sm"
        role="alert"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 ring-8 ring-rose-50 mb-4">
          <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-rose-900">Unable to load data</h3>
        <p className="mt-1 text-sm text-rose-600">{error}</p>
        {onRetry && (
          <Button
            variant="secondary"
            onClick={onRetry}
            className="mt-6 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          >
            Try again
          </Button>
        )}
      </motion.div>
    );
  }

  if (empty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white p-12 text-center shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 mb-4 shadow-sm">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{emptyTitle}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{emptyDescription}</p>
      </motion.div>
    );
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>{children}</motion.div>;
}
