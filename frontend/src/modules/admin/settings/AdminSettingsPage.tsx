import { useEffect, useState } from "react";
import { AdminClientError } from "@/lib/api/adminClient";
import { fetchAdminSettings, patchAdminSettings } from "@/modules/admin/api/adminListsApi";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";

interface Prefs {
  theme?: string;
  emailDigest?: boolean;
  pushAlerts?: boolean;
}

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ theme: "blue", emailDigest: true, pushAlerts: true });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void fetchAdminSettings(ac.signal)
      .then((raw) => {
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          setPrefs((p) => ({ ...p, ...(raw as Prefs) }));
        }
      })
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load settings.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <div className="erp-page">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Control</p>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">System and notification preferences for this administrator.</p>
      </div>

      <AsyncState loading={loading} error={error} empty={false}>
        <form
          className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await patchAdminSettings(prefs);
            } catch (err) {
              alert(err instanceof AdminClientError ? err.message : "Could not save preferences.");
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Theme</label>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={prefs.theme ?? "blue"}
              onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))}
            >
              <option value="blue">Blue (enterprise)</option>
              <option value="dark">Dark (preview)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={!!prefs.emailDigest}
              onChange={(e) => setPrefs((p) => ({ ...p, emailDigest: e.target.checked }))}
            />
            Email digest
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={!!prefs.pushAlerts}
              onChange={(e) => setPrefs((p) => ({ ...p, pushAlerts: e.target.checked }))}
            />
            Push alerts
          </label>
          <Button type="submit">Save preferences</Button>
        </form>
      </AsyncState>
    </div>
  );
}
