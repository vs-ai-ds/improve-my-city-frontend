import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { listUsers, createUser, updateUser, deleteUser, triggerPasswordReset, getUserStats, bulkUserOperation } from "../../services/admin.users.api";
import { exportToCSV } from "../../utils/issueUtils";
import { api } from "../../services/apiClient";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../../components/toast/ToastProvider";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Pagination from "../../components/ui/Pagination";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("citizen");
  const [regionsModal, setRegionsModal] = useState<{ userId: number; userName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [profileModalId, setProfileModalId] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"created_at" | "last_login" | "name" | "email">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, statusFilter, verifiedFilter],
    queryFn: () => listUsers({
      q: search || undefined,
      role: roleFilter || undefined,
      is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
      is_verified: verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined,
    }),
  });

  const { data: stateCodesData } = useQuery({
    queryKey: ["state-codes"],
    queryFn: async () => {
      const { data } = await api.get("/issues/stats/by-state", { params: { range: "all" } });
      return (data || []).map((d: any) => d.state_code).filter(Boolean);
    },
    staleTime: 300000,
  });

  const users = useMemo(() => {
    if (!usersData) return [];
    return Array.isArray(usersData) ? usersData : [];
  }, [usersData]);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    
    if (sortBy === "created_at") {
      filtered.sort((a: any, b: any) => {
        const aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });
    } else if (sortBy === "last_login") {
      filtered.sort((a: any, b: any) => {
        const aVal = a.last_login ? new Date(a.last_login).getTime() : 0;
        const bVal = b.last_login ? new Date(b.last_login).getTime() : 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });
    } else if (sortBy === "name") {
      filtered.sort((a: any, b: any) => {
        const aVal = (a.name || "").toLowerCase();
        const bVal = (b.name || "").toLowerCase();
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else if (sortBy === "email") {
      filtered.sort((a: any, b: any) => {
        const aVal = (a.email || "").toLowerCase();
        const bVal = (b.email || "").toLowerCase();
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    
    return filtered;
  }, [users, sortBy, sortOrder]);

  const [activeTab, setActiveTab] = useState<"staff" | "citizens">("staff");
  
  const staffAndAdmins = useMemo(() => filteredUsers.filter((u: any) => ["staff", "admin", "super_admin"].includes(u.role)), [filteredUsers]);
  const citizens = useMemo(() => filteredUsers.filter((u: any) => u.role === "citizen"), [filteredUsers]);
  const activeUsers = activeTab === "staff" ? staffAndAdmins : citizens;
  const totalPages = Math.ceil(activeUsers.length / pageSize);

  const { data: userRegions } = useQuery({
    queryKey: ["user-regions", regionsModal?.userId],
    queryFn: async () => {
      if (!regionsModal?.userId) return [];
      const { data } = await api.get(`/admin/regions/${regionsModal.userId}`);
      return data || [];
    },
    enabled: !!regionsModal,
  });

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", profileModalId],
    queryFn: () => getUserStats(profileModalId!),
    enabled: !!profileModalId,
  });

  const mutCreate = useMutation({
    mutationFn: () => createUser({ name: name.trim(), email: email.trim().toLowerCase(), role }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setRole("citizen");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.show("User created successfully");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Create failed"),
  });

  const mutUpdate = useMutation({
    mutationFn: (p: { id: number; body: any }) => updateUser(p.id, p.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.show("User updated");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Update failed"),
  });

  const mutDelete = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteConfirm(null);
      toast.show("User deleted");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Delete failed"),
  });

  const toggleActive = (u: any) => {
    mutUpdate.mutate({ id: u.id, body: { is_active: !u.is_active } });
  };

  const handleRoleChange = (u: any, newRole: string) => {
    if (currentUser?.role !== "super_admin" && ["admin", "super_admin"].includes(newRole)) {
      toast.show("Only super admins can promote to admin/super_admin");
      return;
    }
    if (u.role === "super_admin" && currentUser?.role !== "super_admin") {
      toast.show("Only super admins can modify super admin roles");
      return;
    }
    mutUpdate.mutate({ id: u.id, body: { role: newRole } });
  };

  const addRegion = async (stateCode: string) => {
    if (!regionsModal) return;
    try {
      await api.post(`/admin/regions/${regionsModal.userId}`, { state_code: stateCode });
      qc.invalidateQueries({ queryKey: ["user-regions", regionsModal.userId] });
      toast.show("Region added");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Failed to add region");
    }
  };

  const removeRegion = async (regionId: number) => {
    try {
      await api.delete(`/admin/regions/${regionId}`);
      if (regionsModal) {
        qc.invalidateQueries({ queryKey: ["user-regions", regionsModal.userId] });
      }
      toast.show("Region removed");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Failed to remove region");
    }
  };

  const canModifyUser = (u: any) => {
    if (!currentUser) return false;
    if (currentUser.role === "super_admin") return true;
    if (currentUser.role === "admin") {
      return u.role !== "super_admin";
    }
    return false;
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const currentList = activeTab === "staff" ? staffAndAdmins : citizens;
    if (selectedUsers.size === currentList.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(currentList.map((u: any) => u.id)));
    }
  };

  const handleBulkAction = async (operation: string) => {
    if (selectedUsers.size === 0) {
      toast.show("Please select at least one user");
      return;
    }
    try {
      const result = await bulkUserOperation({ user_ids: Array.from(selectedUsers), operation });
      toast.show(`Bulk operation completed: ${result.updated_count} user(s) updated`);
      setSelectedUsers(new Set());
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Bulk operation failed");
    }
  };

  const handlePasswordReset = async (userId: number) => {
    try {
      await triggerPasswordReset(userId);
      toast.show("Password reset email sent");
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Failed to send reset email");
    }
  };

  const handleExportCSV = () => {
    const dataToExport = (activeTab === "staff" ? staffAndAdmins : citizens).map((u: any) => ({
      id: u.id,
      name: u.name || "",
      email: u.email,
      role: u.role,
      is_active: u.is_active ? "Yes" : "No",
      is_verified: u.is_verified ? "Yes" : "No",
      mobile: u.mobile || "",
      created_at: u.created_at || "",
      last_login: u.last_login || "Never"
    }));
    exportToCSV(dataToExport, `${activeTab}-users-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast.show("Export started");
  };

  const roleBadges: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    staff: "bg-green-100 text-green-800",
    citizen: "bg-gray-100 text-gray-800",
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Manage Users</h2>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => {
            setActiveTab("staff");
            setPage(1);
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "staff" 
              ? "text-indigo-600 border-b-2 border-indigo-600" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Staff & Admins ({staffAndAdmins.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("citizens");
            setPage(1);
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "citizens" 
              ? "text-indigo-600 border-b-2 border-indigo-600" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Citizens ({citizens.length})
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-lg space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Create New User</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
          <select
            className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="citizen">Citizen</option>
            <option value="staff">Staff</option>
            {currentUser?.role === "super_admin" && (
              <>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </>
            )}
          </select>
          <Button
            onClick={() => mutCreate.mutate()}
            disabled={mutCreate.isPending || name.trim().length < 2 || !email.includes("@")}
          >
            {mutCreate.isPending ? "Creating…" : "Create User"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Roles</option>
            <option value="citizen">Citizen</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={verifiedFilter}
            onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="created_at">Created Date</option>
              <option value="last_login">Last Login</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {selectedUsers.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm font-medium text-indigo-900">
            {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("activate")}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction("deactivate")}
              className="px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700"
            >
              Deactivate
            </button>
            {activeTab === "citizens" && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)?`)) {
                    handleBulkAction("delete");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === (activeTab === "staff" ? staffAndAdmins : citizens).length && (activeTab === "staff" ? staffAndAdmins : citizens).length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left p-3 font-semibold text-gray-700">Name</th>
                <th className="text-left p-3 font-semibold text-gray-700">Email</th>
                <th className="text-left p-3 font-semibold text-gray-700">Role</th>
                <th className="text-left p-3 font-semibold text-gray-700">Active</th>
                <th className="text-left p-3 font-semibold text-gray-700">Verified</th>
                {activeTab === "staff" && <th className="text-left p-3 font-semibold text-gray-700">Regions</th>}
                <th className="text-left p-3 font-semibold text-gray-700">Created</th>
                <th className="text-left p-3 font-semibold text-gray-700">Last Login</th>
                <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "staff" ? staffAndAdmins : citizens).slice((page - 1) * pageSize, page * pageSize).length > 0 ? 
                (activeTab === "staff" ? staffAndAdmins : citizens).slice((page - 1) * pageSize, page * pageSize).map((u: any) => (
                <tr key={u.id} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(u.id)}
                      onChange={() => toggleUserSelection(u.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="p-3 font-medium">
                    <button
                      onClick={() => setProfileModalId(u.id)}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {u.name || "—"}
                    </button>
                  </td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    {canModifyUser(u) ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs font-medium ${roleBadges[u.role] || ""}`}
                        disabled={u.role === "super_admin" && currentUser?.role !== "super_admin"}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="staff">Staff</option>
                        {currentUser?.role === "super_admin" && (
                          <>
                            <option value="admin">Admin</option>
                            {u.role === "super_admin" && <option value="super_admin">Super Admin</option>}
                          </>
                        )}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadges[u.role] || ""}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {canModifyUser(u) ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          onChange={() => toggleActive(u)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={u.is_active ? "text-green-600" : "text-gray-400"}>
                          {u.is_active ? "Yes" : "No"}
                        </span>
                      </label>
                    ) : (
                      <span className={u.is_active ? "text-green-600" : "text-gray-400"}>
                        {u.is_active ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.is_verified ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Unverified
                      </span>
                    )}
                  </td>
                  {activeTab === "staff" && (
                    <td className="p-3">
                      {["staff", "admin", "super_admin"].includes(u.role) ? (
                        <button
                          onClick={() => setRegionsModal({ userId: u.id, userName: u.name || u.email })}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium hover:underline"
                        >
                          {userRegions?.length || 0} region{(userRegions?.length || 0) !== 1 ? "s" : ""}
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="p-3 text-xs text-gray-600">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {canModifyUser(u) && (
                        <>
                          <button
                            onClick={() => handlePasswordReset(u.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium hover:underline"
                            title="Send password reset email"
                          >
                            Reset Password
                          </button>
                          {u.role !== "super_admin" && (
                            <button
                              onClick={() => setDeleteConfirm({ id: u.id, name: u.name || u.email })}
                              className="text-red-600 hover:text-red-800 text-xs font-medium hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={activeTab === "staff" ? 10 : 9} className="p-8 text-center text-gray-500">
                    No {activeTab === "staff" ? "staff/admins" : "citizens"} found. {search && "Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={activeUsers.length}
          itemsPerPage={pageSize}
          showingFrom={(page - 1) * pageSize + 1}
          showingTo={Math.min(page * pageSize, activeUsers.length)}
        />
      )}

      <Modal
        open={!!regionsModal}
        onClose={() => setRegionsModal(null)}
        title={`Manage Regions: ${regionsModal?.userName}`}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Region:
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onChange={(e) => {
                  if (e.target.value) {
                    addRegion(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Select state code...</option>
                {(stateCodesData || []).map((sc: string) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Regions:
            </label>
            <div className="space-y-2">
              {userRegions && userRegions.length > 0 ? (
                userRegions.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="font-mono text-sm">{r.state_code}</span>
                    <button
                      onClick={() => removeRegion(r.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No regions assigned</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!profileModalId}
        onClose={() => setProfileModalId(null)}
        title="User Profile"
      >
        <div className="space-y-4 p-4">
          {profileModalId && users.find((u: any) => u.id === profileModalId) && (() => {
            const u = users.find((u: any) => u.id === profileModalId);
            return (
              <>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Full Name:</span>
                    <div className="text-lg font-semibold">{u.name || "—"}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <div className="text-lg">{u.email}</div>
                  </div>
                  {u.mobile && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Mobile:</span>
                      <div className="text-lg">{u.mobile}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Role:</span>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadges[u.role] || ""}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Joined:</span>
                    <div className="text-sm">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Last Login:</span>
                    <div className="text-sm">{u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}</div>
                  </div>
                </div>
                {userStats && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold text-gray-800">Activity Stats</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600">Issues Handled</div>
                        <div className="text-xl font-bold text-indigo-900">{userStats.issues_handled || 0}</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600">Issues Created</div>
                        <div className="text-xl font-bold text-emerald-900">{userStats.issues_created || 0}</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600">Issues Resolved</div>
                        <div className="text-xl font-bold text-amber-900">{userStats.issues_resolved || 0}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && mutDelete.mutate(deleteConfirm.id)}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
