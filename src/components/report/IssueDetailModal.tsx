// src/components/report/IssueDetailModal.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIssue, listIssueComments, addIssueComment, updateIssueStatus } from "../../services/issues.api";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../toast/ToastProvider";
import { getStatusColors } from "../../constants/statusColors";

export default function IssueDetailModal({ open, issueId, onClose }: { open: boolean; issueId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const issueQ = useQuery({
    queryKey: ["issue", issueId],
    enabled: !!open && !!issueId,
    queryFn: async () => issueId ? getIssue(issueId) : null,
    staleTime: 60_000,
  });

  const commentsQ = useQuery({
    queryKey: ["issue-comments", issueId],
    enabled: !!open && !!issueId,
    queryFn: () => listIssueComments(issueId as number),
  });

  const addCommentM = useMutation({
    mutationFn: (body: string) => addIssueComment(issueId as number, { body }),
    onSuccess: () => {
      commentsQ.refetch();
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      setComment("");
      toast.show("Comment added");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed"),
  });

  const statusM = useMutation({
    mutationFn: (s: "pending" | "in_progress" | "resolved") => updateIssueStatus(issueId as number, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      qc.invalidateQueries({ queryKey: ["issues"] });
      toast.show("Status updated");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Status update failed"),
  });

  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) setComment("");
  }, [open]);

  if (!open) return null;
  if (issueQ.isLoading)
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">Loading…</div>;
  if (issueQ.error)
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">Error loading issue</div>;

  const it: any = issueQ.data;
  if (!it) return null;

  const creator = it.creator ?? { name: it.creator_name, email: it.creator_email };

  const canAct =
    user &&
    (["super_admin", "admin"].includes(user.role) ||
      (user.role === "staff" && it.assigned_to_id === user.id));

  const colors = getStatusColors(it.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-black text-2xl"
        >
          ✕
        </button>

        {/* HEADER */}
        <div className="p-6 border-b bg-gray-50/70">
          <div className="flex justify-between items-start gap-4">

            <div className="flex-1">
              {/* Issue ID + Date */}
              <div className="text-sm font-medium text-gray-700 mb-1">
                Issue #{it.id} • {new Date(it.created_at).toLocaleString()}
              </div>

              {/* Title */}
              <div
                className="text-2xl font-semibold line-clamp-2"
                title={it.title}
              >
                {it.title}
              </div>

              {/* Address */}
              {it.address && (
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                  📍 {it.address}
                </div>
              )}
            </div>

            {/* Status + Metadata */}
            <div className="text-right min-w-[160px]">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full border ${colors.badge}`}
              >
                {(it.status || "pending").replace("_", " ")}
              </span>

              <div className="text-xs text-gray-600 mt-3">
                <strong>Reporter:</strong> {creator?.name ?? creator?.email}
              </div>

              {it.category && (
                <div className="text-xs text-gray-600">
                  <strong>Category:</strong> {it.category}
                </div>
              )}

              {it.assigned_to_name && (
                <div className="text-xs text-gray-600">
                  <strong>Assigned To:</strong> {it.assigned_to_name}
                </div>
              )}

              {it.in_progress_at && (
                <div className="text-xs text-gray-600">
                  <strong>In Progress:</strong> {new Date(it.in_progress_at).toLocaleString()}
                </div>
              )}

              {it.resolved_at && (
                <div className="text-xs text-emerald-700 font-medium">
                  <strong>Resolved:</strong> {new Date(it.resolved_at).toLocaleString()}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Issue Details */}
          <section>
            <div className="text-lg font-semibold mb-2">Issue Details:</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {it.description || "No details provided."}
            </div>
          </section>

          {/* Coordinates */}
          {(it.lat != null && it.lng != null) && (
            <section>
              <div className="text-lg font-semibold mb-2">Coordinates:</div>
              <div className="text-sm text-gray-700">
                {it.state_code ? `${it.state_code}, ` : ""}
                {it.country || "IN"} • {it.lat.toFixed(6)}, {it.lng.toFixed(6)}
              </div>
            </section>
          )}

          {/* Photos */}
          <section>
            <div className="text-lg font-semibold mb-2">Photos:</div>

            {(!it.photos || it.photos.length === 0) ? (
              <div className="text-sm text-gray-500">No photos</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {it.photos.map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt={`photo-${i}`}
                    className="h-32 w-full object-cover rounded-lg border shadow-sm"
                  />
                ))}
              </div>
            )}
          </section>

          {/* Comments */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <div className="text-lg font-semibold">Comments</div>
              <div className="text-xs text-gray-500">{(commentsQ.data ?? []).length} comments</div>
            </div>

            {/* Existing comments */}
            <div className="space-y-3">
              {(commentsQ.data ?? []).length === 0 && (
                <div className="text-sm text-gray-500">No comments yet</div>
              )}

              {(commentsQ.data ?? []).map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs text-gray-600 mb-1">
                    {c.author} • {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm">{c.body}</div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div className="mt-3 flex gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 p-2 border rounded-xl text-sm focus:ring-indigo-500 focus:ring-1"
              />
              <button
                onClick={() => {
                  if (comment.trim()) addCommentM.mutate(comment.trim());
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm"
              >
                Send
              </button>
            </div>
          </section>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t bg-gray-50/70 flex items-center justify-between">
          <div className="flex gap-3">
            {canAct && it.status !== "in_progress" && (
              <button
                onClick={() => statusM.mutate("in_progress")}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white text-sm"
              >
                Mark In Progress
              </button>
            )}

            {canAct && it.status !== "resolved" && (
              <button
                onClick={() => statusM.mutate("resolved")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm"
              >
                Mark Resolved
              </button>
            )}
          </div>

          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}