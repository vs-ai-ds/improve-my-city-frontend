// File: src\components\report\IssueDetailModal.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useState } from "react";
import { updateIssueStatus } from "../../services/issues.api";
import type { Issue } from "../../types/issue";
import { useAuth } from "../../store/useAuth";

export function IssueDetailModal({ issue, onClose, onChanged }: { issue: Issue | null; onClose: () => void; onChanged: () => void; }) {
  const { user } = useAuth();
  const isTeam = user && ["staff","admin","super_admin"].includes(user.role);
  const [busy, setBusy] = useState(false);

  if (!issue) return null;

  async function setStatus(status: Issue["status"]) {
    setBusy(true);
    try { await updateIssueStatus(issue.id, status); onChanged(); onClose(); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Issue Details</h3>
          <button onClick={onClose} className="px-3 py-1">✕</button>
        </div>
        <div className="p-4 space-y-2">
          <div className="text-sm text-gray-600">#{issue.id} — {new Date(issue.created_at).toLocaleString()}</div>
          <h4 className="text-lg font-semibold">{issue.title}</h4>
          <div className="text-sm">{issue.description}</div>
          <div className="text-sm">Category: <b>{issue.category}</b> • Status: <b className="capitalize">{issue.status.replace("_"," ")}</b></div>
          <div className="text-sm">Location: {issue.state_code}, {issue.country} • {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</div>
        </div>
        {isTeam && (
          <div className="p-4 border-t flex gap-2 justify-end">
            <button disabled={busy} onClick={() => setStatus("in_progress")} className="px-3 py-2 rounded-xl border">Mark In Progress</button>
            <button disabled={busy} onClick={() => setStatus("resolved")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Mark Resolved</button>
          </div>
        )}
      </div>
    </div>
  );
}