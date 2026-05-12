import { useEffect, useState } from "react";
import { AdminClientError } from "@/lib/api/adminClient";
import { fetchNotificationsPage, markNotificationRead } from "@/modules/admin/api/adminListsApi";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";

export function AdminNotificationsPage() {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<
    { id: string; category: string; title: string; message: string; read: boolean; created_at: string }[]
  >([]);
  const [meta, setMeta] = useState({ totalPages: 1 });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void fetchNotificationsPage(page, ac.signal)
      .then((r) => {
        setItems(r.items);
        setMeta({ totalPages: r.meta.totalPages });
      })
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load notifications.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Center</p>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Notifications</h2>
        <p className="mt-1 text-sm text-slate-600">Operational alerts across leave, absence, capacity, and delivery.</p>
      </div>

      <AsyncState loading={loading} error={error} empty={!loading && !error && items.length === 0} onRetry={() => setPage(1)}>
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border px-4 py-3 shadow-sm ${
                n.read ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50/40"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-900">
                    {n.category.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => void markNotificationRead(n.id).then(() => setPage((p) => p))}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
          <p>
            Page {page} / {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
