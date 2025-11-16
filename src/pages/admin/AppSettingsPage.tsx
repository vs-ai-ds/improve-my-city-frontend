// File: src\pages\admin\AppSettingsPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSettings, updateAdminSettings } from "../../services/settings.api";

export default function AppSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings });
  const m = useMutation({ mutationFn: (p: any) => updateAdminSettings(p), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-settings"] }) });

  if (!data) return <div>Loading…</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">App Settings</h2>
      <div className="space-y-3 max-w-xl">
        <ToggleRow label="Allow anonymous reporting" value={data.allow_anonymous_reporting} onChange={(v)=>m.mutate({ ...data, allow_anonymous_reporting: v })} />
        <ToggleRow label="Open admin registration" value={data.allow_open_admin_registration} onChange={(v)=>m.mutate({ ...data, allow_open_admin_registration: v })} />
        <div className="grid grid-cols-2 gap-2">
          <input defaultValue={data.email_from_name} placeholder="Email From Name" className="rounded-xl border p-2" />
          <input defaultValue={data.email_from_address} placeholder="Email From Address" className="rounded-xl border p-2" />
        </div>
        <button onClick={()=>{
          const name = (document.querySelector("input[placeholder='Email From Name']") as HTMLInputElement).value;
          const addr = (document.querySelector("input[placeholder='Email From Address']") as HTMLInputElement).value;
          m.mutate({ ...data, email_from_name: name, email_from_address: addr });
        }} className="rounded-xl px-3 py-2 bg-indigo-600 text-white">Save</button>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v:boolean)=>void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border p-3">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e)=>onChange(e.target.checked)} />
    </label>
  );
}