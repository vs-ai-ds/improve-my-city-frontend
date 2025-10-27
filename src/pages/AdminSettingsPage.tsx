// File: src\pages\AdminSettingsPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

// src/pages/AdminSettingsPage.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "../services/admin.api";

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const mut = useMutation({ mutationFn: updateSettings, onSuccess: () => qc.invalidateQueries({queryKey:["settings"]}) });

  if (!data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.allow_anonymous_reporting}
               onChange={(e)=>mut.mutate({ allow_anonymous_reporting: e.target.checked })} />
        Allow anonymous reporting
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.allow_open_admin_registration}
               onChange={(e)=>mut.mutate({ allow_open_admin_registration: e.target.checked })} />
        Allow open admin registration
      </label>
    </div>
  );
}