import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType } from "../../services/admin.issueTypes.api";
import { useToast } from "../../components/toast/ToastProvider";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function IssueTypesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ 
    queryKey: ["issue-types"], 
    queryFn: listIssueTypes, 
    refetchOnWindowFocus: false 
  });
  
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; issue_count: number } | null>(null);

  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    return (data ?? []).filter((t: any) => t.name.toLowerCase().includes(s));
  }, [q, data]);

  const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "Name is required";
    if (trimmed.length < 3) return "Name must be at least 3 characters";
    if (trimmed.length > 40) return "Name must be at most 40 characters";
    return "";
  };

  const checkDuplicate = (value: string, excludeId?: number | null): boolean => {
    const trimmed = value.trim().toLowerCase();
    return (data ?? []).some((t: any) => 
      t.id !== excludeId && t.name.toLowerCase() === trimmed
    );
  };

  const mCreate = useMutation({
    mutationFn: () => {
      const error = validateName(name);
      if (error) {
        setNameError(error);
        throw new Error(error);
      }
      if (checkDuplicate(name)) {
        const err = "Type already exists";
        setNameError(err);
        throw new Error(err);
      }
      return createIssueType({ name: name.trim() });
    },
    onSuccess: () => { 
      setName(""); 
      setNameError("");
      qc.invalidateQueries({ queryKey: ["issue-types"] }); 
      toast.show("Type added successfully");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail || e?.message || "Add failed";
      if (!nameError) setNameError(msg);
      toast.show(msg);
    },
  });

  function startEdit(t: any) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditNameError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditNameError("");
  }

  async function saveEdit() {
    if (!editingId) return;
    
    const error = validateName(editName);
    if (error) {
      setEditNameError(error);
      return;
    }
    
    if (checkDuplicate(editName, editingId)) {
      const err = "Type already exists";
      setEditNameError(err);
      toast.show(err);
      return;
    }
    
    try {
      await updateIssueType(editingId, { name: editName.trim() });
      toast.show("Renamed successfully");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
      cancelEdit();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Rename failed";
      setEditNameError(msg);
      toast.show(msg);
    }
  }

  const toggleActive = async (t: any) => {
    try {
      await updateIssueType(t.id, { is_active: !t.is_active });
      toast.show(t.is_active ? "Type deactivated" : "Type activated");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Update failed");
    }
  };

  function requestDelete(t: any) {
    if (t.issue_count > 0) {
      toast.show(`Cannot delete — ${t.issue_count} issue(s) use "${t.name}". Mark inactive instead.`);
      return;
    }
    setDeleteConfirm({ id: t.id, name: t.name, issue_count: t.issue_count });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    try {
      await deleteIssueType(deleteConfirm.id);
      toast.show("Deleted successfully");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
      setDeleteConfirm(null);
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Delete failed");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-gray-600">Loading issue types...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Issue Types</h2>
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search types..."
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Type</h3>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              onBlur={() => {
                if (name.trim()) {
                  const error = validateName(name);
                  if (error) setNameError(error);
                  else if (checkDuplicate(name)) setNameError("Type already exists");
                }
              }}
              placeholder="Type name (3-40 characters)"
              className={nameError ? "border-red-300 focus:ring-red-400" : ""}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-600">{nameError}</p>
            )}
          </div>
          <Button
            onClick={() => mCreate.mutate()}
            disabled={!name.trim() || !!nameError || mCreate.isPending}
            className="px-6"
          >
            {mCreate.isPending ? "Adding..." : "Add Type"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(filtered ?? []).map((t: any) => (
          <div
            key={t.id}
            className={`relative rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200 hover:shadow-lg transition-all ${
              !t.is_active ? "opacity-60" : ""
            }`}
          >
            {editingId === t.id ? (
              <div className="space-y-3">
                <Input
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditNameError("");
                  }}
                  onBlur={() => {
                    if (editName.trim()) {
                      const error = validateName(editName);
                      if (error) setEditNameError(error);
                      else if (checkDuplicate(editName, editingId)) setEditNameError("Type already exists");
                    }
                  }}
                  placeholder="Type name"
                  autoFocus
                  className={editNameError ? "border-red-300 focus:ring-red-400" : ""}
                />
                {editNameError && (
                  <p className="text-sm text-red-600">{editNameError}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={saveEdit} className="px-4 py-2 text-sm" disabled={!!editNameError || !editName.trim()}>
                    Save
                  </Button>
                  <Button variant="secondary" onClick={cancelEdit} className="px-4 py-2 text-sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">{t.name}</h4>
                      {!t.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t.issue_count ?? 0} issue{t.issue_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => requestDelete(t)}
                    className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete ${t.name}`}
                    disabled={t.issue_count > 0}
                    title={t.issue_count > 0 ? "Cannot delete: has issues" : "Delete"}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Rename
                  </button>
                  <label className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.is_active}
                      onChange={() => toggleActive(t)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t.is_active ? "Active" : "Inactive"}</span>
                  </label>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No issue types found</p>
          {q && <p className="text-sm mt-2">Try adjusting your search</p>}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Issue Type"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
