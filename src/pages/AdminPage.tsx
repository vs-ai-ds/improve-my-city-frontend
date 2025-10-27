// File: src\pages\AdminPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listIssues, updateIssueStatus } from "../services/issues.api";


export default function AdminPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["issues-admin"], queryFn: () => listIssues({ limit: 100 }) });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "pending"|"in_progress"|"resolved" }) => updateIssueStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues-admin"] }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p className="text-red-700">Failed to load.</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Admin: Manage issues</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded border">
          <thead>
            <tr className="text-left bg-gray-100">
              <th className="p-2">ID</th><th className="p-2">Title</th><th className="p-2">Category</th><th className="p-2">Status</th><th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{i.id}</td>
                <td className="p-2">{i.title}</td>
                <td className="p-2">{i.category}</td>
                <td className="p-2">{i.status}</td>
                <td className="p-2">
                  {["pending","in_progress","resolved"].map(s => (
                    <button key={s} onClick={()=>mut.mutate({ id: i.id, status: s as any})}
                      className={`mr-2 rounded px-2 py-1 text-xs border ${i.status===s?"bg-blue-600 text-white":"bg-white"}`}>
                      {s.replace("_"," ")}
                    </button>
                  ))}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}