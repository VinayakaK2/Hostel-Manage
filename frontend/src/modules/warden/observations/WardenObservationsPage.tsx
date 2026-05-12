import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  createWardenObservation,
  fetchWardenObservations,
  fetchWardenStudents,
  updateWardenObservation,
} from "@/modules/warden/api/wardenApi";
import type { z as Z } from "zod";
import { observationRowSchema } from "@/modules/warden/api/schemas";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type ObsRow = Z.infer<typeof observationRowSchema>;

const obsForm = z.object({
  student_id: z.string().min(1),
  note: z.string().trim().min(3).max(4000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

type ObsForm = z.infer<typeof obsForm>;

export function WardenObservationsPage() {
  const [params, setParams] = useSearchParams();
  const studentFilter = params.get("student") ?? "";
  const [rows, setRows] = useState<ObsRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(!!studentFilter);
  const [editId, setEditId] = useState<string | null>(null);

  const [students, setStudents] = useState<{ id: string; name: string; student_id: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const page = Number(params.get("page") ?? "1") || 1;
      const [list, studs] = await Promise.all([
        fetchWardenObservations(
          {
            page,
            limit: 20,
            student_id: studentFilter || undefined,
            severity: params.get("severity") || undefined,
            search: params.get("search") || undefined,
          },
          ac.signal,
        ),
        fetchWardenStudents({ page: 1, limit: 100 }, ac.signal),
      ]);
      setRows(list.items);
      setMeta(list.meta);
      setStudents(studs.items.map((s) => ({ id: s.id, name: s.name, student_id: s.student_id })));
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load observations.");
    } finally {
      setLoading(false);
    }
  }, [params.toString(), studentFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const form = useForm<ObsForm>({
    resolver: zodResolver(obsForm),
    defaultValues: {
      student_id: studentFilter || "",
      note: "",
      severity: "LOW",
    },
  });

  useEffect(() => {
    if (studentFilter) {
      form.setValue("student_id", studentFilter);
      setAddOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `form` from react-hook-form is not stable
  }, [studentFilter]);

  const editForm = useForm<{ note: string; severity: "LOW" | "MEDIUM" | "HIGH" }>({
    defaultValues: { note: "", severity: "LOW" },
  });

  useEffect(() => {
    const row = rows.find((r) => r.id === editId);
    if (row) {
      editForm.reset({ note: row.note, severity: row.severity });
    }
  }, [editId, rows, editForm]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (!value) p.delete(key);
    else p.set(key, value);
    p.set("page", "1");
    setParams(p);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Study observations</h2>
          <p className="text-sm text-slate-600">Severity-tagged notes with full audit metadata.</p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add observation
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <TextField
          label="Search"
          value={params.get("search") ?? ""}
          onChange={(e) => setFilter("search", e.target.value)}
        />
        <label className="text-sm font-medium text-slate-700">
          Severity
          <select
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={params.get("severity") ?? ""}
            onChange={(e) => setFilter("severity", e.target.value)}
          >
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
      </div>

      <AsyncState loading={loading} error={error} empty={!loading && !error && rows.length === 0} onRetry={() => void load()}>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.student.name}</p>
                    <p className="text-xs text-slate-600">{o.student.student_id}</p>
                  </td>
                  <td className="px-4 py-3">{o.severity}</td>
                  <td className="max-w-md px-4 py-3 text-slate-800">{o.note}</td>
                  <td className="px-4 py-3">{o.created_by.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditId(o.id)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>

      <div className="flex justify-between text-sm text-slate-600">
        <p>
          Page {meta.page} / {meta.totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={meta.page <= 1}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set("page", String(meta.page - 1));
              setParams(p);
            }}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            disabled={meta.page >= meta.totalPages}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set("page", String(meta.page + 1));
              setParams(p);
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <AppModal
        open={addOpen}
        title="Add observation"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(async (v) => {
                const ac = new AbortController();
                try {
                  await createWardenObservation(v, ac.signal);
                  setAddOpen(false);
                  form.reset({ student_id: studentFilter || "", note: "", severity: "LOW" });
                  void load();
                } catch (e) {
                  alert(e instanceof WardenClientError ? e.message : "Failed");
                }
              })}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <label className="text-sm font-medium text-slate-700">
            Student
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...form.register("student_id")}>
              <option value="">Select…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_id})
                </option>
              ))}
            </select>
          </label>
          <TextField label="Note" {...form.register("note")} />
          <label className="text-sm font-medium text-slate-700">
            Severity
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...form.register("severity")}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
        </div>
      </AppModal>

      <AppModal
        open={!!editId}
        title="Edit observation"
        onClose={() => setEditId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              onClick={editForm.handleSubmit(async (v) => {
                if (!editId) return;
                const ac = new AbortController();
                try {
                  await updateWardenObservation(editId, v, ac.signal);
                  setEditId(null);
                  void load();
                } catch (e) {
                  alert(e instanceof WardenClientError ? e.message : "Failed");
                }
              })}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <TextField label="Note" {...editForm.register("note")} />
          <label className="text-sm font-medium text-slate-700">
            Severity
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...editForm.register("severity")}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
        </div>
      </AppModal>
    </div>
  );
}
