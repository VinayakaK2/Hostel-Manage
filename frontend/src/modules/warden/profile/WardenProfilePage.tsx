import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { WardenClientError } from "@/lib/api/wardenClient";
import { fetchWardenProfile, updateWardenPassword, updateWardenProfile } from "@/modules/warden/api/wardenApi";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().max(24).optional().nullable(),
});

const passwordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string().min(8),
});

export function WardenProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchWardenProfile>> | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });

  const pw = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchWardenProfile(ac.signal)
      .then((p) => {
        if (ac.signal.aborted) return;
        setData(p);
        form.reset({ name: p.name, email: p.email, phone: p.phone ?? "" });
      })
      .catch((e) => {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        if (ac.signal.aborted) return;
        setError(e instanceof WardenClientError ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
    // Intentionally run once on mount — `form` from react-hook-form is not a stable reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="erp-page">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-600">Manage your account and review hostel assignment.</p>
      </div>

      <AsyncState loading={loading} error={error} empty={!data} onRetry={() => window.location.reload()}>
        {data ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-semibold text-slate-900">Hostel assignment</h3>
              {data.assigned_hostel ? (
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Hostel</dt>
                    <dd className="font-medium">{data.assigned_hostel.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Type</dt>
                    <dd>{data.assigned_hostel.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Capacity</dt>
                    <dd>{data.assigned_hostel.capacity}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-amber-800">No active hostel assignment on file.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-semibold text-slate-900">Contact details</h3>
              <form
                className="mt-4 grid gap-3"
                onSubmit={form.handleSubmit(async (v) => {
                  const ac = new AbortController();
                  try {
                    const next = await updateWardenProfile(
                      { name: v.name, email: v.email, phone: v.phone || null },
                      ac.signal,
                    );
                    setData(next);
                  } catch (e) {
                    alert(e instanceof WardenClientError ? e.message : "Update failed");
                  }
                })}
              >
                <TextField label="Name" {...form.register("name")} />
                <TextField label="Email" type="email" {...form.register("email")} />
                <TextField label="Phone" {...form.register("phone")} />
                <Button type="submit">Save profile</Button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
              <form
                className="mt-4 grid gap-3"
                onSubmit={pw.handleSubmit(async (v) => {
                  const ac = new AbortController();
                  try {
                    await updateWardenPassword(v, ac.signal);
                    pw.reset();
                    alert("Password updated");
                  } catch (e) {
                    alert(e instanceof WardenClientError ? e.message : "Failed");
                  }
                })}
              >
                <PasswordField label="Current password" autoComplete="current-password" {...pw.register("current_password")} />
                <PasswordField label="New password" autoComplete="new-password" {...pw.register("new_password")} />
                <Button type="submit" variant="secondary">
                  Update password
                </Button>
              </form>
            </section>
          </div>
        ) : null}
      </AsyncState>
    </div>
  );
}
