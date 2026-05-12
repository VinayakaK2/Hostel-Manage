import type { ReactNode } from "react";

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
      ? "text-emerald-700"
      : trendVariant === "down"
        ? "text-rose-700"
        : "text-slate-600";

  return (
    <div className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-card backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          {loading ? (
            <div className="mt-3 h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-900">
              {value}
            </p>
          )}
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
          {trendLabel ? (
            <p className={`mt-2 text-xs font-semibold ${trendClass}`}>{trendLabel}</p>
          ) : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm ring-1 ring-black/5">
          {icon}
        </div>
      </div>
    </div>
  );
}
