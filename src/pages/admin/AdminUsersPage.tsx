import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { listUsers, createUser, updateUser, deleteUser } from "../../services/admin.users.api";
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
    return users;
  }, [users]);

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
      </div>

      <div className="rounded-2xl border bg-white shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
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
                  <td className="p-3 font-medium">{u.name || "—"}</td>
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
                    <span className={u.is_verified ? "text-green-600" : "text-gray-400"}>
                      {u.is_verified ? "Yes" : "No"}
                    </span>
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
                    {canModifyUser(u) && u.role !== "super_admin" && (
                      <button
                        onClick={() => setDeleteConfirm({ id: u.id, name: u.name || u.email })}
                        className="text-red-600 hover:text-red-800 text-xs font-medium hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={activeTab === "staff" ? 9 : 8} className="p-8 text-center text-gray-500">
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
