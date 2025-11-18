import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignIssue, listIssues, updateIssueStatus } from "../../services/admin.issues.api";
import { useState, useMemo } from "react";
import { useIssueTypes } from "../../hooks/useIssueTypes";
import { api } from "../../services/apiClient";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../../components/toast/ToastProvider";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import IssueDetailModal from "../../components/report/IssueDetailModal";
import Pagination from "../../components/ui/Pagination";
import { getStatusColors } from "../../constants/statusColors";

export default function IssuesTablePage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [detailIssueId, setDetailIssueId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState<"id" | "title" | "status" | "created_at" | "updated_at" | "type" | "region" | "assigned_to">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reassignIssue, setReassignIssue] = useState<{ id: number; currentUserId?: number } | null>(null);
  
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
    staleTime: 300000,
  });

  const { data: staffAdminUsers } = useQuery({
    queryKey: ["staff-admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return (data || []).filter((u: any) => ["staff", "admin", "super_admin"].includes(u.role));
    },
    staleTime: 300000,
  });

  const { data: issuesData, refetch } = useQuery({ 
    queryKey: ["admin-issues", { statusFilter, category, stateCode, assignedToFilter, dateRange, page, pageSize, sortBy, sortOrder }], 
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (category) params.category = category;
      if (stateCode) params.state_code = stateCode;
      if (statusFilter.length === 1) params.status = statusFilter[0];
      
      const data = await listIssues(params);
      return data;
    }
  });
  
  const issues = useMemo(() => {
    if (!issuesData) return [];
    if (Array.isArray(issuesData)) return issuesData;
    return issuesData.items || [];
  }, [issuesData]);

  const filteredIssues = useMemo(() => {
    let filtered = [...issues];
    
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter((it: any) => 
        it.title?.toLowerCase().includes(s) || 
        it.description?.toLowerCase().includes(s) ||
        it.address?.toLowerCase().includes(s) ||
        String(it.id).includes(s)
      );
    }
    
    if (statusFilter.length > 0) {
      filtered = filtered.filter((it: any) => statusFilter.includes(it.status));
    }
    
    if (assignedToFilter) {
      if (assignedToFilter === "unassigned") {
        filtered = filtered.filter((it: any) => !it.assigned_to_id);
      } else if (assignedToFilter !== "any") {
        const userId = parseInt(assignedToFilter);
        filtered = filtered.filter((it: any) => it.assigned_to_id === userId);
      }
    }
    
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "7d") cutoff.setDate(now.getDate() - 7);
      else if (dateRange === "30d") cutoff.setDate(now.getDate() - 30);
      else if (dateRange === "90d") cutoff.setDate(now.getDate() - 90);
      
      filtered = filtered.filter((it: any) => {
        const created = new Date(it.created_at);
        return created >= cutoff;
      });
    }
    
    return filtered;
  }, [issues, search, statusFilter, assignedToFilter, dateRange]);

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
      } else if (sortBy === "updated_at") {
        aVal = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        bVal = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      } else if (sortBy === "type") {
        aVal = (a.category || "").toLowerCase();
        bVal = (b.category || "").toLowerCase();
      } else if (sortBy === "region") {
        aVal = (a.state_code || "").toLowerCase();
        bVal = (b.state_code || "").toLowerCase();
      } else if (sortBy === "assigned_to") {
        aVal = (a.assigned_to?.name || "").toLowerCase();
        bVal = (b.assigned_to?.name || "").toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    return sorted;
  }, [filteredIssues, sortBy, sortOrder]);

  const totalIssues = sortedIssues.length;
  const totalPages = Math.ceil(totalIssues / pageSize);
  const paginatedIssues = sortedIssues.slice((page - 1) * pageSize, page * pageSize);

  const canModifyIssue = (issue: any) => {
    if (!user) return false;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (user.role === "staff") {
      if (issue.assigned_to_id === user.id) return true;
      if (issue.state_code && user.id) {
        const userRegions = qc.getQueryData(["user-regions", user.id]) as any[];
        if (userRegions?.some((r: any) => r.state_code === issue.state_code)) return true;
      }
    }
    return false;
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "pending" | "in_progress" | "resolved" }) => 
      updateIssueStatus(id, status),
    onSuccess: () => {
      refetch();
      toast.show("Status updated");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed to update status"),
  });

  const assignMut = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) => 
      assignIssue(id, userId),
    onSuccess: () => {
      refetch();
      setReassignIssue(null);
      toast.show("Issue reassigned");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed to reassign"),
  });

  const handleStatusChange = (issue: any, newStatus: "pending" | "in_progress" | "resolved") => {
    if (!canModifyIssue(issue)) {
      toast.show("You don't have permission to modify this issue");
      return;
    }
    statusMut.mutate({ id: issue.id, status: newStatus });
  };

  const handleReassign = (issue: any, userId: number | null) => {
    if (!canModifyIssue(issue)) {
      toast.show("You don't have permission to modify this issue");
      return;
    }
    assignMut.mutate({ id: issue.id, userId });
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
    setPage(1);
  };

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Manage Issues</h2>
        <div className="text-sm text-gray-600">
          {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            placeholder="Search title, description, address, ID" 
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm"
          />
          <select 
            value={category} 
            onChange={(e) => { setCategory(e.target.value); setPage(1); }} 
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="">All Types</option>
            {typeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={stateCode} 
            onChange={(e) => { setStateCode(e.target.value); setPage(1); }} 
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="">All States</option>
            {(stateCodesData || []).map((sc: string) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>
          <select 
            value={assignedToFilter} 
            onChange={(e) => { setAssignedToFilter(e.target.value); setPage(1); }} 
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="any">Any Assignment</option>
            <option value="unassigned">Unassigned</option>
            {(staffAdminUsers || []).map((u: any) => (
              <option key={u.id} value={String(u.id)}>{u.name || u.email} ({u.role})</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {["pending", "in_progress", "resolved"].map((s) => (
              <label key={s} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes(s)}
                  onChange={() => toggleStatusFilter(s)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm capitalize">{s.replace("_", " ")}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-gradient-to-r from-indigo-50 to-white rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border-2 border-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="created_at">Created Date</option>
            <option value="updated_at">Last Updated</option>
            <option value="id">ID</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
            <option value="type">Type</option>
            <option value="region">Region</option>
            <option value="assigned_to">Assigned To</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-1.5 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">#</th>
              <th className="text-left p-3 font-semibold text-gray-700">Title</th>
              <th className="text-left p-3 font-semibold text-gray-700">Status</th>
              <th className="text-left p-3 font-semibold text-gray-700">Type</th>
              <th className="text-left p-3 font-semibold text-gray-700">Region</th>
              <th className="text-left p-3 font-semibold text-gray-700">Reporter</th>
              <th className="text-left p-3 font-semibold text-gray-700">Assigned To</th>
              <th className="text-left p-3 font-semibold text-gray-700">Created</th>
              <th className="text-left p-3 font-semibold text-gray-700">Updated</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedIssues.length > 0 ? paginatedIssues.map((it: any) => {
              const status = (it.status || "pending") as "pending" | "in_progress" | "resolved";
              const colors = getStatusColors(status);
              const canModify = canModifyIssue(it);
              
              return (
                <tr key={it.id} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                  <td className="p-3 font-mono text-indigo-600 font-bold">Issue #{it.id}</td>
                  <td className="p-3 max-w-[32ch]">
                    <button
                      onClick={() => setDetailIssueId(it.id)}
                      className="font-medium text-left hover:text-indigo-600 hover:underline truncate block"
                    >
                      {it.title}
                    </button>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}>
                      {status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="p-3">{it.category || "—"}</td>
                  <td className="p-3 font-mono text-sm">{it.state_code || "—"}</td>
                  <td className="p-3 text-xs">
                    {it.creator ? (
                      <div>
                        <div className="font-medium">{it.creator.name || "—"}</div>
                        <div className="text-gray-500">{it.creator.email}</div>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-xs">
                    {it.assigned_to ? (
                      <div>
                        <div className="font-medium">{it.assigned_to.name || "—"}</div>
                        <div className="text-gray-500">{it.assigned_to.role}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {it.created_at ? new Date(it.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {it.updated_at ? new Date(it.updated_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {canModify && it.status !== "in_progress" && (
                        <button 
                          className="px-2 py-1 rounded border-2 border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-xs font-medium transition-colors" 
                          onClick={() => handleStatusChange(it, "in_progress")}
                          title="Mark in progress"
                        >
                          ▶
                        </button>
                      )}
                      {canModify && it.status !== "resolved" && (
                        <button 
                          className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition-colors" 
                          onClick={() => handleStatusChange(it, "resolved")}
                          title="Mark resolved"
                        >
                          ✓
                        </button>
                      )}
                      {canModify && (
                        <button 
                          className="px-2 py-1 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors" 
                          onClick={() => setReassignIssue({ id: it.id, currentUserId: it.assigned_to_id || undefined })}
                          title="Reassign"
                        >
                          ↻
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  No issues found. {search && "Try adjusting your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalIssues > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalIssues}
          itemsPerPage={pageSize}
          showingFrom={((page - 1) * pageSize) + 1}
          showingTo={Math.min(page * pageSize, totalIssues)}
        />
      )}

      <Modal
        open={!!reassignIssue}
        onClose={() => setReassignIssue(null)}
        title="Reassign Issue"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to:
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              defaultValue={reassignIssue?.currentUserId ? String(reassignIssue.currentUserId) : "unassigned"}
              onChange={(e) => {
                const userId = e.target.value === "unassigned" ? null : parseInt(e.target.value);
                if (reassignIssue) {
                  handleReassign({ id: reassignIssue.id }, userId);
                }
              }}
            >
              <option value="unassigned">Unassigned</option>
              {(staffAdminUsers || []).map((u: any) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReassignIssue(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <IssueDetailModal
        open={!!detailIssueId}
        issueId={detailIssueId}
        onClose={() => {
          setDetailIssueId(null);
          refetch();
        }}
      />
    </div>
  );
}
