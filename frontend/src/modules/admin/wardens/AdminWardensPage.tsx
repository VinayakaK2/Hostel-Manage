import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminClientError } from "@/lib/api/adminClient";
import {
  assignWardenHostel,
  createWarden,
  listHostels,
  listWardens,
  resetWardenPassword,
  setWardenStatus,
  type WardenRow,
} from "@/modules/admin/api/adminListsApi";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8).max(100),
  assigned_hostel_id: z.string().optional().or(z.literal("")),
});

const resetSchema = z.object({
  new_password: z.string().min(8).max(100),
});

export function AdminWardensPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<WardenRow[]>([]);
  const [reload, setReload] = useState(0);
  const [hostels, setHostels] = useState<{ id: string; label: string }[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [assign, setAssign] = useState<WardenRow | null>(null);
  const [assignPick, setAssignPick] = useState("");
  const [resetW, setResetW] = useState<WardenRow | null>(null);

  const createForm = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema) });
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  useEffect(() => {
    if (!assign) {
      setAssignPick("");
      return;
    }
    setAssignPick(assign.assigned_hostel?.id ?? "");
  }, [assign]);

  useEffect(() => {
    const ac = new AbortController();
    void listHostels({ page: 1, limit: 100, status: "ACTIVE" }, ac.signal)
      .then((h) => setHostels(h.items.map((x) => ({ id: x.id, label: `${x.name} (${x.type})` }))))
      .catch(() => setHostels([]));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void listWardens({ page: 1, limit: 50, search: search.trim() || undefined, sort: "name_asc" }, ac.signal)
      .then((r) => setRows(r.items))
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load wardens.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [search, reload]);

  const bump = () => setReload((x) => x + 1);

  return (
    <div className="erp-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">People</p>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Warden management</h2>
          <p className="mt-1 text-sm text-slate-600">Create, assign hostels, and maintain secure access.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create Warden
          </Button>
        </div>
      </div>

      <AsyncState loading={loading} error={error} empty={!loading && !error && rows.length === 0} onRetry={bump}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Assigned Hostel</th>
                  <th className="px-4 py-3">Hostel Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{w.name}</td>
                    <td className="px-4 py-3">{w.email}</td>
                    <td className="px-4 py-3">{w.phone ?? "—"}</td>
                    <td className="px-4 py-3">{w.assigned_hostel?.name ?? "—"}</td>
                    <td className="px-4 py-3">{w.assigned_hostel?.type ?? "—"}</td>
                    <td className="px-4 py-3">{w.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => setAssign(w)}>
                          Assign
                        </Button>
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => setResetW(w)}>
                          Reset password
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs text-rose-700"
                          disabled={w.status === "INACTIVE"}
                          onClick={() => void setWardenStatus(w.id, "INACTIVE").then(() => bump())}
                        >
                          Disable
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AsyncState>

      <AppModal
        open={createOpen}
        title="Create warden"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createForm.handleSubmit(async (v) => {
                await createWarden({
                  ...v,
                  assigned_hostel_id: v.assigned_hostel_id || null,
                });
                setCreateOpen(false);
                bump();
              })}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextField label="Name" {...createForm.register("name")} error={createForm.formState.errors.name?.message} />
          <TextField label="Email" {...createForm.register("email")} error={createForm.formState.errors.email?.message} />
          <TextField label="Phone" {...createForm.register("phone")} error={createForm.formState.errors.phone?.message} />
          <PasswordField
            label="Temporary password"
            {...createForm.register("password")}
            error={createForm.formState.errors.password?.message}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Assign hostel (optional)</label>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" {...createForm.register("assigned_hostel_id")}>
              <option value="">None</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={!!assign}
        title="Assign hostel"
        onClose={() => setAssign(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssign(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!assign) return;
                await assignWardenHostel(assign.id, assignPick || null);
                setAssign(null);
                bump();
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {assign ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Assigning <span className="font-semibold">{assign.name}</span>
            </p>
            <label className="text-sm font-medium text-slate-700" htmlFor="warden-hostel">
              Hostel
            </label>
            <select
              id="warden-hostel"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={assignPick}
              onChange={(e) => setAssignPick(e.target.value)}
            >
              <option value="">Unassigned</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </AppModal>

      <AppModal
        open={!!resetW}
        title="Reset password"
        onClose={() => setResetW(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetW(null)}>
              Cancel
            </Button>
            <Button
              onClick={resetForm.handleSubmit(async (v) => {
                if (!resetW) return;
                await resetWardenPassword(resetW.id, v.new_password);
                setResetW(null);
                bump();
              })}
            >
              Reset
            </Button>
          </>
        }
      >
        <PasswordField
          label="New password"
          {...resetForm.register("new_password")}
          error={resetForm.formState.errors.new_password?.message}
        />
      </AppModal>
    </div>
  );
}
