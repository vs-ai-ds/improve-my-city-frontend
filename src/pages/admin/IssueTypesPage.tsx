// File: src\pages\admin\IssueTypesPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType } from "../../services/admin.issueTypes.api";
import AdminLayout from "./AdminLayout";
import { useState } from "react";

export default function IssueTypesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["issue-types"], queryFn: listIssueTypes });
  const [name, setName] = useState("");
  const mCreate = useMutation({ mutationFn: () => createIssueType({ name }), onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["issue-types"] }); } });

  return (
    <AdminLayout>
      <h2 className="text-xl font-semibold mb-3">Issue Types</h2>
      <div className="flex gap-2 mb-3">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="New type" className="rounded-xl border p-2" />
        <button onClick={()=>mCreate.mutate()} className="rounded-xl px-3 py-2 bg-indigo-600 text-white">Add</button>
      </div>
      <div className="grid gap-2">
        {(data ?? []).map((t:any)=> (
          <div key={t.id} className="rounded-xl border p-3 flex items-center justify-between">
            <div>{t.name}</div>
            <div className="flex gap-2">
              <button onClick={async()=>{ const n = prompt("Rename to", t.name); if(n){ await updateIssueType(t.id, { name: n }); qc.invalidateQueries({ queryKey: ["issue-types"] }); } }} className="px-3 py-1 rounded-xl border">Rename</button>
              <button onClick={async()=>{ if(confirm("Delete?")) { await deleteIssueType(t.id); qc.invalidateQueries({ queryKey: ["issue-types"] }); } }} className="px-3 py-1 rounded-xl bg-red-600 text-white">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}