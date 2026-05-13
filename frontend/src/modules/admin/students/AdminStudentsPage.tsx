import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminClientError } from "@/lib/api/adminClient";
import {
  createStudent,
  fetchHostelRooms,
  listHostels,
  listStudents,
  setStudentStatus,
  transferStudentRoom,
  updateStudent,
  type StudentRow,
} from "@/modules/admin/api/adminListsApi";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const studentFormSchema = z.object({
  student_id: z.string().trim().min(3).max(32),
  name: z.string().trim().min(2).max(120),
  gender: z.enum(["MALE", "FEMALE"]),
  class_year: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.union([z.literal(11), z.literal(12)]),
  ),
  course: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  parent_contact: z.string().trim().min(6).max(32),
  hostel_id: z.string().min(1),
  room_id: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;
const studentFormResolver = zodResolver(studentFormSchema) as Resolver<StudentFormValues>;

function StudentTable({
  rows,
  onView,
  onEdit,
  onTransfer,
  onDisable,
}: {
  rows: StudentRow[];
  onView: (s: StudentRow) => void;
  onEdit: (s: StudentRow) => void;
  onTransfer: (s: StudentRow) => void;
  onDisable: (s: StudentRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Hostel</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Parent Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono text-xs text-slate-800">{s.student_id}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                <td className="px-4 py-3 text-slate-700">{s.class_year}</td>
                <td className="px-4 py-3 text-slate-700">{s.course}</td>
                <td className="px-4 py-3 text-slate-700">{s.hostel.name}</td>
                <td className="px-4 py-3 text-slate-700">{s.room?.room_number ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{s.parent_contact}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-900 ring-1 ring-brand-100">
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => onView(s)}>
                      View
                    </Button>
                    <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(s)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => onTransfer(s)}>
                      Transfer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      onClick={() => onDisable(s)}
                      disabled={s.status === "INACTIVE"}
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
  );
}

function StudentSection({
  title,
  description,
  genderForm,
  listGender,
  classYear,
}: {
  title: string;
  description: string;
  genderForm: "MALE" | "FEMALE";
  listGender: "BOYS" | "GIRLS";
  classYear: 11 | 12;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const [view, setView] = useState<StudentRow | null>(null);
  const [edit, setEdit] = useState<StudentRow | null>(null);
  const [transfer, setTransfer] = useState<StudentRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [hostels, setHostels] = useState<{ id: string; label: string }[]>([]);
  const [roomsForAdd, setRoomsForAdd] = useState<{ id: string; label: string }[]>([]);
  const [roomsForTransfer, setRoomsForTransfer] = useState<{ id: string; label: string }[]>([]);
  const [transferRoom, setTransferRoom] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    void listHostels({ page: 1, limit: 100, status: "ACTIVE" }, ac.signal)
      .then((h) => {
        const filtered = h.items.filter((x) =>
          genderForm === "MALE" ? x.type === "BOYS" : x.type === "GIRLS",
        );
        setHostels(filtered.map((x) => ({ id: x.id, label: x.name })));
      })
      .catch(() => setHostels([]));
    return () => ac.abort();
  }, [genderForm]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void listStudents(
      {
        page,
        limit: 10,
        search: search.trim() || undefined,
        gender: listGender,
        class: classYear,
        sort: "name_asc",
      },
      ac.signal,
    )
      .then((res) => {
        setRows(res.items);
        setTotalPages(res.meta.totalPages);
      })
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load students.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [listGender, classYear, page, search, reloadKey]);

  const form = useForm<StudentFormValues>({
    resolver: studentFormResolver,
    defaultValues: {
      student_id: "",
      name: "",
      gender: genderForm,
      class_year: classYear,
      course: "",
      phone: "",
      parent_contact: "",
      hostel_id: "",
      room_id: "",
      status: "ACTIVE",
    },
  });

  const editForm = useForm<StudentFormValues>({
    resolver: studentFormResolver,
  });

  useEffect(() => {
    if (!addOpen) return;
    form.reset({
      student_id: "",
      name: "",
      gender: genderForm,
      class_year: classYear,
      course: "",
      phone: "",
      parent_contact: "",
      hostel_id: hostels[0]?.id ?? "",
      room_id: "",
      status: "ACTIVE",
    });
  }, [addOpen, genderForm, classYear, hostels, form]);

  const hostelIdWatch = form.watch("hostel_id");
  useEffect(() => {
    if (!hostelIdWatch) {
      setRoomsForAdd([]);
      return;
    }
    const ac = new AbortController();
    void fetchHostelRooms(hostelIdWatch, ac.signal)
      .then((r) => {
        setRoomsForAdd(
          r.items
            .filter((room) => room.status === "ACTIVE" && room.current_occupancy < room.capacity)
            .map((room) => ({
              id: room.id,
              label: `${room.room_number} · ${room.current_occupancy}/${room.capacity}`,
            })),
        );
      })
      .catch(() => setRoomsForAdd([]));
    return () => ac.abort();
  }, [hostelIdWatch]);

  useEffect(() => {
    if (!transfer) {
      setRoomsForTransfer([]);
      setTransferRoom("");
      return;
    }
    const ac = new AbortController();
    void fetchHostelRooms(transfer.hostel.id, ac.signal)
      .then((r) => {
        setRoomsForTransfer(
          r.items
            .filter((room) => room.status === "ACTIVE" && room.current_occupancy < room.capacity)
            .map((room) => ({
              id: room.id,
              label: `${room.room_number} · ${room.current_occupancy}/${room.capacity}`,
            })),
        );
      })
      .catch(() => setRoomsForTransfer([]));
    return () => ac.abort();
  }, [transfer]);

  const bump = () => setReloadKey((k) => k + 1);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm sm:w-64"
            placeholder="Search name, ID, course…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            aria-label={`Search ${title}`}
          />
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add Student
          </Button>
        </div>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && !error && rows.length === 0}
        onRetry={bump}
        emptyTitle="No students found"
        emptyDescription="Adjust search filters or add a new student record."
      >
        <StudentTable
          rows={rows}
          onView={setView}
          onEdit={(s) => {
            setEdit(s);
            editForm.reset({
              student_id: s.student_id,
              name: s.name,
              gender: s.gender,
              class_year: s.class_year === 12 ? 12 : 11,
              course: s.course,
              phone: s.phone ?? "",
              parent_contact: s.parent_contact,
              hostel_id: s.hostel.id,
              room_id: s.room?.id ?? "",
              status: s.status,
            });
          }}
          onTransfer={setTransfer}
          onDisable={(s) => {
            void setStudentStatus(s.id, "INACTIVE")
              .then(() => bump())
              .catch(() => undefined);
          }}
        />
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AsyncState>

      <AppModal
        open={!!view}
        title="Student profile"
        onClose={() => setView(null)}
        footer={<Button onClick={() => setView(null)}>Close</Button>}
      >
        {view ? (
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Student ID</dt>
              <dd className="font-mono text-slate-900">{view.student_id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Name</dt>
              <dd className="text-slate-900">{view.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Class</dt>
              <dd className="text-slate-900">{view.class_year}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Course</dt>
              <dd className="text-slate-900">{view.course}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Hostel</dt>
              <dd className="text-slate-900">{view.hostel.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Room</dt>
              <dd className="text-slate-900">{view.room?.room_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Parent contact</dt>
              <dd className="text-slate-900">{view.parent_contact}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Status</dt>
              <dd className="text-slate-900">{view.status}</dd>
            </div>
          </dl>
        ) : null}
      </AppModal>

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
              onClick={form.handleSubmit(async (values) => {
                const body = {
                  ...values,
                  phone: values.phone || undefined,
                  room_id: values.room_id || undefined,
                };
                await createStudent(body);
                setAddOpen(false);
                setPage(1);
                bump();
              })}
            >
              Save
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <TextField label="Student ID" {...form.register("student_id")} error={form.formState.errors.student_id?.message} />
          <TextField label="Full name" {...form.register("name")} error={form.formState.errors.name?.message} />
          <input type="hidden" {...form.register("class_year", { valueAsNumber: true })} />
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Class {classYear}</span>
            <span className="text-slate-500"> — new students in this list are assigned to this class.</span>
          </p>
          <TextField label="Course" {...form.register("course")} error={form.formState.errors.course?.message} />
          <TextField label="Phone (optional)" {...form.register("phone")} error={form.formState.errors.phone?.message} />
          <TextField
            label="Parent contact"
            {...form.register("parent_contact")}
            error={form.formState.errors.parent_contact?.message}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Hostel</label>
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" {...form.register("hostel_id")}>
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Room (optional)</label>
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" {...form.register("room_id")}>
              <option value="">Unassigned</option>
              {roomsForAdd.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={!!edit}
        title="Edit student"
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={editForm.handleSubmit(async (values) => {
                if (!edit) return;
                await updateStudent(edit.id, {
                  student_id: values.student_id,
                  name: values.name,
                  class_year: values.class_year,
                  course: values.course,
                  phone: values.phone || undefined,
                  parent_contact: values.parent_contact,
                  hostel_id: values.hostel_id,
                  status: values.status,
                });
                setEdit(null);
                bump();
              })}
            >
              Save changes
            </Button>
          </>
        }
      >
        {edit ? (
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <TextField label="Student ID" {...editForm.register("student_id")} error={editForm.formState.errors.student_id?.message} />
            <TextField label="Full name" {...editForm.register("name")} error={editForm.formState.errors.name?.message} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                {...editForm.register("class_year", { valueAsNumber: true })}
              >
                <option value={11}>Class 11</option>
                <option value={12}>Class 12</option>
              </select>
            </div>
            <TextField label="Course" {...editForm.register("course")} error={editForm.formState.errors.course?.message} />
            <TextField label="Phone" {...editForm.register("phone")} error={editForm.formState.errors.phone?.message} />
            <TextField
              label="Parent contact"
              {...editForm.register("parent_contact")}
              error={editForm.formState.errors.parent_contact?.message}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" {...editForm.register("status")}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <input type="hidden" {...editForm.register("hostel_id")} />
            <input type="hidden" {...editForm.register("gender")} />
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={!!transfer}
        title="Transfer room"
        onClose={() => setTransfer(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransfer(null)}>
              Cancel
            </Button>
            <Button
              disabled={!transferRoom}
              onClick={async () => {
                if (!transfer || !transferRoom) return;
                await transferStudentRoom(transfer.id, transferRoom);
                setTransfer(null);
                bump();
              }}
            >
              Transfer
            </Button>
          </>
        }
      >
        {transfer ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Moving <span className="font-semibold">{transfer.name}</span> within{" "}
              <span className="font-semibold">{transfer.hostel.name}</span>.
            </p>
            <label className="block text-sm font-medium text-slate-700">Select room</label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              value={transferRoom}
              onChange={(e) => setTransferRoom(e.target.value)}
            >
              <option value="">Choose…</option>
              {roomsForTransfer.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </AppModal>
    </section>
  );
}

export function AdminStudentsPage() {
  const [cohort, setCohort] = useState<null | "MALE" | "FEMALE">(null);
  const [classYear, setClassYear] = useState<null | 11 | 12>(null);

  const pill =
    "inline-flex min-h-[44px] min-w-[7.5rem] items-center justify-center rounded-full border px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";
  const pillOff = "border-slate-200 bg-white text-slate-600 hover:border-slate-300";
  const pillOn = "border-brand-600 bg-brand-600 text-white shadow-sm";

  return (
    <div className="erp-page-wide">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Directory</p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Student management
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Choose boys or girls, then a class. Lists load from the server with the matching cohort and class only.
        </p>
      </div>

      {cohort === null ? (
        <div className="erp-panel-grid">
          <button
            type="button"
            onClick={() => setCohort("MALE")}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-6 text-left shadow-card transition hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-lg font-bold text-brand-800 ring-1 ring-brand-200">
              B
            </span>
            <span>
              <span className="block text-lg font-semibold text-slate-900">Boys</span>
              <span className="mt-1 block text-sm text-slate-600">
                Male students in boys hostels — tap to choose a class.
              </span>
            </span>
            <span className="text-sm font-semibold text-brand-700 group-hover:underline">Continue →</span>
          </button>
          <button
            type="button"
            onClick={() => setCohort("FEMALE")}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-6 text-left shadow-card transition hover:border-rose-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-lg font-bold text-rose-800 ring-1 ring-rose-100">
              G
            </span>
            <span>
              <span className="block text-lg font-semibold text-slate-900">Girls</span>
              <span className="mt-1 block text-sm text-slate-600">
                Female students in girls hostels — tap to choose a class.
              </span>
            </span>
            <span className="text-sm font-semibold text-rose-700 group-hover:underline">Continue →</span>
          </button>
        </div>
      ) : classYear === null ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCohort(null);
                setClassYear(null);
              }}
            >
              ← Boys / Girls
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{cohort === "MALE" ? "Boys" : "Girls"}</span> — pick a
            class to load students.
          </p>
          <div
            className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5"
            role="tablist"
            aria-label="Class"
          >
            <button type="button" className={`${pill} ${pillOff}`} onClick={() => setClassYear(11)}>
              Class 11
            </button>
            <button type="button" className={`${pill} ${pillOff}`} onClick={() => setClassYear(12)}>
              Class 12
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setClassYear(null)}>
              ← Class
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCohort(null);
                setClassYear(null);
              }}
            >
              ← Boys / Girls
            </Button>
          </div>
          <div
            className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5"
            role="tablist"
            aria-label="Class"
          >
            <button
              type="button"
              role="tab"
              aria-selected={classYear === 11}
              className={`${pill} ${classYear === 11 ? pillOn : pillOff}`}
              onClick={() => setClassYear(11)}
            >
              Class 11
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={classYear === 12}
              className={`${pill} ${classYear === 12 ? pillOn : pillOff}`}
              onClick={() => setClassYear(12)}
            >
              Class 12
            </button>
          </div>
          {cohort === "MALE" ? (
            <StudentSection
              title={`Boys — Class ${classYear}`}
              description="Male students in boys hostels for the selected class."
              genderForm="MALE"
              listGender="BOYS"
              classYear={classYear}
            />
          ) : (
            <StudentSection
              title={`Girls — Class ${classYear}`}
              description="Female students in girls hostels for the selected class."
              genderForm="FEMALE"
              listGender="GIRLS"
              classYear={classYear}
            />
          )}
        </div>
      )}
    </div>
  );
}
