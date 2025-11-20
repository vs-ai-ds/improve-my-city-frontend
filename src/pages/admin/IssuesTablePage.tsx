import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignIssue, listIssues, updateIssueStatus, bulkIssueOperation, getIssueActivity } from "../../services/issues.api";
import { useState, useMemo, useEffect } from "react";
import { useIssueTypes } from "../../hooks/useIssueTypes";
import { api } from "../../services/apiClient";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../../components/toast/ToastProvider";
import { useSearchParams } from "react-router-dom";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import IssueDetailModal from "../../components/report/IssueDetailModal";
import Pagination from "../../components/ui/Pagination";
import { getStatusColors } from "../../constants/statusColors";
import { formatIssueAge, formatStalledTime, formatResolutionTime, isOverdue, exportToCSV } from "../../utils/issueUtils";

export default function IssuesTablePage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [search, setSearch] = useState("");
  const [detailIssueId, setDetailIssueId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState("all");
  const [quickFilter, setQuickFilter] = useState<string>("");
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [bulkActionModal, setBulkActionModal] = useState<{ operation: string; userId?: number | null } | null>(null);
  const [activityModalIssueId, setActivityModalIssueId] = useState<number | null>(null);
  
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const dateRangeParam = searchParams.get("dateRange");
    
    if (statusParam) {
      setStatusFilter([statusParam]);
    }
    if (dateRangeParam) {
      setDateRange(dateRangeParam);
    }
  }, [searchParams]);
  
  const [sortBy, setSortBy] = useState<"id" | "title" | "status" | "created_at" | "updated_at" | "type" | "region" | "assigned_to">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reassignIssue, setReassignIssue] = useState<{ id: number; currentUserId?: number } | null>(null);
  const [statusChangeModal, setStatusChangeModal] = useState<{ id: number; status: "in_progress" | "resolved"; comment: string } | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  
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
      if (dateRange && dateRange !== "all") {
        params.date_range = dateRange;
      }
      
      const data = await listIssues(params);
      return data;
    }
  });
  
  const issues = useMemo(() => {
    if (!issuesData) return [];
    if (Array.isArray(issuesData)) return issuesData;
    return issuesData.items || [];
  }, [issuesData]);

  const { data: activityData } = useQuery({
    queryKey: ["issue-activity", activityModalIssueId],
    queryFn: () => getIssueActivity(activityModalIssueId!),
    enabled: !!activityModalIssueId,
  });

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

    if (quickFilter === "unassigned") {
      filtered = filtered.filter((it: any) => !it.assigned_to_id);
    } else if (quickFilter === "assigned_to_me" && user) {
      filtered = filtered.filter((it: any) => it.assigned_to_id === user.id);
    } else if (quickFilter === "overdue") {
      filtered = filtered.filter((it: any) => it.status !== "resolved" && isOverdue(it.created_at, 48));
    } else if (quickFilter === "needs_attention") {
      filtered = filtered.filter((it: any) => {
        if (it.status === "resolved") return false;
        const stalled = formatStalledTime(it.updated_at, it.created_at);
        return stalled.includes("Stalled");
      });
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
  }, [issues, search, statusFilter, assignedToFilter, dateRange, quickFilter, user]);

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
    mutationFn: ({ id, status, comment }: { id: number; status: "pending" | "in_progress" | "resolved"; comment?: string }) => 
      updateIssueStatus(id, status, comment),
    onSuccess: () => {
      refetch();
      setStatusChangeModal(null);
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

  const bulkMut = useMutation({
    mutationFn: (payload: { issue_ids: number[]; operation: string; user_id?: number | null; status?: string }) =>
      bulkIssueOperation(payload),
    onSuccess: (data) => {
      refetch();
      setSelectedIssues(new Set());
      setBulkActionModal(null);
      toast.show(`Bulk operation completed: ${data.updated_count} issue(s) updated`);
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed to perform bulk operation"),
  });

  const handleStatusChange = (issue: any, newStatus: "in_progress" | "resolved") => {
    if (!canModifyIssue(issue)) {
      toast.show("You don't have permission to modify this issue");
      return;
    }
    if (newStatus === "in_progress" && !issue.assigned_to_id) {
      toast.show("Issue must be assigned before marking as in progress");
      return;
    }
    setStatusChangeModal({ id: issue.id, status: newStatus, comment: "" });
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

  const toggleIssueSelection = (issueId: number) => {
    setSelectedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIssues.size === paginatedIssues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(paginatedIssues.map((it: any) => it.id)));
    }
  };

  const handleBulkAction = (operation: string) => {
    if (selectedIssues.size === 0) {
      toast.show("Please select at least one issue");
      return;
    }
    if (operation === "assign") {
      setBulkActionModal({ operation: "assign", userId: null });
    } else if (operation === "status") {
      setBulkActionModal({ operation: "status" });
    } else if (operation === "delete") {
      if (confirm(`Are you sure you want to delete ${selectedIssues.size} issue(s)? This action cannot be undone.`)) {
        bulkMut.mutate({ issue_ids: Array.from(selectedIssues), operation: "delete" });
      }
    } else if (operation === "export") {
      const selected = sortedIssues.filter((it: any) => selectedIssues.has(it.id));
      exportToCSV(selected.map((it: any) => ({
        id: it.id,
        title: it.title,
        status: it.status,
        category: it.category,
        state_code: it.state_code,
        created_at: it.created_at,
        updated_at: it.updated_at,
        assigned_to: it.assigned_to?.name || "Unassigned",
        creator: it.creator?.name || "Anonymous"
      })), `issues-export-${new Date().toISOString().split('T')[0]}.csv`);
      toast.show("Export started");
    }
  };

  const handleBulkAssign = (userId: number | null) => {
    bulkMut.mutate({ issue_ids: Array.from(selectedIssues), operation: "assign", user_id: userId });
  };

  const handleBulkStatus = (status: string) => {
    bulkMut.mutate({ issue_ids: Array.from(selectedIssues), operation: "status", status });
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setQuickFilter(quickFilter === "unassigned" ? "" : "unassigned"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              quickFilter === "unassigned" 
                ? "bg-indigo-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Unassigned
          </button>
          {user && (
            <button
              onClick={() => { setQuickFilter(quickFilter === "assigned_to_me" ? "" : "assigned_to_me"); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                quickFilter === "assigned_to_me" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Assigned to me
            </button>
          )}
          <button
            onClick={() => { setQuickFilter(quickFilter === "overdue" ? "" : "overdue"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              quickFilter === "overdue" 
                ? "bg-red-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => { setQuickFilter(quickFilter === "needs_attention" ? "" : "needs_attention"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              quickFilter === "needs_attention" 
                ? "bg-amber-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Needs attention
          </button>
        </div>

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

      {selectedIssues.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm font-medium text-indigo-900">
            {selectedIssues.size} issue{selectedIssues.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("assign")}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Assign
            </button>
            <button
              onClick={() => handleBulkAction("status")}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Change Status
            </button>
            <button
              onClick={() => handleBulkAction("export")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Export CSV
            </button>
            {user && ["admin", "super_admin"].includes(user.role) && (
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => setSelectedIssues(new Set())}
              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
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
          <button
            onClick={() => exportToCSV(sortedIssues.map((it: any) => ({
              id: it.id,
              title: it.title,
              status: it.status,
              category: it.category,
              state_code: it.state_code,
              created_at: it.created_at,
              updated_at: it.updated_at,
              assigned_to: it.assigned_to?.name || "Unassigned",
              creator: it.creator?.name || "Anonymous"
            })), `all-issues-export-${new Date().toISOString().split('T')[0]}.csv`)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Export All CSV
          </button>
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
              <th className="text-left p-3 font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedIssues.size === paginatedIssues.length && paginatedIssues.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left p-3 font-semibold text-gray-700">#</th>
              <th className="text-left p-3 font-semibold text-gray-700">Title</th>
              <th className="text-left p-3 font-semibold text-gray-700">Status</th>
              <th className="text-left p-3 font-semibold text-gray-700">Type</th>
              <th className="text-left p-3 font-semibold text-gray-700">Region</th>
              <th className="text-left p-3 font-semibold text-gray-700">Age</th>
              <th className="text-left p-3 font-semibold text-gray-700">Assigned To</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedIssues.length > 0 ? paginatedIssues.map((it: any) => {
              const status = (it.status || "pending") as "pending" | "in_progress" | "resolved";
              const colors = getStatusColors(status);
              const canModify = canModifyIssue(it);
              const age = formatIssueAge(it.created_at, it.updated_at);
              const stalled = formatStalledTime(it.updated_at, it.created_at);
              const resolutionTime = it.status === "resolved" && it.resolved_at 
                ? formatResolutionTime(it.created_at, it.resolved_at) 
                : null;
              const overdue = it.status !== "resolved" && isOverdue(it.created_at, 48);
              
              return (
                <tr key={it.id} className={`odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors ${overdue ? "bg-red-50" : ""}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIssues.has(it.id)}
                      onChange={() => toggleIssueSelection(it.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="p-3 font-mono text-indigo-600 font-bold">#{it.id}</td>
                  <td className="p-3 max-w-[32ch]">
                    <button
                      onClick={() => setDetailIssueId(it.id)}
                      className="font-medium text-left hover:text-indigo-600 hover:underline truncate block"
                    >
                      {it.title}
                    </button>
                    {stalled && (
                      <div className="text-xs text-amber-600 font-medium mt-1">{stalled}</div>
                    )}
                    {resolutionTime && (
                      <div className="text-xs text-emerald-600 font-medium mt-1">{resolutionTime}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}>
                      {status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="p-3">{it.category || "—"}</td>
                  <td className="p-3 font-mono text-sm">{it.state_code || "—"}</td>
                  <td className="p-3 text-xs">
                    <div className="text-gray-600">{age}</div>
                    {overdue && (
                      <div className="text-red-600 font-medium mt-1">Overdue</div>
                    )}
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
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivityModalIssueId(it.id)}
                        className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                        title="View activity timeline"
                      >
                        Timeline
                      </button>
                      {canModify && (
                        <div className="relative inline-block">
                          <select
                            className="rounded-lg border-2 border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value=""
                            onChange={(e) => {
                              const action = e.target.value;
                              if (action === "assign") {
                                setReassignIssue({ id: it.id, currentUserId: it.assigned_to_id || undefined });
                              } else if (action === "in_progress") {
                                handleStatusChange(it, "in_progress");
                              } else if (action === "resolved") {
                                handleStatusChange(it, "resolved");
                              }
                              e.target.value = "";
                            }}
                          >
                            <option value="">Actions...</option>
                            {!it.assigned_to_id && <option value="assign">Assign</option>}
                            {it.assigned_to_id && it.status === "pending" && <option value="in_progress">Mark In Progress</option>}
                            {it.assigned_to_id && it.status === "in_progress" && <option value="resolved">Mark Resolved</option>}
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
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
        onClose={() => {
          setReassignIssue(null);
          setAssignSearch("");
        }}
        title="Assign Issue"
      >
        <div className="space-y-4 p-4">
          {reassignIssue?.currentUserId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Currently assigned to:</strong> {
                (staffAdminUsers || []).find((u: any) => u.id === reassignIssue?.currentUserId)?.name || 
                (staffAdminUsers || []).find((u: any) => u.id === reassignIssue?.currentUserId)?.email || 
                "Unknown"
              }
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to:
            </label>
            <Input
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="mb-2"
            />
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-60 overflow-y-auto"
              size={Math.min((staffAdminUsers || []).length + 1, 8)}
              onChange={(e) => {
                const userId = e.target.value === "unassigned" ? null : parseInt(e.target.value);
                if (reassignIssue) {
                  handleReassign({ id: reassignIssue.id }, userId);
                  setAssignSearch("");
                }
              }}
            >
              <option value="unassigned">Unassigned</option>
              {(staffAdminUsers || []).filter((u: any) => {
                if (!assignSearch) return true;
                const searchLower = assignSearch.toLowerCase();
                return (u.name || "").toLowerCase().includes(searchLower) || 
                       (u.email || "").toLowerCase().includes(searchLower) ||
                       (u.role || "").toLowerCase().includes(searchLower);
              }).map((u: any) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setReassignIssue(null);
              setAssignSearch("");
            }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!statusChangeModal}
        onClose={() => setStatusChangeModal(null)}
        title={statusChangeModal?.status === "in_progress" ? "Mark as In Progress" : "Resolve Issue"}
      >
        <div className="space-y-4 p-4">
          <p className="text-sm text-gray-700">
            {statusChangeModal?.status === "in_progress"
              ? "Add a comment explaining what you're working on:"
              : "Add a comment explaining how this issue was resolved:"}
          </p>
          <textarea
            value={statusChangeModal?.comment || ""}
            onChange={(e) => setStatusChangeModal(statusChangeModal ? { ...statusChangeModal, comment: e.target.value } : null)}
            placeholder="Enter your comment..."
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:bg-white shadow-sm resize-y"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setStatusChangeModal(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!statusChangeModal?.comment?.trim() || statusMut.isPending}
              onClick={() => {
                if (statusChangeModal) {
                  statusMut.mutate({ 
                    id: statusChangeModal.id, 
                    status: statusChangeModal.status, 
                    comment: statusChangeModal.comment 
                  });
                }
              }}
            >
              {statusMut.isPending ? "Updating…" : statusChangeModal?.status === "in_progress" ? "Mark In Progress" : "Resolve"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!bulkActionModal}
        onClose={() => setBulkActionModal(null)}
        title={bulkActionModal?.operation === "assign" ? "Bulk Assign" : "Bulk Change Status"}
      >
        <div className="space-y-4 p-4">
          {bulkActionModal?.operation === "assign" ? (
            <>
              <p className="text-sm text-gray-700">Assign {selectedIssues.size} issue(s) to:</p>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onChange={(e) => {
                  const userId = e.target.value === "unassigned" ? null : parseInt(e.target.value);
                  handleBulkAssign(userId);
                }}
              >
                <option value="">Select user...</option>
                <option value="unassigned">Unassigned</option>
                {(staffAdminUsers || []).map((u: any) => (
                  <option key={u.id} value={String(u.id)}>{u.name || u.email} ({u.role})</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">Change status of {selectedIssues.size} issue(s) to:</p>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatus(e.target.value);
                  }
                }}
              >
                <option value="">Select status...</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkActionModal(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!activityModalIssueId}
        onClose={() => setActivityModalIssueId(null)}
        title="Activity Timeline"
      >
        <div className="space-y-4 p-4 max-h-96 overflow-y-auto">
          {activityData && Array.isArray(activityData) && activityData.length > 0 ? (
            <div className="space-y-3">
              {activityData.map((activity: any, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {activity.kind === "created" && "Issue created"}
                      {activity.kind === "assigned" && `Assigned to ${activity.user || "someone"}`}
                      {activity.kind === "in_progress" && "Marked as In Progress"}
                      {activity.kind === "resolved" && "Resolved"}
                      {activity.kind === "comment" && `Comment by ${activity.user || "someone"}`}
                    </div>
                    {activity.comment && (
                      <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">{activity.comment}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {activity.at ? new Date(activity.at).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No activity recorded yet</div>
          )}
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
