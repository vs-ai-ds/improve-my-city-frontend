import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIssue, listIssueComments, addIssueComment, updateIssueStatus } from "../services/issues.api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useState } from "react";
import { useAuth } from "../store/useAuth";
import { useToast } from "../components/toast/ToastProvider";

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const issueId = Number(id);
  const qc = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  
  const issue = useQuery({ 
    queryKey: ["issue", issueId], 
    queryFn: () => getIssue(issueId),
    enabled: !!issueId && !isNaN(issueId),
  });
  
  const comments = useQuery({ 
    queryKey: ["issue-comments", issueId], 
    queryFn: () => listIssueComments(issueId),
    refetchInterval: 15000,
    enabled: !!issueId && !isNaN(issueId),
  });
  
  const [body, setBody] = useState("");
  
  const mut = useMutation({
    mutationFn: () => addIssueComment(issueId, { body }),
    onSuccess: () => { 
      setBody(""); 
      qc.invalidateQueries({ queryKey: ["issue-comments", issueId] }); 
      toast.show("Comment added");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Failed to add comment"),
  });

  const statusMut = useMutation({
    mutationFn: (status: "pending" | "in_progress" | "resolved") => updateIssueStatus(issueId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      qc.invalidateQueries({ queryKey: ["issues"] });
      toast.show("Status updated");
    },
    onError: (e: any) => toast.show(e?.response?.data?.detail || "Status update failed"),
  });

  const canModify = () => {
    if (!user || !issue.data) return false;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (user.role === "staff" && (issue.data as any).assigned_to_id === user.id) return true;
    return false;
  };

  if (issue.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading issue...</div>
      </div>
    );
  }
  
  if (issue.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Failed to load issue</div>
          <Button onClick={() => navigate("/")} variant="secondary">Go Home</Button>
        </div>
      </div>
    );
  }
  
  const it = issue.data;
  if (!it) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Issue not found</div>
          <Button onClick={() => navigate("/")} variant="secondary">Go Home</Button>
        </div>
      </div>
    );
  }

  const issueData = it as any;
  const creator = issueData.creator ?? { name: issueData.creator_name, email: issueData.creator_email };
  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
    resolved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  const statusColor = statusColors[issueData.status] || "bg-gray-100 text-gray-800 border-gray-300";

  const bgGradient = {
    pending: "from-amber-50 to-orange-50",
    in_progress: "from-yellow-50 to-amber-50",
    resolved: "from-emerald-50 to-teal-50",
  }[issueData.status as keyof typeof statusColors] || "from-gray-50 to-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className={`p-8 border-b bg-gradient-to-r ${bgGradient}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-sm font-semibold text-gray-600 bg-white px-2 py-1 rounded">#{issueData.id}</span>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${statusColor} shadow-sm`}>
                    {issueData.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                  {issueData.assigned_to_id && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      Assigned
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">{issueData.title}</h1>
                {issueData.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-white/80 px-3 py-2 rounded-lg inline-flex">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{issueData.address}</span>
                  </div>
                )}
              </div>
              {canModify() && (
                <div className="flex gap-2 flex-wrap">
                  {issueData.status !== "in_progress" && (
                    <Button
                      variant="secondary"
                      onClick={() => statusMut.mutate("in_progress")}
                      disabled={statusMut.isPending}
                      className="text-sm border-2 border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {issueData.status !== "resolved" && (
                    <Button
                      onClick={() => statusMut.mutate("resolved")}
                      disabled={statusMut.isPending}
                      className="text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Category</h3>
                <p className="text-lg font-bold text-gray-900">{issueData.category || "Uncategorized"}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Reported By</h3>
                <p className="text-lg font-bold text-gray-900">{creator?.name || creator?.email || "Anonymous"}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Created</h3>
                <p className="text-lg font-bold text-gray-900">
                  {issueData.created_at ? new Date(issueData.created_at).toLocaleDateString() : "—"}
                </p>
                {issueData.created_at && (
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(issueData.created_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {(issueData.state_code || issueData.country || (issueData.lat != null && issueData.lng != null)) && (
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(issueData.state_code || issueData.country) && (
                    <div>
                      <p className="text-sm text-gray-600">Region</p>
                      <p className="text-base font-semibold text-gray-900">
                        {issueData.state_code ? `${issueData.state_code}` : ""}
                        {issueData.state_code && issueData.country ? ", " : ""}
                        {issueData.country || "IN"}
                      </p>
                    </div>
                  )}
                  {issueData.lat != null && issueData.lng != null && (
                    <div>
                      <p className="text-sm text-gray-600">Coordinates</p>
                      <p className="text-base font-mono text-gray-900">
                        {issueData.lat.toFixed(6)}, {issueData.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Description
              </h3>
              <div className="text-gray-900 whitespace-pre-wrap bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-sm">
                {issueData.description || (
                  <span className="text-gray-500 italic">No description provided.</span>
                )}
              </div>
            </div>

            {issueData.photos && issueData.photos.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Photos ({issueData.photos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {issueData.photos.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block aspect-video rounded-xl overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-all shadow-md hover:shadow-xl"
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Comments
                </h3>
                <span className="text-sm font-medium text-gray-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                  {Array.isArray(comments.data) ? comments.data.length : 0} {comments.data?.length === 1 ? "comment" : "comments"}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                {Array.isArray(comments.data) && comments.data.length > 0 ? (
                  comments.data.map((c: any) => (
                    <div key={c.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {(c.author || "A")[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{c.author || "Anonymous"}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm text-gray-500 font-medium">No comments yet</p>
                    <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                <Input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a comment…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      if (body.trim() && !mut.isPending) mut.mutate();
                    }
                  }}
                  className="flex-1 bg-white"
                />
                <Button
                  disabled={!body.trim() || mut.isPending}
                  onClick={() => mut.mutate()}
                  className="px-6 shadow-md"
                >
                  {mut.isPending ? "Posting…" : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
