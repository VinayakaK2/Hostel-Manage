import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminClientError } from "@/lib/api/adminClient";
import {
  fetchAdminProfile,
  fetchAdminProfileActivity,
  patchAdminPassword,
  patchAdminProfile,
} from "@/modules/admin/api/adminListsApi";
import { AsyncState } from "@/modules/admin/components/AsyncState";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const passwordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string().min(8).max(100),
});

interface ProfileDto {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface ActivityDto {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

export function AdminProfilePage() {
  const [tab, setTab] = useState<"profile" | "password" | "activity">("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [activity, setActivity] = useState<ActivityDto[]>([]);

  const pf = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema) });
  const pw = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void fetchAdminProfile(ac.signal)
      .then((raw) => {
        const p = raw as ProfileDto;
        setProfile(p);
        pf.reset({ name: p.name, email: p.email });
      })
      .catch((e) => {
        if (e instanceof AdminClientError && e.failure === "ABORTED") return;
        setError(e instanceof AdminClientError ? e.message : "Unable to load profile.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [pf]);

  useEffect(() => {
    if (tab !== "activity") return;
    const ac = new AbortController();
    void fetchAdminProfileActivity(ac.signal)
      .then((raw) => {
        const payload = raw as { items?: ActivityDto[] };
        setActivity(payload.items ?? []);
      })
      .catch(() => setActivity([]));
    return () => ac.abort();
  }, [tab]);

  return (
    <div className="erp-page">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Account</p>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Profile</h2>
        <p className="mt-1 text-sm text-slate-600">Manage identity, credentials, and your audit trail.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["profile", "password", "activity"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-brand-700 text-white shadow-sm" : "bg-white text-slate-800 ring-1 ring-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AsyncState loading={loading} error={error} empty={!profile}>
        {tab === "profile" && profile ? (
          <form
            className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
            onSubmit={pf.handleSubmit(async (v) => {
              const updated = (await patchAdminProfile(v)) as ProfileDto;
              setProfile(updated);
            })}
          >
            <TextField label="Name" {...pf.register("name")} error={pf.formState.errors.name?.message} />
            <TextField label="Email" {...pf.register("email")} error={pf.formState.errors.email?.message} />
            <Button type="submit">Update profile</Button>
          </form>
        ) : null}

        {tab === "password" ? (
          <form
            className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
            onSubmit={pw.handleSubmit(async (v) => {
              await patchAdminPassword(v);
              pw.reset();
            })}
          >
            <PasswordField
              label="Current password"
              {...pw.register("current_password")}
              error={pw.formState.errors.current_password?.message}
            />
            <PasswordField
              label="New password"
              {...pw.register("new_password")}
              error={pw.formState.errors.new_password?.message}
            />
            <Button type="submit">Change password</Button>
          </form>
        ) : null}

        {tab === "activity" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <ul className="divide-y divide-slate-100">
              {activity.map((a) => (
                <li key={a.id} className="py-3 text-sm">
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.type}</p>
                  <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </AsyncState>
    </div>
  );
}
