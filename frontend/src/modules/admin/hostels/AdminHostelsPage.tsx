import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminClientError } from "@/lib/api/adminClient";
import {
  createHostel,
  createHostelRoom,
  listHostels,
  setHostelStatus,
  updateHostel,
  type HostelRow,
} from "@/modules/admin/api/adminListsApi";
import { AppModal } from "@/modules/admin/components/AppModal";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const createHostelSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["BOYS", "GIRLS"]),
  capacity: z.coerce.number().int().min(1),
  floor_count: z.coerce.number().int().min(1),
});

const roomSchema = z.object({
  room_number: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(20),
  floor: z.coerce.number().int().min(0),
});

const editHostelSchema = z.object({
  name: z.string().min(2),
  capacity: z.coerce.number().int().min(1),
  floor_count: z.coerce.number().int().min(1),
});

export function AdminHostelsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HostelRow[]>([]);
  const [reload, setReload] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [roomHostel, setRoomHostel] = useState<HostelRow | null>(null);
  const [edit, setEdit] = useState<HostelRow | null>(null);

  const createForm = useForm<z.infer<typeof createHostelSchema>>({
    resolver: zodResolver(createHostelSchema),
    defaultValues: { floor_count: 1, type: "BOYS", capacity: 100, name: "" },
  });
  const roomForm = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: { floor: 1, capacity: 4, room_number: "" },
  });
  const editForm = useForm<z.infer<typeof editHostelSchema>>({
    resolver: zodResolver(editHostelSchema),
  });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void listHostels({ page: 1, limit: 50, sort: "name_asc" }, ac.signal)
      .then((r) => setRows(r.items))
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load hostels.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [reload]);

  const bump = () => setReload((x) => x + 1);

  useEffect(() => {
    if (!edit) return;
    editForm.reset({
      name: edit.name,
      capacity: edit.capacity,
      floor_count: edit.floor_count,
    });
  }, [edit, editForm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Inventory</p>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Hostel management</h2>
          <p className="mt-1 text-sm text-slate-600">Capacity, occupancy, and room configuration.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create Hostel
        </Button>
      </div>

      <AsyncState loading={loading} error={error} empty={!loading && !error && rows.length === 0} onRetry={bump}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Hostel Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Occupancy</th>
                  <th className="px-4 py-3">Floors</th>
                  <th className="px-4 py-3">Assigned Warden</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{h.name}</td>
                    <td className="px-4 py-3">{h.type}</td>
                    <td className="px-4 py-3">{h.capacity}</td>
                    <td className="px-4 py-3">
                      {h.currentOccupancy}/{h.capacity}
                    </td>
                    <td className="px-4 py-3">{h.floorsInUse}</td>
                    <td className="px-4 py-3">
                      {h.assignedWardens.length ? h.assignedWardens.map((w) => w.name).join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">{h.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEdit(h)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => setRoomHostel(h)}>
                          Rooms
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs text-rose-700"
                          disabled={h.status === "INACTIVE"}
                          onClick={() => void setHostelStatus(h.id, "INACTIVE").then(() => bump())}
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
        title="Create hostel"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createForm.handleSubmit(async (v) => {
                await createHostel(v);
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" {...createForm.register("type")}>
              <option value="BOYS">BOYS</option>
              <option value="GIRLS">GIRLS</option>
            </select>
          </div>
          <TextField
            label="Capacity"
            type="number"
            {...createForm.register("capacity", { valueAsNumber: true })}
            error={createForm.formState.errors.capacity?.message}
          />
          <TextField
            label="Floors"
            type="number"
            {...createForm.register("floor_count", { valueAsNumber: true })}
            error={createForm.formState.errors.floor_count?.message}
          />
        </div>
      </AppModal>

      <AppModal
        open={!!edit}
        title="Edit hostel"
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={editForm.handleSubmit(async (v) => {
                if (!edit) return;
                await updateHostel(edit.id, v);
                setEdit(null);
                bump();
              })}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
            <TextField label="Name" {...editForm.register("name")} error={editForm.formState.errors.name?.message} />
            <TextField
              label="Capacity"
              type="number"
              {...editForm.register("capacity")}
              error={editForm.formState.errors.capacity?.message}
            />
            <TextField
              label="Floors"
              type="number"
              {...editForm.register("floor_count")}
              error={editForm.formState.errors.floor_count?.message}
            />
        </div>
      </AppModal>

      <AppModal
        open={!!roomHostel}
        title="Configure rooms"
        onClose={() => setRoomHostel(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoomHostel(null)}>
              Close
            </Button>
            <Button
              onClick={roomForm.handleSubmit(async (v) => {
                if (!roomHostel) return;
                await createHostelRoom(roomHostel.id, v);
                roomForm.reset({ room_number: "", capacity: 4, floor: 1 });
                bump();
              })}
            >
              Add room
            </Button>
          </>
        }
      >
        {roomHostel ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Adding rooms to <span className="font-semibold">{roomHostel.name}</span>
            </p>
            <TextField label="Room number" {...roomForm.register("room_number")} error={roomForm.formState.errors.room_number?.message} />
            <TextField
              label="Capacity"
              type="number"
              {...roomForm.register("capacity", { valueAsNumber: true })}
              error={roomForm.formState.errors.capacity?.message}
            />
            <TextField
              label="Floor"
              type="number"
              {...roomForm.register("floor", { valueAsNumber: true })}
              error={roomForm.formState.errors.floor?.message}
            />
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}
