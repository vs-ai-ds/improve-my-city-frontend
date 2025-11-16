import { useQuery } from "@tanstack/react-query";
import { assignIssue, listIssues, updateIssueStatus } from "../../services/admin.issues.api";
import { useState, useMemo } from "react";
import { useIssueTypes } from "../../hooks/useIssueTypes";
import { api } from "../../services/apiClient";

export default function IssuesTablePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [sortBy, setSortBy] = useState<"id" | "title" | "status" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  const { data: types } = useIssueTypes();
  const typeOptions = useMemo(() => 
    Array.isArray(types) ? types.map((t: any) => t.name).filter(Boolean) : [],
    [types]
  );
  
  const { data: stateCodesData } = useQuery({
    queryKey: ["state-codes"],
    queryFn: async () => {
      const { data } = await api.get("/issues/stats/by-state", { params: { range: "all" } });
      return (data || []).map((d: any) => d.state_code).filter(Boolean);
    },
    staleTime: 300000, // 5 minutes
  });
  
  const { data: issuesData, refetch } = useQuery({ 
    queryKey: ["admin-issues", { status, category, stateCode, page, sortBy, sortOrder }], 
    queryFn: async () => {
      const data = await listIssues({ 
        status: status || undefined, 
        category: category || undefined,
        state_code: stateCode || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return data;
    }
  });
  
  const issues = useMemo(() => {
    if (!issuesData) return [];
    if (Array.isArray(issuesData)) return issuesData;
    return issuesData.items || [];
  }, [issuesData]);
  
  const totalIssues = useMemo(() => {
    if (!issuesData || Array.isArray(issuesData)) return issues.length;
    return issuesData.total || issues.length;
  }, [issuesData, issues.length]);
  
  const filteredIssues = useMemo(() => {
    if (!search.trim()) return issues;
    const s = search.toLowerCase();
    return issues.filter((it: any) => 
      it.title?.toLowerCase().includes(s) || 
      it.description?.toLowerCase().includes(s) ||
      String(it.id).includes(s)
    );
  }, [issues, search]);
  
  const sortedIssues = useMemo(() => {
    const sorted = [...filteredIssues];
    sorted.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      if (sortBy === "id") {
        aVal = a.id || 0;
        bVal = b.id || 0;
      } else if (sortBy === "title") {
        aVal = (a.title || "").toLowerCase();
        bVal = (b.title || "").toLowerCase();
      } else if (sortBy === "status") {
        const order = { pending: 1, in_progress: 2, resolved: 3 };
        aVal = order[a.status as keyof typeof order] || 0;
        bVal = order[b.status as keyof typeof order] || 0;
      } else if (sortBy === "created_at") {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    return sorted;
  }, [filteredIssues, sortBy, sortOrder]);
  
  const totalPages = Math.ceil(totalIssues / pageSize);

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800">Manage Issues</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <input 
          value={search} 
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
          placeholder="Search by title, description, or ID" 
          className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select 
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(1); }} 
          className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select 
          value={category} 
          onChange={(e) => { setCategory(e.target.value); setPage(1); }} 
          className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Categories</option>
          {typeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select 
          value={stateCode} 
          onChange={(e) => { setStateCode(e.target.value); setPage(1); }} 
          className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All States</option>
          {(stateCodesData || []).map((sc: string) => (
            <option key={sc} value={sc}>{sc}</option>
          ))}
        </select>
        <button 
          onClick={() => refetch()} 
          className="rounded-xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="created_at">Date</option>
            <option value="id">ID</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {totalIssues} total issue{totalIssues !== 1 ? "s" : ""}
        </div>
      </div>
      
      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">ID</th>
              <th className="text-left p-3 font-semibold text-gray-700">Title</th>
              <th className="text-left p-3 font-semibold text-gray-700">Status</th>
              <th className="text-left p-3 font-semibold text-gray-700">Category</th>
              <th className="text-left p-3 font-semibold text-gray-700">State</th>
              <th className="text-left p-3 font-semibold text-gray-700">Assign</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedIssues.length > 0 ? sortedIssues.map((it:any)=> {
              const statusColors: Record<string, string> = {
                pending: "bg-amber-100 text-amber-800",
                in_progress: "bg-yellow-100 text-yellow-800",
                resolved: "bg-emerald-100 text-emerald-800",
              };
              const statusColor = statusColors[it.status] || "bg-gray-100 text-gray-800";
              
              return (
                <tr key={it.id} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                  <td className="p-3 font-mono text-indigo-600">#{it.id}</td>
                  <td className="p-3 max-w-[32ch] truncate font-medium">{it.title}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                      {it.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="p-3">{it.category || "—"}</td>
                  <td className="p-3 font-mono text-sm">{it.state_code || "—"}</td>
                  <td className="p-3">
                    <input 
                      className="rounded-lg border border-gray-300 p-1.5 w-28 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" 
                      placeholder="User ID" 
                      onKeyDown={async(e)=>{
                        if(e.key==='Enter') { 
                          const v = parseInt((e.target as HTMLInputElement).value); 
                          if(v) { 
                            await assignIssue(it.id, v); 
                            refetch(); 
                            (e.target as HTMLInputElement).value = "";
                          } 
                        } 
                      }} 
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {it.status !== "in_progress" && (
                        <button 
                          className="px-3 py-1.5 rounded-lg border-2 border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-xs font-medium transition-colors" 
                          onClick={async()=>{ await updateIssueStatus(it.id, 'in_progress'); refetch();}}
                        >
                          Start
                        </button>
                      )}
                      {it.status !== "resolved" && (
                        <button 
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition-colors" 
                          onClick={async()=>{ await updateIssueStatus(it.id, 'resolved'); refetch();}}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No issues found. {search && "Try adjusting your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalIssues > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalIssues)} of {totalIssues} issues
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700 flex items-center">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
