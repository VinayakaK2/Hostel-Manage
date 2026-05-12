import { useEffect, useState } from "react";
import { AdminClientError, adminRequest } from "@/lib/api/adminClient";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { useAdminDashboardFiltersStore } from "@/stores/adminDashboardFiltersStore";
import { Button } from "@/components/ui/Button";

export function AdminReportsPage() {
  const { reportsFrom, reportsTo, setReportsRange } = useAdminDashboardFiltersStore();
  const [hostelId, setHostelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ from: reportsFrom, to: reportsTo });
    if (hostelId.trim()) qs.set("hostelId", hostelId.trim());
    void adminRequest<unknown>(`/api/admin/reports/summary?${qs.toString()}`, { signal: ac.signal })
      .then(setData)
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load reports.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [reportsFrom, reportsTo, hostelId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Reports</p>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Reports & analytics</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Export-ready JSON bundles for downstream CSV/PDF pipelines.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <label className="text-xs font-semibold text-slate-600">
          From
          <input
            type="date"
            className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={reportsFrom}
            onChange={(e) => setReportsRange(e.target.value, reportsTo)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          To
          <input
            type="date"
            className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={reportsTo}
            onChange={(e) => setReportsRange(reportsFrom, e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Hostel ID (optional)
          <input
            className="ml-2 w-64 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs"
            value={hostelId}
            onChange={(e) => setHostelId(e.target.value)}
          />
        </label>
        <Button type="button" variant="secondary" onClick={() => setHostelId("")}>
          Clear hostel filter
        </Button>
      </div>

      <AsyncState loading={loading} error={error} empty={false} onRetry={() => setReportsRange(reportsFrom, reportsTo)}>
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-50 shadow-card">
          <pre className="max-h-[560px] overflow-auto text-xs leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </AsyncState>
    </div>
  );
}
