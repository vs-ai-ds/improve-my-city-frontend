// src/pages/admin/IssuesTablePage.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignIssue, listIssues, updateIssueStatus, getIssueActivity } from "../../services/issues.api";
import { useState, useMemo, useEffect } from "react";
import { useIssueTypes } from "../../hooks/useIssueTypes";
import { api } from "../../services/apiClient";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../../components/toast/ToastProvider";
import { useSearchParams } from "react-router-dom";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
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
  const [searchDebounced, setSearchDebounced] = useState("");
  const [detailIssueId, setDetailIssueId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>(["pending", "in_progress", "resolved"]);
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState("all");
  const [quickFilter, setQuickFilter] = useState<string>("");
  const [activityModalIssueId, setActivityModalIssueId] = useState<number | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const dateRangeParam = searchParams.get("dateRange");

    if (statusParam) {
      setStatusFilter([statusParam]);
    } else {
      setStatusFilter(["pending", "in_progress", "resolved"]);
    }
    if (dateRangeParam) {
      setDateRange(dateRangeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 1000);
    return () => clearTimeout(timer);
  }, [search]);

  const [sortBy, setSortBy] = useState<
    "id" | "title" | "status" | "created_at" | "updated_at" | "type" | "region" | "assigned_to"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reassignIssue, setReassignIssue] = useState<{
    id: number;
    currentUserId?: number;
    title?: string;
    category?: string;
    state_code?: string;
  } | null>(null);
  const [statusChangeModal, setStatusChangeModal] = useState<{
    id: number;
    status: "in_progress" | "resolved";
    comment: string;
  } | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedAssignUserId, setSelectedAssignUserId] = useState<string>("");

  const { data: types } = useIssueTypes();
  const typeOptions = useMemo(
    () => (Array.isArray(types) ? types.map((t: any) => t.name).filter(Boolean) : []),
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
    refetchOnWindowFocus: false,
  });

  const {
    data: issuesData,
    refetch,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "admin-issues",
      { statusFilter, category, stateCode, quickFilter, assignedToFilter, dateRange, searchDebounced, page, pageSize },
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };

      if (category && category !== "all") params.category = category;
      if (stateCode && stateCode !== "all") params.state_code = stateCode;
      if (quickFilter === "assigned_to_me" && user) {
        params.assigned_to_id = user.id;
      } else if (quickFilter) {
        params.quickFilter = quickFilter;
      }

      if (statusFilter.length === 1) {
        params.status = statusFilter[0];
      } else if (statusFilter.length > 1 && statusFilter.length < 3) {
        params.statuses = statusFilter.join(",");
      }

      if (dateRange && dateRange !== "all") {
        params.date_range = dateRange;
      }

      if (searchDebounced.trim()) {
        params.search = searchDebounced.trim();
      }

      if (assignedToFilter && assignedToFilter !== "any") {
        if (assignedToFilter === "unassigned") {
          params.assigned_to_id = 0;
        } else {
          const userId = parseInt(assignedToFilter);
          if (!isNaN(userId)) {
            params.assigned_to_id = userId;
          }
        }
      }

      const data = await listIssues(params);
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const issues = useMemo(() => {
    if (!issuesData) return [];
    if (Array.isArray(issuesData)) return issuesData;
    return issuesData.items || [];
  }, [issuesData]);

  const filteredIssues = useMemo(() => issues, [issues]);

  const totalIssues = issuesData?.total || 0;
  const totalPages = Math.ceil(totalIssues / pageSize);

  const { data: activityData } = useQuery({
    queryKey: ["issue-activity", activityModalIssueId],
    queryFn: () => getIssueActivity(activityModalIssueId!),
    enabled: !!activityModalIssueId,
  });

  const sortedIssues = useMemo(() => {
    const sorted = [...filteredIssues];
    sorted.sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;
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
        aVal = a.updated_at ? new Date(a.updated_at).getTime() : a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.updated_at ? new Date(b.updated_at).getTime() : b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sortBy === "type") {
        aVal = (a.category || "").toLowerCase();
        bVal = (b.category || "").toLowerCase();
      } else if (sortBy === "region") {
        aVal = (a.state_code || "").toLowerCase();
        bVal = (b.state_code || "").toLowerCase();
      } else if (sortBy === "assigned_to") {
        aVal = (a.assigned_to?.name || a.assigned_to?.email || "").toLowerCase();
        bVal = (b.assigned_to?.name || b.assigned_to?.email || "").toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    return sorted;
  }, [filteredIssues, sortBy, sortOrder]);

  const paginatedIssues = sortedIssues;
  
  const canModifyIssue = (issue: any) => {
    if (!user) return false;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (user.role === "staff") {
      if (issue.assigned_to_id === user.id) return true;
    }
    return false;
  };

  const statusMut = useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: number;
      status: "pending" | "in_progress" | "resolved";
      comment?: string;
    }) => updateIssueStatus(id, status, comment),
    onSuccess: () => {
      refetch();
      setStatusChangeModal(null);
      toast.show("Status updated");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed to update status"),
  });

  const assignMut = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) => assignIssue(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-issues"] });
      refetch();
      setReassignIssue(null);
      setSelectedAssignUserId("");
      setAssignSearch("");
      toast.show("Issue reassigned");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed to reassign"),
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
    setStatusFilter((prev) => {
      const newFilter = prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status];
      return newFilter;
    });
    setPage(1);
  };

  const toggleQuickFilter = (value: string) => {
    setQuickFilter((prev) => (prev === value ? "" : value));
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

      {/* Filters */}
      <div className="space-y-3">
        {/* Top filter row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
              }
            }}
            placeholder="Search title, description, address, ID"
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="">All Types</option>
            {typeOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={stateCode}
            onChange={(e) => {
              setStateCode(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="">All States</option>
            {(stateCodesData || []).map((sc: string) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
          <select
            value={assignedToFilter}
            onChange={(e) => {
              setAssignedToFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
          >
            <option value="any">Any Assignment</option>
            <option value="unassigned">Unassigned</option>
            {(staffAdminUsers || []).map((u: any) => (
              <option key={u.id} value={String(u.id)}>
                {u.name || u.email} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Second filter row: status + quick filters + date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status checkboxes */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Status:</span>
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

            {/* Quick filters */}
            <div className="flex items-center gap-2">
              {user && (
                <button
                  onClick={() => toggleQuickFilter("assigned_to_me")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    quickFilter === "assigned_to_me"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  Assigned to me
                </button>
              )}
              <button
                onClick={() => toggleQuickFilter("overdue")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  quickFilter === "overdue"
                    ? "bg-red-600 border-red-600 text-white shadow-sm"
                    : "bg-red-50 border-red-100 text-red-700 hover:bg-red-100"
                }`}
              >
                Overdue
              </button>
              <button
                onClick={() => toggleQuickFilter("needs_attention")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  quickFilter === "needs_attention"
                    ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                    : "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Needs attention
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
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

      {/* Sort + export bar */}
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
            <option value="id">Issue #</option>
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
          <span className="text-sm font-semibold text-gray-700">Total Issues:</span>
          <span className="text-sm font-bold text-indigo-600">{totalIssues}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              toast.show("Exporting all filtered issues...");
              try {
                const exportParams: Record<string, any> = { limit: 1000, offset: 0 };
                if (category && category !== "all") exportParams.category = category;
                if (stateCode && stateCode !== "all") exportParams.state_code = stateCode;
                if (quickFilter === "assigned_to_me" && user) {
                  exportParams.assigned_to_id = user.id;
                } else if (quickFilter) {
                  exportParams.quickFilter = quickFilter;
                }

                if (statusFilter.length === 1) {
                  exportParams.status = statusFilter[0];
                } else if (statusFilter.length > 1 && statusFilter.length < 3) {
                  exportParams.statuses = statusFilter.join(",");
                }

                if (dateRange && dateRange !== "all") {
                  exportParams.date_range = dateRange;
                }

                if (assignedToFilter && assignedToFilter !== "any") {
                  if (assignedToFilter === "unassigned") {
                    exportParams.assigned_to_id = 0;
                  } else {
                    const userId = parseInt(assignedToFilter);
                    if (!isNaN(userId)) {
                      exportParams.assigned_to_id = userId;
                    }
                  }
                }

                if (searchDebounced.trim()) {
                  exportParams.search = searchDebounced.trim();
                }

                let allIssues: any[] = [];
                let offset = 0;
                const batchSize = 1000;

                while (true) {
                  exportParams.offset = offset;
                  exportParams.limit = batchSize;
                  const batchData = await listIssues(exportParams);
                  const batch = Array.isArray(batchData) ? batchData : batchData?.items || [];
                  if (batch.length === 0) break;
                  allIssues = [...allIssues, ...batch];
                  if (batch.length < batchSize) break;
                  offset += batchSize;
                }

                const filtered = allIssues.filter((it: any) => {
                  if (quickFilter === "assigned_to_me" && user) {
                    if (it.assigned_to_id !== user.id) return false;
                  } else if (quickFilter === "overdue") {
                    if (it.status === "resolved" || !isOverdue(it.created_at, 48)) return false;
                  } else if (quickFilter === "needs_attention") {
                    if (it.status === "resolved") return false;
                    const stalled = formatStalledTime(it.updated_at, it.created_at);
                    if (!stalled.includes("Stalled")) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  toast.show("No issues to export");
                  return;
                }

                exportToCSV(
                  filtered.map((it: any) => ({
                    id: it.id,
                    title: it.title || "",
                    description: it.description || "",
                    status: it.status || "",
                    category: it.category || "",
                    state_code: it.state_code || "",
                    address: it.address || "",
                    created_at: it.created_at ? new Date(it.created_at).toISOString() : "",
                    updated_at: it.updated_at ? new Date(it.updated_at).toISOString() : "",
                    assigned_to: it.assigned_to?.name || it.assigned_to?.email || "Unassigned",
                    assigned_to_email: it.assigned_to?.email || "",
                    assigned_to_role: it.assigned_to?.role || "",
                    creator: it.creator?.name || it.creator?.email || "Anonymous",
                    creator_email: it.creator?.email || "",
                    photos_count: (it.photos || []).length,
                  })),
                  `all-issues-export-${new Date().toISOString().split("T")[0]}.csv`
                );
                toast.show(`Exported ${filtered.length} issues`);
              } catch (e: any) {
                toast.show(e?.response?.data?.detail || "Export failed");
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Export All CSV
          </button>
          <span className="text-sm text-gray-700">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading && <div className="p-8 text-center text-gray-500">Loading issues...</div>}
      {isError && (
        <div className="p-8 text-center text-red-500">
          Error loading issues: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}
      {!isLoading && !isError && (
        <div className="overflow-x-auto border rounded-2xl">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700 w-24">Issue #</th>
                <th className="text-left p-3 font-semibold text-gray-700 w-[30%]">
                  Title
                </th>
                <th className="text-left p-3 font-semibold text-gray-700 w-40">
                  Type
                </th>
                <th className="text-left p-3 font-semibold text-gray-700 w-40">
                  Region
                </th>
                 <th className="text-left p-3 font-semibold text-gray-700 w-32">
                   Recent Update
                 </th>
                <th className="text-left p-3 font-semibold text-gray-700 w-44">
                  Assigned To
                </th>
                <th className="text-center p-3 font-semibold text-gray-700 w-56">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedIssues.length > 0 ? (
                paginatedIssues.map((it: any) => {
                  const status = (it.status || "pending") as
                    | "pending"
                    | "in_progress"
                    | "resolved";
                  const colors = getStatusColors(status);
                  const canModify = canModifyIssue(it);
                  const stalled = formatStalledTime(it.updated_at, it.created_at);
                  const resolutionTime =
                    it.status === "resolved" && it.resolved_at
                      ? formatResolutionTime(it.created_at, it.resolved_at)
                      : null;
                  const overdue =
                    it.status !== "resolved" && isOverdue(it.created_at, 48);

                  const statusLabel = status
                    .replace("_", " ")
                    .replace(/\b\w/g, (l: string) => l.toUpperCase());

                  return (
                    <tr
                      key={it.id}
                      className={`transition-colors ${
                        overdue
                          ? "bg-red-50 hover:bg-red-100"
                          : "odd:bg-white even:bg-gray-50 hover:bg-indigo-50"
                      }`}
                    >
                      <td className="p-3 font-mono text-indigo-700 font-bold align-top">
                        #{it.id}
                      </td>

                      {/* Title + status + badges */}
                      <td className="p-3 align-top">
                        <button
                          onClick={() => setDetailIssueId(it.id)}
                          className="font-semibold text-left text-[0.95rem] md:text-base text-gray-900 hover:text-indigo-600 hover:underline break-words line-clamp-2 block"
                          title={it.title}
                        >
                          {it.title && it.title.length > 80
                            ? `${it.title.substring(0, 80)}...`
                            : it.title}
                        </button>
                        
                        {it.created_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Created: {new Date(it.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            })}
                          </div>
                        )}

                        {stalled && (
                          <div className="text-xs text-amber-600 font-medium mt-1">
                            {stalled}
                          </div>
                        )}

                        {/* Status / resolution line, using existing color pattern */}
                        {resolutionTime ? (
                          <div className="text-xs text-emerald-600 font-medium mt-1">
                            {resolutionTime}
                          </div>
                        ) : (
                          <div className="mt-1 inline-flex items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colors.badge}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="p-3 align-top text-sm text-gray-800">
                        {it.category || "—"}
                      </td>

                      {/* Region */}
                      <td className="p-3 align-top text-sm text-gray-800">
                        {it.state_code ? (
                          <span
                            className="font-mono text-xs max-w-[10rem] block break-words"
                            title={it.state_code}
                          >
                            {it.state_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Recent Update */}
                      <td className="p-3 align-top text-xs">
                        <div className="text-gray-700">
                          {it.updated_at ? formatIssueAge(it.updated_at) : formatIssueAge(it.created_at)}
                        </div>
                        {overdue && (
                          <div className="text-red-600 font-medium mt-1">Overdue</div>
                        )}
                      </td>

                      {/* Assigned To */}
                      <td className="p-3 align-top text-xs">
                        {it.assigned_to ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {it.assigned_to.name || it.assigned_to.email || "—"}
                            </div>
                            <div className="text-gray-500 text-[11px]">
                              {it.assigned_to.role || "—"}
                            </div>
                          </div>
                        ) : it.assigned_to_id ? (
                          <span className="text-gray-400 italic">Loading...</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 align-top">
                        <div className="flex flex-col items-center gap-2">
                          {/* First row: Timeline + Assign/Reassign */}
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => setActivityModalIssueId(it.id)}
                              className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                              title="View activity timeline"
                            >
                              Timeline
                            </button>

                            {canModify && (
                              <button
                                onClick={() =>
                                  setReassignIssue({
                                    id: it.id,
                                    currentUserId: it.assigned_to_id || undefined,
                                    title: it.title,
                                    category: it.category,
                                    state_code: it.state_code,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                                title={
                                  it.assigned_to_id ? "Reassign issue" : "Assign issue"
                                }
                              >
                                {it.assigned_to_id ? "Reassign" : "Assign"}
                              </button>
                            )}
                          </div>

                          {/* Second row: Status buttons */}
                          {canModify && it.assigned_to_id && it.status !== "resolved" && (
                            <div className="flex flex-wrap justify-center gap-2">
                              {it.status === "pending" && (
                                <button
                                  onClick={() => handleStatusChange(it, "in_progress")}
                                  className="px-2 py-1 rounded-lg border border-indigo-300 bg-indigo-50 text-[11px] text-indigo-700 hover:bg-indigo-100"
                                >
                                  In Progress
                                </button>
                              )}
                              {it.status === "in_progress" && (
                                <button
                                  onClick={() => handleStatusChange(it, "resolved")}
                                  className="px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-100"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No issues found. {search && "Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalIssues}
          itemsPerPage={pageSize}
          showingFrom={(page - 1) * pageSize + 1}
          showingTo={Math.min(page * pageSize, totalIssues)}
        />
      )}

      {/* Assign / Reassign modal */}
      <Modal
        open={!!reassignIssue}
        onClose={() => {
          setReassignIssue(null);
          setAssignSearch("");
          setSelectedAssignUserId("");
        }}
        title="Assign Issue"
      >
        <div className="space-y-4 p-4">
          {reassignIssue && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Issue #:</span>
                <span className="text-gray-900">{reassignIssue.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Title:</span>
                <span className="text-gray-900">{reassignIssue.title || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Category:</span>
                <span className="text-gray-900">{reassignIssue.category || "—"}</span>
              </div>
              {reassignIssue.state_code && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Region:</span>
                  <span className="text-gray-900">{reassignIssue.state_code}</span>
                </div>
              )}
            </div>
          )}

          {reassignIssue?.currentUserId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Currently assigned to:</strong>{" "}
              {(() => {
                const u = (staffAdminUsers || []).find((u: any) => u.id === reassignIssue?.currentUserId);
                return u?.name || u?.email || "Unknown";
              })()}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign to:</label>
            <div className="relative">
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
                <div className="p-2 sticky top-0 bg-white border-b border-gray-200 z-10">
                  <input
                    type="text"
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="py-1">
                  {(staffAdminUsers || [])
                    .filter((u: any) => {
                      if (!assignSearch.trim()) return true;
                      const searchLower = assignSearch.toLowerCase();
                      return (
                        (u.name || "").toLowerCase().includes(searchLower) ||
                        (u.email || "").toLowerCase().includes(searchLower) ||
                        (u.role || "").toLowerCase().includes(searchLower)
                      );
                    })
                    .map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssignUserId(String(u.id));
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          selectedAssignUserId === String(u.id) ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        <div className="font-medium">{u.name || u.email}</div>
                        <div className="text-xs text-gray-500">{u.role}</div>
                      </button>
                    ))}
                  {assignSearch.trim() && (staffAdminUsers || []).filter((u: any) => {
                    const searchLower = assignSearch.toLowerCase();
                    return (
                      (u.name || "").toLowerCase().includes(searchLower) ||
                      (u.email || "").toLowerCase().includes(searchLower) ||
                      (u.role || "").toLowerCase().includes(searchLower)
                    );
                  }).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                  )}
                </div>
              </div>
            </div>
            {selectedAssignUserId && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {
                  (staffAdminUsers || []).find((u: any) => String(u.id) === selectedAssignUserId)?.name || 
                  (staffAdminUsers || []).find((u: any) => String(u.id) === selectedAssignUserId)?.email || 
                  "Unknown"
                }
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setReassignIssue(null);
                setAssignSearch("");
                setSelectedAssignUserId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAssignUserId && reassignIssue) {
                  const userId = parseInt(selectedAssignUserId);
                  handleReassign({ id: reassignIssue.id }, userId);
                }
              }}
              disabled={!selectedAssignUserId || !reassignIssue}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status change modal */}
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
            onChange={(e) =>
              setStatusChangeModal(
                statusChangeModal ? { ...statusChangeModal, comment: e.target.value } : null
              )
            }
            placeholder="Enter your comment..."
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:bg-white shadow-sm resize-y"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setStatusChangeModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={!statusChangeModal?.comment?.trim() || statusMut.isPending}
              onClick={() => {
                if (statusChangeModal) {
                  statusMut.mutate({
                    id: statusChangeModal.id,
                    status: statusChangeModal.status,
                    comment: statusChangeModal.comment,
                  });
                }
              }}
            >
              {statusMut.isPending
                ? "Updating…"
                : statusChangeModal?.status === "in_progress"
                ? "Mark In Progress"
                : "Resolve"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Activity timeline modal */}
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
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {activity.kind === "created" && "Issue created"}
                      {activity.kind === "assigned" && `Assigned to ${activity.user || "someone"}`}
                      {activity.kind === "in_progress" && "Marked as In Progress"}
                      {activity.kind === "resolved" && "Resolved"}
                      {activity.kind === "comment" && `Comment by ${activity.user || "someone"}`}
                    </div>
                    {activity.comment && (
                      <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                        {activity.comment}
                      </div>
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