import { useCallback, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
  class_year: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.union([z.literal(11), z.literal(12)]),
  ),
  course: z.enum(["PCM", "PCMB"]),
  phone: z.string().trim().max(20).optional().nullable(),
  parent_contact: z.string().trim().min(6).max(64),
  room_id: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
});

type StudentForm = z.infer<typeof studentFormSchema>;
const studentFormResolver = zodResolver(studentFormSchema) as Resolver<StudentForm>;

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
  const classParam = params.get("class");
  const selectedClass =
    classParam === "11" || classParam === "12" ? (Number(classParam) as 11 | 12) : null;

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

  useEffect(() => {
    if (params.get("create") === "1") setAddOpen(true);
  }, [params]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const rms = await fetchWardenRooms(ac.signal);
      setRooms(rms.map((x) => ({ id: x.id, room_number: x.room_number })));

      if (selectedClass == null) {
        setRows([]);
        setMeta({ total: 0, page: 1, limit: 20, totalPages: 1 });
        return;
      }

      const list = await fetchWardenStudents(
        {
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          status: status || undefined,
          gender: gender || undefined,
          class: selectedClass,
        },
        ac.signal,
      );
      setRows(list.items);
      setMeta(list.meta);
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, gender, selectedClass]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateQuery = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    setParams(p);
  };

  const addForm = useForm<StudentForm>({
    resolver: studentFormResolver,
    defaultValues: {
      student_id: "",
      name: "",
      gender: "MALE",
      class_year: 11,
      course: "PCM",
      phone: "",
      parent_contact: "",
      room_id: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (!addOpen) return;
    addForm.reset({
      student_id: "",
      name: "",
      gender: "MALE",
      class_year: selectedClass ?? 11,
      course: "PCM",
      phone: "",
      parent_contact: "",
      room_id: "",
      status: "ACTIVE",
    });
  }, [addOpen, selectedClass, addForm]);

  useEffect(() => {
    if (selectedClass != null) {
      addForm.setValue("class_year", selectedClass);
    }
  }, [selectedClass, addForm]);

  const editForm = useForm<StudentForm>({
    resolver: studentFormResolver,
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
            class_year: d.class_year === 12 ? 12 : 11,
            course: d.course === "PCM" || d.course === "PCMB" ? d.course : d.class_year === 12 ? "PCMB" : "PCM",
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
    <div className="erp-page-tight flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {selectedClass == null ? (
        <div className="shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Student roster</h2>
          <p className="text-sm text-slate-600">
            Choose a class first; the list loads from the server for that class only.
          </p>
        </div>
      ) : (
        <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Student roster</h2>
            <p className="text-sm text-slate-600">
              Choose a class first; the list loads from the server for that class only.
            </p>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add student
          </Button>
        </div>
      )}

      {selectedClass == null ? (
        <div className="mt-4 flex shrink-0 flex-wrap gap-4">
          <button
            type="button"
            onClick={() => updateQuery({ class: "11", page: "1" })}
            className="group flex max-w-md flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-card transition hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-lg font-bold text-brand-800 ring-1 ring-brand-200">
              11
            </span>
            <span>
              <span className="block text-lg font-semibold text-slate-900">Class 11</span>
              <span className="mt-1 block text-sm text-slate-600">
                Students in 11th grade — tap to view and manage.
              </span>
            </span>
            <span className="text-sm font-semibold text-brand-700 group-hover:underline">Continue →</span>
          </button>
          <button
            type="button"
            onClick={() => updateQuery({ class: "12", page: "1" })}
            className="group flex max-w-md flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-card transition hover:border-rose-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-lg font-bold text-rose-800 ring-1 ring-rose-100">
              12
            </span>
            <span>
              <span className="block text-lg font-semibold text-slate-900">Class 12</span>
              <span className="mt-1 block text-sm text-slate-600">
                Students in 12th grade — tap to view and manage.
              </span>
            </span>
            <span className="text-sm font-semibold text-rose-700 group-hover:underline">Continue →</span>
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="shrink-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                updateQuery({ class: undefined, page: "1" });
              }}
            >
              ← Classes
            </Button>
          </div>
          <div
            className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5"
            role="tablist"
            aria-label="Class"
          >
            <button
              type="button"
              className={`inline-flex min-h-[44px] min-w-[7.5rem] items-center justify-center rounded-full border px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                selectedClass === 11
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => updateQuery({ class: "11", page: "1" })}
            >
              Class 11
            </button>
            <button
              type="button"
              className={`inline-flex min-h-[44px] min-w-[7.5rem] items-center justify-center rounded-full border px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                selectedClass === 12
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => updateQuery({ class: "12", page: "1" })}
            >
              Class 12
            </button>
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
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <AsyncState
        loading={loading}
        error={error}
        empty={selectedClass != null && !loading && !error && rows.length === 0}
        onRetry={() => void load()}
        emptyTitle="No students match"
        emptyDescription="Adjust filters or add a new student."
      >
        {selectedClass == null ? null : (
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
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
                  <td className="px-4 py-3 text-slate-700">{s.class_year}</td>
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
        )}
      </AsyncState>

      <div className="shrink-0 flex items-center justify-between text-sm text-slate-600">
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
          </div>
        </div>
      )}

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
          <label className="text-sm font-medium text-slate-700">
            Class
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              {...addForm.register("class_year", { valueAsNumber: true })}
            >
              <option value={11}>Class 11</option>
              <option value={12}>Class 12</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Course (PU stream)
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...addForm.register("course")}>
              <option value="PCM">PCM</option>
              <option value="PCMB">PCMB</option>
            </select>
          </label>
          {addForm.formState.errors.course?.message ? (
            <p className="text-sm text-rose-600">{addForm.formState.errors.course.message}</p>
          ) : null}
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
              <dt className="text-slate-500">Class</dt>
              <dd className="font-medium">{detail.class_year}</dd>
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
          <label className="text-sm font-medium text-slate-700">
            Class
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              {...editForm.register("class_year", { valueAsNumber: true })}
            >
              <option value={11}>Class 11</option>
              <option value={12}>Class 12</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Course (PU stream)
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" {...editForm.register("course")}>
              <option value="PCM">PCM</option>
              <option value="PCMB">PCMB</option>
            </select>
          </label>
          {editForm.formState.errors.course?.message ? (
            <p className="text-sm text-rose-600">{editForm.formState.errors.course.message}</p>
          ) : null}
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
