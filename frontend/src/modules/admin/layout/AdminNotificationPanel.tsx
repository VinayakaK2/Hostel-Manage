import { useEffect, useState } from "react";
import { adminRequest, AdminClientError } from "@/lib/api/adminClient";
import { notificationRowSchema, paginatedMetaSchema } from "@/modules/admin/api/schemas";
import { z } from "zod";
import { useAdminLayoutStore } from "@/stores/adminLayoutStore";
import { AsyncState } from "@/modules/admin/components/AsyncState";

const listSchema = z.object({
  items: z.array(notificationRowSchema),
  meta: paginatedMetaSchema,
});

export function AdminNotificationPanel() {
  const open = useAdminLayoutStore((s) => s.notificationPanelOpen);
  const setOpen = useAdminLayoutStore((s) => s.setNotificationPanelOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<z.infer<typeof notificationRowSchema>[]>([]);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    adminRequest<unknown>("/api/admin/notifications?page=1&limit=12", { signal: ac.signal })
      .then((raw) => {
        const parsed = listSchema.safeParse(raw);
        if (!parsed.success) {
          setError("Received an unexpected response.");
          return;
        }
        setItems(parsed.data.items);
      })
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load notifications.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [open]);

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-[min(420px,92vw)] transform border-l border-slate-200 bg-white shadow-soft transition duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          <p className="text-xs text-slate-600">Operational signals</p>
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      <div className="h-[calc(100%-52px)] overflow-y-auto p-3">
        <AsyncState
          loading={loading}
          error={error}
          empty={!loading && !error && items.length === 0}
          onRetry={() => setOpen(false)}
          emptyTitle="No notifications"
          emptyDescription="You are all caught up."
        >
          <ul className="space-y-2">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border px-3 py-3 ${
                  n.read
                    ? "border-slate-200 bg-white"
                    : "border-brand-200 bg-brand-50/40"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
                  {n.category.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="mt-1 text-sm text-slate-700">{n.message}</p>
              </li>
            ))}
          </ul>
        </AsyncState>
      </div>
    </div>
  );
}
