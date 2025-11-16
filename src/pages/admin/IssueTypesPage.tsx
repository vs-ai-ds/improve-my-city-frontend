import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType } from "../../services/admin.issueTypes.api";
import { useToast } from "../../components/toast/ToastProvider";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function IssueTypesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["issue-types"], queryFn: listIssueTypes, refetchOnWindowFocus: false });
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; issue_count: number } | null>(null);

  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    return (data ?? []).filter((t:any) => t.name.toLowerCase().includes(s));
  }, [q, data]);

  const mCreate = useMutation({
    mutationFn: () => createIssueType({ name: name.trim() }),
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["issue-types"] }); toast.show("Type added"); },
    onError: (e:any) => toast.show(e?.response?.data?.detail || "Add failed"),
  });

  function startEdit(t: any) {
    setEditingId(t.id);
    setEditName(t.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      await updateIssueType(editingId, { name: editName.trim() });
      toast.show("Renamed");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
      cancelEdit();
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Rename failed");
    }
  }

  function requestDelete(t: any) {
    if (t.issue_count > 0) {
      toast.show(`Cannot delete — ${t.issue_count} issue(s) use "${t.name}".`);
      return;
    }
    setDeleteConfirm({ id: t.id, name: t.name, issue_count: t.issue_count });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    try {
      await deleteIssueType(deleteConfirm.id);
      toast.show("Deleted");
      qc.invalidateQueries({ queryKey: ["issue-types"] });
      setDeleteConfirm(null);
    } catch (e: any) {
      toast.show(e?.response?.data?.detail || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-xl font-semibold">Issue Types</h2>
        <div className="flex gap-2">
          <input
            value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search types..."
            className="rounded-xl border p-2"
          />
          <input
            value={name} onChange={(e)=>setName(e.target.value)} placeholder="New type name"
            className="rounded-xl border p-2"
          />
          <button
            onClick={()=> name.trim() && mCreate.mutate()}
            className="rounded-xl px-3 py-2 bg-indigo-600 text-white disabled:opacity-50"
            disabled={!name.trim()}
          >Add</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(filtered ?? []).map((t:any)=> (
          <div key={t.id} className="relative rounded-2xl bg-white/90 backdrop-blur p-4 shadow ring-1 ring-black/5 hover:shadow-md transition-shadow">
            {editingId === t.id ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Type name"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} className="px-3 py-1 text-sm">Save</Button>
                  <Button variant="secondary" onClick={cancelEdit} className="px-3 py-1 text-sm">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => requestDelete(t)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold"
                  aria-label={`Delete ${t.name}`}
                  disabled={t.issue_count > 0}
                >
                  ✕
                </button>
                <div className="pr-8">
                  <div className="font-medium truncate mb-1">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.issue_count ?? 0} issue(s)</div>
                </div>
                <button
                  onClick={() => startEdit(t)}
                  className="mt-2 px-3 py-1 rounded-xl border text-sm hover:bg-gray-50"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>

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