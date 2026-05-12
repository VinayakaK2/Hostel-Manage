import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  createWardenStudent,
  disableWardenStudent,
  fetchWardenRooms,
  fetchWardenStudent,
  fetchWardenStudents,
  transferWardenStudentRoom,
  updateWardenStudent,
} from "@/modules/warden/api/wardenApi";
import type { z as Z } from "zod";
import { wardenStudentRowSchema } from "@/modules/warden/api/schemas";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type StudentRow = Z.infer<typeof wardenStudentRowSchema>;

const studentFormSchema = z.object({
  student_id: z.string().trim().min(3).max(32),
  name: z.string().trim().min(2).max(120),
  gender: z.enum(["MALE", "FEMALE"]),
  course: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional().nullable(),
  parent_contact: z.string().trim().min(6).max(64),
  room_id: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
});

type StudentForm = z.infer<typeof studentFormSchema>;

export function WardenStudentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [debouncedSearch, setDebouncedSearch] = useState(params.get("search") ?? "");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(params.get("search") ?? ""), 400);
    return () => window.clearTimeout(t);
  }, [params]);

  const page = Number(params.get("page") ?? "1") || 1;
  const status = params.get("status") ?? "";
  const gender = params.get("gender") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [rooms, setRooms] = useState<{ id: string; room_number: string }[]>([]);

  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [disableId, setDisableId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(params.get("create") === "1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const [list, rms] = await Promise.all([
        fetchWardenStudents(
          {
            page,
            limit: 20,
            search: debouncedSearch || undefined,
            status: status || undefined,
            gender: gender || undefined,
          },
          ac.signal,
        ),
        fetchWardenRooms(ac.signal),
      ]);
      setRows(list.items);
      setMeta(list.meta);
      setRooms(rms.map((x) => ({ id: x.id, room_number: x.room_number })));
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, gender]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateQuery = (next: Record<string, string>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v) p.delete(k);
      else p.set(k, v);
    }
    setParams(p);
  };

  const addForm = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      student_id: "",
      name: "",
      gender: "MALE",
      course: "",
      phone: "",
      parent_contact: "",
      room_id: "",
      status: "ACTIVE",
    },
  });

  const editForm = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
  });

  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchWardenStudent>> | null>(null);

  useEffect(() => {
    if (!viewId && !editId) return;
    const id = viewId ?? editId;
    if (!id) return;
    const ac = new AbortController();
    void fetchWardenStudent(id, ac.signal)
      .then((d) => {
        setDetail(d);
        if (editId) {
          editForm.reset({
            student_id: d.student_id,
            name: d.name,
            gender: d.gender,
            course: d.course,
            phone: d.phone ?? "",
            parent_contact: d.parent_contact,
            room_id: d.room?.id ?? "",
            status: d.status,
          });
        }
      })
      .catch(() => setDetail(null));
    return () => ac.abort();
  }, [viewId, editId, editForm]);

  const transferForm = useForm<{ room_id: string }>({
    defaultValues: { room_id: "" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Student roster</h2>
          <p className="text-sm text-slate-600">
            Scoped to your hostel. All server requests enforce hostel isolation.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add student
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <TextField
          label="Search"
          value={params.get("search") ?? ""}
          onChange={(e) => updateQuery({ search: e.target.value, page: "1" })}
        />
        <label className="text-sm font-medium text-slate-700">
          <span className="mb-1 block">Status</span>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value, page: "1" })}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          <span className="mb-1 block">Gender</span>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={gender}
            onChange={(e) => updateQuery({ gender: e.target.value, page: "1" })}
          >
            <option value="">All</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </label>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && !error && rows.length === 0}
        onRetry={() => void load()}
        emptyTitle="No students match"
        emptyDescription="Adjust filters or add a new student."
      >
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{s.student_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-700">{s.course}</td>
                  <td className="px-4 py-3">{s.room?.room_number ?? "—"}</td>
                  <td className="px-4 py-3">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.parent_contact}</td>
                  <td className="px-4 py-3">{s.attendance_status_today ?? "—"}</td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setViewId(s.id)}>
                        View
                      </Button>
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditId(s.id)}>
                        Edit
                      </Button>
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setTransferId(s.id)}>
                        Transfer
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => navigate(`/warden/observations?student=${s.id}`)}
                      >
                        Observe
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Page {meta.page} of {meta.totalPages} · {meta.total} students
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={meta.page <= 1}
            onClick={() => updateQuery({ page: String(meta.page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={meta.page >= meta.totalPages}
            onClick={() => updateQuery({ page: String(meta.page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <AppModal
        open={addOpen}
        title="Add student"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addForm.handleSubmit(async (values) => {
                const ac = new AbortController();
                try {
                  await createWardenStudent(
                    {
                      ...values,
                      room_id: values.room_id || null,
                      phone: values.phone || null,
                    },
                    ac.signal,
                  );
                  setAddOpen(false);
                  addForm.reset();
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
          <TextField label="Student ID" {...addForm.register("student_id")} error={addForm.formState.errors.student_id?.message} />
          <TextField label="Name" {...addForm.register("name")} error={addForm.formState.errors.name?.message} />
          <label className="text-sm font-medium text-slate-700">
            Gender
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...addForm.register("gender")}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </label>
          <TextField label="Course" {...addForm.register("course")} />
          <TextField label="Phone" {...addForm.register("phone")} />
          <TextField label="Parent contact" {...addForm.register("parent_contact")} />
          <label className="text-sm font-medium text-slate-700">
            Room
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...addForm.register("room_id")}>
              <option value="">Unassigned</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number}
                </option>
              ))}
            </select>
          </label>
        </div>
      </AppModal>

      <AppModal
        open={!!viewId}
        title="Student profile"
        onClose={() => {
          setViewId(null);
          setDetail(null);
        }}
      >
        {detail ? (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Student ID</dt>
              <dd className="font-medium">{detail.student_id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium">{detail.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Parent</dt>
              <dd className="font-mono text-xs">{detail.parent_contact}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Room</dt>
              <dd>{detail.room?.room_number ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-600">Loading…</p>
        )}
      </AppModal>

      <AppModal
        open={!!editId}
        title="Edit student"
        onClose={() => {
          setEditId(null);
          setDetail(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              onClick={editForm.handleSubmit(async (values) => {
                if (!editId) return;
                const ac = new AbortController();
                try {
                  await updateWardenStudent(
                    editId,
                    { ...values, room_id: values.room_id || null, phone: values.phone || null },
                    ac.signal,
                  );
                  setEditId(null);
                  void load();
                } catch (e) {
                  alert(e instanceof WardenClientError ? e.message : "Failed");
                }
              })}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <TextField label="Student ID" {...editForm.register("student_id")} />
          <TextField label="Name" {...editForm.register("name")} />
          <TextField label="Course" {...editForm.register("course")} />
          <TextField label="Phone" {...editForm.register("phone")} />
          <TextField label="Parent contact" {...editForm.register("parent_contact")} />
          <label className="text-sm font-medium text-slate-700">
            Status
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...editForm.register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>
      </AppModal>

      <AppModal
        open={!!transferId}
        title="Transfer room"
        onClose={() => setTransferId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferId(null)}>
              Cancel
            </Button>
            <Button
              onClick={transferForm.handleSubmit(async (v) => {
                if (!transferId) return;
                const ac = new AbortController();
                try {
                  await transferWardenStudentRoom(transferId, v.room_id, ac.signal);
                  setTransferId(null);
                  void load();
                } catch (e) {
                  alert(e instanceof WardenClientError ? e.message : "Failed");
                }
              })}
            >
              Transfer
            </Button>
          </>
        }
      >
        <label className="text-sm font-medium text-slate-700">
          Select room
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            {...transferForm.register("room_id")}
          >
            <option value="">Choose…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_number}
              </option>
            ))}
          </select>
        </label>
      </AppModal>

      <AppModal
        open={!!disableId}
        title="Disable student"
        description="Inactive students cannot receive attendance and are removed from room occupancy."
        onClose={() => setDisableId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisableId(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!disableId) return;
                const ac = new AbortController();
                try {
                  await disableWardenStudent(disableId, ac.signal);
                  setDisableId(null);
                  void load();
                } catch (e) {
                  alert(e instanceof WardenClientError ? e.message : "Failed");
                }
              }}
            >
              Confirm disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This action marks the student inactive for operational workflows in this console.
        </p>
      </AppModal>
    </div>
  );
}
