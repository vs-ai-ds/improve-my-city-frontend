// File: src/pages/IssueDetailPage.tsx
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIssue, listIssueComments, addIssueComment } from "../services/issues.api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useState } from "react";

export default function IssueDetailPage() {
  const { id } = useParams();
  const issueId = Number(id);
  const qc = useQueryClient();
  const issue = useQuery({ queryKey: ["issue", issueId], queryFn: () => getIssue(issueId) });
  const comments = useQuery({ queryKey: ["issue-comments", issueId], queryFn: () => listIssueComments(issueId), refetchInterval: 15000 });
  const [body, setBody] = useState("");
  const mut = useMutation({
    mutationFn: () => addIssueComment(issueId, { body }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["issue-comments", issueId] }); }
  });

  if (issue.isLoading) return <div className="p-6">Loading…</div>;
  if (issue.isError) return <div className="p-6 text-red-600">Failed to load.</div>;
  const it = issue.data;
  if (!it) return <div className="p-6 text-red-600">Issue not found.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="rounded-2xl border bg-white p-4">
        <h1 className="text-xl font-semibold">Issue #{it.id} — {it.title}</h1>
        <div className="mt-2 text-sm text-gray-700">
          <div><b>Status:</b> {it.status}</div>
          <div><b>Category:</b> {it.category || "-"}</div>
          <div><b>Address:</b> {it.address || (it.lat != null && it.lng != null ? `${it.lat}, ${it.lng}` : "No location")}</div>
          <div className="mt-2 whitespace-pre-wrap">{it.description}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Comments</h2>
        <div className="mt-3 grid gap-2">
          <div className="flex gap-2">
            <Input value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Write a comment…" />
            <Button disabled={!body.trim() || mut.isPending} onClick={()=>mut.mutate()}>
              {mut.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {Array.isArray(comments.data) && comments.data.length
              ? comments.data.map((c:any) => (
                  <div key={c.id} className="rounded-xl border p-2">
                    <div className="text-sm text-gray-800">{c.body}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.author} • {new Date(c.created_at).toLocaleString()}</div>
                  </div>
                ))
              : <div className="text-sm text-gray-600">No comments yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}