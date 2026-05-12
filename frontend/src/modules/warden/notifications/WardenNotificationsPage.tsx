import { useCallback, useEffect, useState } from "react";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  fetchWardenNotifications,
  fetchWardenParentLogs,
  markWardenNotificationRead,
} from "@/modules/warden/api/wardenApi";
import type { z as Z } from "zod";
import { wardenNotificationRowSchema, parentLogRowSchema } from "@/modules/warden/api/schemas";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";

type Notif = Z.infer<typeof wardenNotificationRowSchema>;
type Log = Z.infer<typeof parentLogRowSchema>;

export function WardenNotificationsPage() {
  const [tab, setTab] = useState<"inbox" | "parent">("inbox");
  const [pageInbox, setPageInbox] = useState(1);
  const [pageLogs, setPageLogs] = useState(1);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [metaN, setMetaN] = useState({ page: 1, totalPages: 1 });
  const [metaL, setMetaL] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const [n, l] = await Promise.all([
        fetchWardenNotifications({ page: pageInbox, limit: 20 }, ac.signal),
        fetchWardenParentLogs({ page: pageLogs, limit: 20 }, ac.signal),
      ]);
      setNotifs(n.items);
      setMetaN(n.meta);
      setLogs(l.items);
      setMetaL(l.meta);
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [pageInbox, pageLogs]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="erp-page-tight">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Notification center</h2>
        <p className="text-sm text-slate-600">Operational alerts, parent channel outcomes, and delivery retries.</p>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant={tab === "inbox" ? "primary" : "secondary"} onClick={() => setTab("inbox")}>
          Inbox
        </Button>
        <Button type="button" variant={tab === "parent" ? "primary" : "secondary"} onClick={() => setTab("parent")}>
          Parent delivery log
        </Button>
      </div>

      <AsyncState loading={loading} error={error} empty={false} onRetry={() => void load()}>
        {tab === "inbox" ? (
          <div className="space-y-3">
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-card">
              {notifs.length === 0 ? (
                <li className="p-6 text-center text-sm text-slate-600">No notifications.</li>
              ) : (
                notifs.map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      <p className="text-sm text-slate-600">{n.message}</p>
                      <p className="text-xs text-slate-500">
                        {n.category} · {new Date(n.created_at).toLocaleString()} · {n.read ? "Read" : "Unread"}
                      </p>
                    </div>
                    {!n.read ? (
                      <Button
                        variant="secondary"
                        className="shrink-0"
                        onClick={async () => {
                          const ac = new AbortController();
                          try {
                            await markWardenNotificationRead(n.id, ac.signal);
                            void load();
                          } catch (e) {
                            alert(e instanceof WardenClientError ? e.message : "Failed");
                          }
                        }}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
            <div className="flex justify-between">
              <Button variant="secondary" disabled={pageInbox <= 1} onClick={() => setPageInbox((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pageInbox >= metaN.totalPages}
                onClick={() => setPageInbox((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{l.channel}</td>
                      <td className="px-4 py-3 font-mono text-xs">{l.recipient}</td>
                      <td className="px-4 py-3">{l.status}</td>
                      <td className="px-4 py-3 text-xs text-rose-700">{l.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" disabled={pageLogs <= 1} onClick={() => setPageLogs((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pageLogs >= metaL.totalPages}
                onClick={() => setPageLogs((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </AsyncState>
    </div>
  );
}
