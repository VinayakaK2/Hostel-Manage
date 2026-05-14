import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trendLabel?: string;
  trendVariant?: "up" | "down" | "neutral";
  loading?: boolean;
}

export function StatMetricCard({
  title,
  value,
  subtitle,
  icon,
  trendLabel,
  trendVariant = "neutral",
  loading,
}: StatMetricCardProps) {
  const trendClass =
    trendVariant === "up"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : trendVariant === "down"
        ? "text-rose-700 bg-rose-50 ring-rose-200"
        : "text-slate-600 bg-slate-50 ring-slate-200";

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          {loading ? (
            <div className="mt-3 h-9 w-28 overflow-hidden rounded-lg bg-slate-100 relative">
               <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-900"
            >
              {value}
            </motion.p>
          )}
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
          {trendLabel ? (
            <div className="mt-3 flex items-center">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${trendClass}`}>
                {trendVariant === "up" && (
                  <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {trendVariant === "down" && (
                  <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {trendLabel}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50/50 text-brand-600 shadow-sm ring-1 ring-brand-100/50 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
