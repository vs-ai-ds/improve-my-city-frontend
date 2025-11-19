import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIssue, listIssueComments, addIssueComment, updateIssueStatus } from "../services/issues.api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useState } from "react";
import { useAuth } from "../store/useAuth";
import { useToast } from "../components/toast/ToastProvider";
import { CategoryIcon } from "../utils/categoryIcons";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [statusChangeModal, setStatusChangeModal] = useState<{ status: "in_progress" | "resolved"; comment: string } | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ open: boolean; currentIndex: number; photos: string[] }>({ open: false, currentIndex: 0, photos: [] });
  
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
    mutationFn: ({ status, comment }: { status: "pending" | "in_progress" | "resolved"; comment: string }) => 
      updateIssueStatus(issueId, status, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["issue-comments", issueId] });
      setStatusChangeModal(null);
      toast.show("Status updated");
    },
    onError: (e: any) => {
      toast.show(e?.response?.data?.detail || "Status update failed");
    },
  });


  const canModify = () => {
    if (!user || !issue.data) return false;
    const issueData = issue.data as any;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (user.role === "staff" && issueData.assigned_to_id === user.id) return true;
    return false;
  };

  const canComment = () => {
    if (!user) return false;
    const issueData = issue.data as any;
    if (issueData?.status === "resolved") return false;
    return true;
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
    in_progress: "from-yellow-50 to-yellow-100",
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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative">
          <button
            onClick={() => navigate("/")}
            className="absolute top-6 right-6 p-2.5 rounded-full hover:bg-gray-100 transition-all z-10 border-2 border-gray-300 hover:border-gray-400 shadow-lg bg-white hover:shadow-xl hover:scale-105"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <div className={`p-8 border-b bg-gradient-to-r ${bgGradient}`}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
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
              
              {issueData.category && (
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <CategoryIcon category={issueData.category} className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">{issueData.category}</span>
                </div>
              )}
              
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">{issueData.title}</h1>
              
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reported By</span>
                <div className="inline-flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {(creator?.name || creator?.email || "A")[0].toUpperCase()}
                  </div>
                  <span className="text-base font-bold text-gray-900">
                    {creator?.name || creator?.email || "Anonymous"}
                  </span>
                </div>
              </div>
              
              {issueData.address && (
                <a
                  href={`https://www.google.com/maps?q=${issueData.lat},${issueData.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-white/80 px-3 py-2 rounded-lg inline-flex w-fit hover:bg-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{issueData.address}</span>
                </a>
              )}
              
              <div className="flex gap-2 flex-wrap mt-2">
                {canModify() && issueData.status === "pending" && issueData.assigned_to_id && (
                  <Button
                    variant="secondary"
                    onClick={() => setStatusChangeModal({ status: "in_progress", comment: "" })}
                    disabled={statusMut.isPending}
                    className="text-sm border-2 border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                  >
                    Mark In Progress
                  </Button>
                )}
                {canModify() && issueData.status === "in_progress" && (
                  <Button
                    onClick={() => setStatusChangeModal({ status: "resolved", comment: "" })}
                    disabled={statusMut.isPending}
                    className="text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md"
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Issue Details: </span>
                <span className="text-gray-900 whitespace-pre-wrap font-normal">
                  {issueData.description || (
                    <span className="text-gray-500 italic">No description provided.</span>
                  )}
                </span>
              </h3>
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
                    <button
                      key={i}
                      onClick={() => setPhotoViewer({ open: true, currentIndex: i, photos: issueData.photos })}
                      className="group block aspect-video rounded-xl overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-all shadow-md hover:shadow-xl"
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </button>
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
                  comments.data.map((c: any) => {
                    const roleBadge = c.user_role && c.user_role !== "citizen" ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {c.user_role.replace("_", " ")}
                      </span>
                    ) : null;
                    const isCreatorBadge = c.is_creator ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        Creator
                      </span>
                    ) : null;
                    return (
                      <div key={c.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {(c.author || "A")[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{c.author || "Anonymous"}</span>
                            {isCreatorBadge}
                            {roleBadge}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      </div>
                    );
                  })
                ) : canComment() ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm text-gray-500 font-medium">No comments yet</p>
                    <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
                  </div>
                ) : null}
              </div>

              {canComment() && (
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
              )}
              {!canComment() && (
                <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 text-center text-sm text-gray-600">
                  {!user ? "Please sign in to comment." : "Comments are disabled for resolved issues."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal
        open={!!statusChangeModal}
        onClose={() => setStatusChangeModal(null)}
        title={statusChangeModal?.status === "in_progress" ? "Mark as In Progress" : "Resolve Issue"}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {statusChangeModal?.status === "in_progress" 
              ? "Add a comment explaining what you're working on:" 
              : "Add a comment explaining how this issue was resolved:"}
          </p>
          <textarea
            value={statusChangeModal?.comment || ""}
            onChange={(e) => setStatusChangeModal(statusChangeModal ? { ...statusChangeModal, comment: e.target.value } : null)}
            placeholder="Enter your comment..."
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:bg-white shadow-sm resize-y"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setStatusChangeModal(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!statusChangeModal?.comment?.trim() || statusMut.isPending}
              onClick={() => {
                if (statusChangeModal) {
                  statusMut.mutate({ status: statusChangeModal.status, comment: statusChangeModal.comment });
                }
              }}
            >
              {statusMut.isPending ? "Updating…" : statusChangeModal?.status === "in_progress" ? "Mark In Progress" : "Resolve"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        open={photoViewer.open}
        onClose={() => setPhotoViewer({ open: false, currentIndex: 0, photos: [] })}
        title={`Photo ${photoViewer.currentIndex + 1} of ${photoViewer.photos.length}`}
        wide
      >
        <div className="relative">
          <img
            src={photoViewer.photos[photoViewer.currentIndex]}
            alt={`Photo ${photoViewer.currentIndex + 1}`}
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
          {photoViewer.photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoViewer({
                  ...photoViewer,
                  currentIndex: photoViewer.currentIndex > 0 ? photoViewer.currentIndex - 1 : photoViewer.photos.length - 1
                })}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setPhotoViewer({
                  ...photoViewer,
                  currentIndex: photoViewer.currentIndex < photoViewer.photos.length - 1 ? photoViewer.currentIndex + 1 : 0
                })}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
