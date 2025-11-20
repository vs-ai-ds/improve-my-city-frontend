import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType, reorderIssueTypes, getIssueTypeStats } from "../../services/admin.issueTypes.api";
import { useToast } from "../../components/toast/ToastProvider";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const COLOR_PRESETS = [
  "#6366f1", "#ef4444", "#10b981", "#f59e0b", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"
];

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
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [nameError, setNameError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; issue_count: number } | null>(null);
  const [statsModalId, setStatsModalId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const dragRef = useRef<{ startIndex: number; endIndex: number } | null>(null);

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
  }, [data]);

  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    return sortedData.filter((t: any) => 
      t.name.toLowerCase().includes(s) || 
      (t.description || "").toLowerCase().includes(s)
    );
  }, [q, sortedData]);

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
      return createIssueType({ 
        name: name.trim(),
        description: description.trim() || undefined,
        color: color
      });
    },
    onSuccess: () => { 
      setName(""); 
      setDescription("");
      setColor(COLOR_PRESETS[0]);
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
    setEditDescription(t.description || "");
    setEditColor(t.color || COLOR_PRESETS[0]);
    setEditNameError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditColor("");
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
      await updateIssueType(editingId, { 
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        color: editColor
      });
      toast.show("Updated successfully");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
      cancelEdit();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Update failed";
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
      setDeleteConfirm({ id: t.id, name: t.name, issue_count: t.issue_count });
      return;
    }
    setDeleteConfirm({ id: t.id, name: t.name, issue_count: 0 });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.issue_count > 0) {
      toast.show(`Cannot delete — ${deleteConfirm.issue_count} issue(s) use this type. Mark inactive instead.`);
      setDeleteConfirm(null);
      return;
    }
    try {
      await deleteIssueType(deleteConfirm.id);
      toast.show("Deleted successfully");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
      setDeleteConfirm(null);
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Delete failed");
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedId(filtered[index].id);
    dragRef.current = { startIndex: index, endIndex: index };
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragRef.current) {
      dragRef.current.endIndex = index;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragRef.current || draggedId === null) return;
    
    const { startIndex, endIndex } = dragRef.current;
    if (startIndex === endIndex) {
      setDraggedId(null);
      dragRef.current = null;
      return;
    }

    const newOrder: Record<string, number> = {};
    const items = [...filtered];
    const [removed] = items.splice(startIndex, 1);
    items.splice(endIndex, 0, removed);

    items.forEach((item: any, idx: number) => {
      newOrder[item.id] = idx;
    });

    try {
      await reorderIssueTypes(newOrder);
      toast.show("Order updated");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Reorder failed");
    }

    setDraggedId(null);
    dragRef.current = null;
  };

  const { data: statsData } = useQuery({
    queryKey: ["issue-type-stats", statsModalId],
    queryFn: () => getIssueTypeStats(statsModalId!),
    enabled: !!statsModalId,
  });

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
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Color:</label>
              <div className="flex gap-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional, e.g., 'Pothole: damage on road surface')"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
        {filtered.map((t: any, index: number) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className={`relative rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200 hover:shadow-lg transition-all cursor-move ${
              !t.is_active ? "opacity-60" : ""
            } ${draggedId === t.id ? "opacity-50" : ""}`}
            style={{ borderLeft: `4px solid ${t.color || "#6366f1"}` }}
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
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Color:</label>
                  <div className="flex gap-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded border ${editColor === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-6 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
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
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: t.color || "#6366f1" }}
                      />
                      <h4 className="font-semibold text-gray-900 truncate">{t.name}</h4>
                      {!t.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-sm text-gray-600 mb-2">{t.description}</p>
                    )}
                    <div className="text-sm text-gray-600">
                      {t.issue_count ?? 0} issue{t.issue_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => requestDelete(t)}
                    className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold transition-colors"
                    aria-label={`Delete ${t.name}`}
                    title={t.issue_count > 0 ? `Cannot delete: ${t.issue_count} issue(s) use this type` : "Delete"}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setStatsModalId(t.id)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={t.is_active}
                    onChange={() => toggleActive(t)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t.is_active ? "Active" : "Inactive"}</span>
                </label>
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
        message={deleteConfirm?.issue_count > 0 
          ? `Cannot delete "${deleteConfirm?.name}" — ${deleteConfirm?.issue_count} issue(s) use this type. Mark inactive instead.`
          : `Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText={deleteConfirm?.issue_count > 0 ? "OK" : "Delete"}
        cancelText="Cancel"
        variant={deleteConfirm?.issue_count > 0 ? "default" : "danger"}
      />

      <Modal
        open={!!statsModalId}
        onClose={() => setStatsModalId(null)}
        title="Issue Type Analytics"
      >
        <div className="space-y-4 p-4">
          {statsData ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Issues</div>
                  <div className="text-2xl font-bold text-indigo-900">{statsData.total_count || 0}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Last 7 Days</div>
                  <div className="text-2xl font-bold text-emerald-900">{statsData.last_7d_count || 0}</div>
                </div>
              </div>
              {statsData.avg_resolution_hours !== null && statsData.avg_resolution_hours !== undefined && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Avg Resolution Time</div>
                  <div className="text-2xl font-bold text-amber-900">
                    {Math.round(statsData.avg_resolution_hours)} hours
                  </div>
                </div>
              )}
              {statsData.last_7d_count > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Trend:</span> {statsData.last_7d_count} new issues in the last week
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">Loading analytics...</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
