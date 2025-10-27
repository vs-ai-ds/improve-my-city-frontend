// File: src\pages\admin\IssuesTablePage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useQuery } from "@tanstack/react-query";
import { assignIssue, listIssues, updateIssueStatus } from "../../services/admin.issues.api";
import { useState } from "react";
import AdminLayout from "./AdminLayout";

export default function IssuesTablePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const { data, refetch } = useQuery({ queryKey: ["admin-issues", { q, status }], queryFn: () => listIssues({ q, status }) });

  return (
    <AdminLayout>
      <h2 className="text-xl font-semibold mb-3">Issues</h2>
      <div className="flex gap-2 mb-3">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search" className="rounded-xl border p-2" />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border p-2">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <button onClick={()=>refetch()} className="rounded-xl px-3 py-2 border">Refresh</button>
      </div>
      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">State</th>
              <th className="text-left p-2">Assign</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((it:any)=> (
              <tr key={it.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2">#{it.id}</td>
                <td className="p-2 max-w-[28ch] truncate">{it.title}</td>
                <td className="p-2 capitalize">{it.status.replace("_"," ")}</td>
                <td className="p-2">{it.category}</td>
                <td className="p-2">{it.state_code}</td>
                <td className="p-2"><input className="rounded-xl border p-1 w-24" placeholder="User ID" onKeyDown={async(e)=>{
                  if(e.key==='Enter') { const v = parseInt((e.target as HTMLInputElement).value); if(v) { await assignIssue(it.id, v); refetch(); } }
                }} /></td>
                <td className="p-2 flex gap-2">
                  <button className="px-2 py-1 rounded-xl border" onClick={async()=>{ await updateIssueStatus(it.id, 'in_progress'); refetch();}}>In Progress</button>
                  <button className="px-2 py-1 rounded-xl bg-emerald-600 text-white" onClick={async()=>{ await updateIssueStatus(it.id, 'resolved'); refetch();}}>Resolved</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}