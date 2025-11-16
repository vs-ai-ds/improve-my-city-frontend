// src/components/report/IssueDetailModal.tsx
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIssue, listIssueComments, addIssueComment, updateIssueStatus } from "../../services/issues.api";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../toast/ToastProvider";

export default function IssueDetailModal({ open, issueId, onClose }: { open:boolean; issueId:number|null; onClose:()=>void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const issueQ = useQuery({
    queryKey: ["issue", issueId],
    enabled: !!open && !!issueId,
    queryFn: () => getIssue(issueId as number),
    staleTime: 60_000,
  });

  const commentsQ = useQuery({
    queryKey: ["issue-comments", issueId],
    enabled: !!open && !!issueId,
    queryFn: () => listIssueComments(issueId as number),
  });

  const addCommentM = useMutation({
    mutationFn: (body: string) => addIssueComment(issueId as number, { body }),
    onSuccess: () => { commentsQ.refetch(); qc.invalidateQueries({ queryKey: ["issue", issueId] }); setComment(""); toast.show("Comment added") },
    onError: (e:any) => toast.show(e?.response?.data?.detail || e?.message || "Failed"),
  });

  const statusM = useMutation({
    mutationFn: (s:"pending"|"in_progress"|"resolved") => updateIssueStatus(issueId as number, s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["issue", issueId] }); qc.invalidateQueries({ queryKey: ["issues"] }); toast.show("Status updated") },
    onError: (e:any) => toast.show(e?.response?.data?.detail || "Status update failed"),
  });

  const [comment, setComment] = useState("");

  useEffect(()=> {
    if (!open) {
      setComment("");
    }
  }, [open]);

  if (!open) return null;
  if (issueQ.isLoading) return <div className="fixed inset-0 z-50 flex items-center justify-center">Loading...</div>;
  if (issueQ.error) return <div className="fixed inset-0 z-50 flex items-center justify-center">Error loading issue</div>;

  const issue = issueQ.data;
  if (!issue) return null;

  const it: any = issue;
  // Normalize response shape (backend returns creator_name/creator_email)
  const creator = it.creator ?? { name: it.creator_name, email: it.creator_email };

  const canAct = (() => {
    if (!user) return false;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (user.role === "staff" && it.assigned_to_id === user.id) return true;
    return false;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-auto max-h-[90vh]">
        <div className="p-4 border-b flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-500">#{it.id} • {new Date(it.created_at).toLocaleString()}</div>
            <div className="text-xl font-semibold">{it.title}</div>
            <div className="text-sm text-gray-600">{it.address}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Status</div>
            <div className="font-medium">{(it.status||"pending").replace("_"," ")}</div>
            <div className="text-xs text-gray-400 mt-2">Reported by: {creator?.name ?? creator?.email}</div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold mb-1">Description</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{it.description || "No description provided."}</div>
          </div>

          {(it.lat != null && it.lng != null) && (
            <div>
              <div className="text-sm font-semibold mb-1">Location</div>
              <div className="text-xs text-gray-600">
                {(it.state_code ? `${it.state_code}, ` : "")}{(it.country || "IN")} • {it.lat.toFixed(6)}, {it.lng.toFixed(6)}
              </div>
            </div>
          )}

          <div>
            <div className="text-sm font-semibold mb-2">Photos</div>
            <div className="flex gap-2 overflow-x-auto">
              {(it.photos || []).map((url:string,i:number)=>(
                <img key={i} src={url} alt={`photo-${i}`} className="h-24 w-32 object-cover rounded-md border" />
              ))}
              {(!(it.photos||[]).length) && <div className="text-sm text-gray-500">No photos</div>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Comments</div>
              <div className="text-xs text-gray-500">{(commentsQ.data ?? []).length} comments</div>
            </div>

            <div className="mt-3 space-y-2">
              {(commentsQ.data ?? []).map((c:any)=>(
                <div key={c.id} className="p-2 rounded-md bg-gray-50">
                  <div className="text-xs text-gray-500">{c.author} • {new Date(c.created_at).toLocaleString()}</div>
                  <div className="text-sm">{c.body}</div>
                </div>
              ))}
              {(commentsQ.data ?? []).length === 0 && <div className="text-sm text-gray-500">No comments</div>}
            </div>
          </div>

          <div className="flex gap-2">
            <textarea value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-xl border p-2" />
            <button onClick={()=> { if(comment.trim()) addCommentM.mutate(comment.trim()); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">Send</button>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex gap-2">
            {canAct && it.status !== "in_progress" && <button onClick={()=>statusM.mutate("in_progress")} className="px-4 py-2 rounded-xl bg-yellow-500">Mark In Progress</button>}
            {canAct && it.status !== "resolved" && <button onClick={()=>statusM.mutate("resolved")} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Resolve</button>}
          </div>
          <div>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
