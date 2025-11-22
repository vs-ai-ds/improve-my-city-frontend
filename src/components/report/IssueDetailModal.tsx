// src/components/report/IssueDetailModal.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIssue, listIssueComments, addIssueComment, updateIssueStatus, getIssueActivity, getRelatedIssues, assignIssue } from "../../services/issues.api";
import { api } from "../../services/apiClient";
import MapPicker from "./MapPicker";
import { isOverdue } from "../../utils/issueUtils";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../toast/ToastProvider";
import { CategoryIcon } from "../../utils/categoryIcons";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
    enabled: !!open && !!issueId && issueId !== null && !isNaN(Number(issueId)),
    queryFn: () => listIssueComments(issueId as number),
  });

  const [comment, setComment] = useState("");
  const [statusChangeModal, setStatusChangeModal] = useState<{ status: "in_progress" | "resolved"; comment: string } | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ open: boolean; currentIndex: number; photos: string[] }>({ open: false, currentIndex: 0, photos: [] });
  const [showMap, setShowMap] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedAssignUserId, setSelectedAssignUserId] = useState<number | null>(null);

  const { data: activityData } = useQuery({
    queryKey: ["issue-activity", issueId],
    queryFn: () => getIssueActivity(issueId!),
    enabled: !!issueId && showActivity,
  });

  const { data: relatedIssues } = useQuery({
    queryKey: ["related-issues", issueId],
    queryFn: () => getRelatedIssues(issueId!),
    enabled: !!issueId,
  });

  const { data: staffUsers } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users", { params: { role: "staff" } });
      return (data || []).filter((u: any) => u.is_active);
    },
    enabled: !!assignModal,
  });

  const assignMut = useMutation({
    mutationFn: (userId: number | null) => assignIssue(issueId!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      qc.invalidateQueries({ queryKey: ["admin-issues"] });
      setAssignModal(false);
      setAssignSearch("");
      setSelectedAssignUserId(null);
      toast.show("Issue assigned successfully");
    },
    onError: (e: any) => {
      toast.show(e?.response?.data?.detail || "Failed to assign issue");
    },
  });

  const addCommentM = useMutation({
    mutationFn: (body: string) => addIssueComment(issueId as number, { body }),
    onSuccess: () => {
      commentsQ.refetch();
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      setComment("");
      toast.show("Comment added");
    },
    onError: (e: unknown) => toast.show((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed"),
  });

  const statusM = useMutation({
    mutationFn: ({ status, comment }: { status: "pending" | "in_progress" | "resolved"; comment: string }) => 
      updateIssueStatus(issueId as number, status, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["issue-comments", issueId] });
      setStatusChangeModal(null);
      toast.show("Status updated");
    },
    onError: (e: unknown) => toast.show((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Status update failed"),
  });

  useEffect(() => {
    if (!open) {
      setComment("");
      setStatusChangeModal(null);
      setPhotoViewer({ open: false, currentIndex: 0, photos: [] });
    }
  }, [open]);

  if (!open) return null;
  if (issueQ.isLoading)
    return <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/10">Loading…</div>;
  if (issueQ.error)
    return <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/10">Error loading issue</div>;

  const it = issueQ.data as {
    id: number;
    title: string;
    description?: string;
    status: string;
    category?: string;
    address?: string;
    lat?: number;
    lng?: number;
    photos?: string[];
    created_at: string;
    updated_at?: string | null;
    assigned_to_id?: number;
    assigned_to?: { id: number; name?: string; email?: string; role?: string } | null;
    creator?: { name?: string; email?: string; id?: number };
    creator_name?: string;
    creator_email?: string;
    state_code?: string | null;
  } | null;
  if (!it) return null;

  const creator = it.creator ?? { name: it.creator_name, email: it.creator_email };

  const canModify = () => {
    if (!user || !it) return false;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (user.role === "staff" && it.assigned_to_id === user.id) return true;
    return false;
  };

  const canViewEmail = () => {
    if (!user || !it) return false;
    if (["super_admin", "admin"].includes(user.role)) return true;
    if (it.assigned_to_id === user.id) return true;
    if (user.role === "staff" && it.state_code) {
      const userRegions = qc.getQueryData(["user-regions", user.id]) as any[];
      return userRegions?.some((r: any) => r.state_code === it.state_code) || false;
    }
    return false;
  };

  const canComment = () => {
    if (!user) return false;
    if (it?.status === "resolved") return false;
    return true;
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
    resolved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  const statusColor = statusColors[it.status] || "bg-gray-100 text-gray-800 border-gray-300";

  return (
    <>
      <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40 backdrop-blur p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[92vh] overflow-hidden flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2.5 rounded-full hover:bg-gray-100 transition-all z-10 border-2 border-gray-300 hover:border-gray-400 shadow-lg bg-white hover:shadow-xl hover:scale-105"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col gap-4 pr-12">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-lg font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg border-2 border-indigo-200">#{it.id}</span>
                <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${statusColor} shadow-md`}>
                  {it.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                {isOverdue(it.created_at, 48) && it.status !== "resolved" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300">
                    Overdue
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{it.title}</h1>
                <div className="text-sm text-gray-600 mt-2">
                  <div>Created: {new Date(it.created_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  })}</div>
                  {it.updated_at && it.updated_at !== it.created_at && (
                    <div className="mt-1">Updated: {new Date(it.updated_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    })}</div>
                  )}
                </div>
              </div>

              {it.category && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CategoryIcon category={it.category} className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold">{it.category}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Created By</span>
                <div className="inline-flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {(creator?.name || creator?.email || "A")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-900">
                      {creator?.name || creator?.email || "Anonymous"}
                    </div>
                    {creator?.email && canViewEmail() && (
                      <div className="text-xs text-gray-500">{creator.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {it.assigned_to && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assigned To</span>
                  <div className="inline-flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                      {(it.assigned_to.name || it.assigned_to.email || "S")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">
                        {it.assigned_to.name || it.assigned_to.email}
                      </div>
                      <div className="text-xs text-gray-500">{it.assigned_to.role}</div>
                    </div>
                  </div>
                </div>
              )}

              {it.address && (
                <div className="flex items-center gap-3">
                  <a
                    href={`https://www.google.com/maps?q=${it.lat},${it.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-white/80 px-3 py-2 rounded-lg w-fit hover:bg-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{it.address}</span>
                  </a>
                  {it.lat && it.lng && (
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      {showMap ? "Hide Map" : "Show Map"}
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap mt-2">
                {canModify() && (
                  <>
                    {!it.assigned_to_id && it.status !== "resolved" && (
                      <Button
                        variant="secondary"
                        onClick={() => setAssignModal(true)}
                        className="text-sm"
                      >
                        Assign Staff
                      </Button>
                    )}
                    {it.assigned_to_id && it.status !== "resolved" && (
                      <Button
                        variant="secondary"
                        onClick={() => setAssignModal(true)}
                        className="text-sm"
                      >
                        Reassign
                      </Button>
                    )}
                    {it.status === "pending" && it.assigned_to_id && (
                      <Button
                        variant="secondary"
                        onClick={() => setStatusChangeModal({ status: "in_progress", comment: "" })}
                        disabled={statusM.isPending}
                        className="text-sm border-2 border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                      >
                        Mark In Progress
                      </Button>
                    )}
                    {it.status === "in_progress" && (
                      <Button
                        onClick={() => setStatusChangeModal({ status: "resolved", comment: "" })}
                        disabled={statusM.isPending}
                        className="text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md"
                      >
                        Resolve
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => setShowActivity(!showActivity)}
                      className="text-sm"
                    >
                      {showActivity ? "Hide Timeline" : "View Timeline"}
                    </Button>
                  </>
                )}
                {it.status !== "resolved" && (
                  <div className="text-xs text-gray-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    SLA: To be resolved within 48 hours
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {showMap && it.lat && it.lng && (
              <div className="border rounded-xl overflow-hidden">
                <MapPicker
                  initialLat={it.lat}
                  initialLng={it.lng}
                  onPick={() => {}}
                />
              </div>
            )}

            {showActivity && activityData && (
              <div className="border rounded-xl p-4 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Timeline</h3>
                <div className="space-y-3">
                  {Array.isArray(activityData) && activityData.length > 0 ? (
                    activityData.map((activity: any, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.kind === "created" && "Issue created"}
                            {activity.kind === "assigned" && `Assigned to ${activity.user || "someone"}`}
                            {activity.kind === "in_progress" && "Marked as In Progress"}
                            {activity.kind === "resolved" && "Resolved"}
                            {activity.kind === "comment" && `Comment by ${activity.user || "someone"}`}
                          </div>
                          {activity.comment && (
                            <div className="text-sm text-gray-600 mt-1 bg-white p-2 rounded">{activity.comment}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {activity.at ? new Date(activity.at).toLocaleString() : ""}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">No activity recorded yet</div>
                  )}
                </div>
              </div>
            )}

            {relatedIssues && relatedIssues.length > 0 && (
              <div className="border rounded-xl p-4 bg-indigo-50">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Related / Nearby Issues</h3>
                <div className="space-y-2">
                  {relatedIssues.map((related: any) => (
                    <button
                      key={related.id}
                      onClick={() => {
                        onClose();
                        setTimeout(() => {
                          window.location.hash = `#issue-${related.id}`;
                        }, 100);
                      }}
                      className="w-full text-left p-3 bg-white rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">#{related.id} {related.title}</div>
                          <div className="text-xs text-gray-600">{related.category} • {related.distance_m}m away</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          related.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                          related.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {related.status.replace("_", " ")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Description</span>
              </h3>
              <div className="text-gray-900 whitespace-pre-wrap font-normal bg-gray-50 p-4 rounded-lg border">
                {it.description || (
                  <span className="text-gray-500 italic">No description provided.</span>
                )}
              </div>
            </div>

            {it.photos && it.photos.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Photos ({it.photos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {it.photos.map((url: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setPhotoViewer({ open: true, currentIndex: i, photos: it.photos || [] })}
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

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Comments
                </h3>
                <span className="text-sm font-medium text-gray-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                  {Array.isArray(commentsQ.data) ? commentsQ.data.length : 0} {commentsQ.data?.length === 1 ? "comment" : "comments"}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {Array.isArray(commentsQ.data) && commentsQ.data.length > 0 ? (
                  commentsQ.data.map((c: { id: number; author?: string; body: string; created_at: string; user_role?: string; is_creator?: boolean }) => {
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
                      <div key={c.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
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
                  <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300">
                    <p className="text-sm text-gray-500 font-medium">No comments yet</p>
                    <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
                  </div>
                ) : null}
              </div>

              {canComment() && (
                <div className="flex gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        if (comment.trim() && !addCommentM.isPending) addCommentM.mutate(comment.trim());
                      }
                    }}
                    className="flex-1 bg-white"
                  />
                  <Button
                    disabled={!comment.trim() || addCommentM.isPending}
                    onClick={() => {
                      if (comment.trim()) addCommentM.mutate(comment.trim());
                    }}
                    className="px-6 shadow-md"
                  >
                    {addCommentM.isPending ? "Posting…" : "Post Comment"}
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
              disabled={!statusChangeModal?.comment?.trim() || statusM.isPending}
              onClick={() => {
                if (statusChangeModal) {
                  statusM.mutate({ status: statusChangeModal.status, comment: statusChangeModal.comment });
                }
              }}
            >
              {statusM.isPending ? "Updating…" : statusChangeModal?.status === "in_progress" ? "Mark In Progress" : "Resolve"}
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

      {/* Assignment Modal */}
      <Modal
        open={assignModal}
        onClose={() => {
          setAssignModal(false);
          setAssignSearch("");
          setSelectedAssignUserId(null);
        }}
        title="Assign Issue"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign to:</label>
            <div className="relative">
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
                <div className="p-2 sticky top-0 bg-white border-b border-gray-200 z-10">
                  <input
                    type="text"
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="py-1">
                  {(staffUsers || [])
                    .filter((u: any) => {
                      if (!assignSearch.trim()) return true;
                      const searchLower = assignSearch.toLowerCase();
                      return (
                        (u.name || "").toLowerCase().includes(searchLower) ||
                        (u.email || "").toLowerCase().includes(searchLower) ||
                        (u.role || "").toLowerCase().includes(searchLower)
                      );
                    })
                    .map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssignUserId(u.id);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          selectedAssignUserId === u.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        <div className="font-medium">{u.name || u.email}</div>
                        <div className="text-xs text-gray-500">{u.role}</div>
                      </button>
                    ))}
                  {assignSearch.trim() && (staffUsers || []).filter((u: any) => {
                    const searchLower = assignSearch.toLowerCase();
                    return (
                      (u.name || "").toLowerCase().includes(searchLower) ||
                      (u.email || "").toLowerCase().includes(searchLower) ||
                      (u.role || "").toLowerCase().includes(searchLower)
                    );
                  }).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                  )}
                </div>
              </div>
            </div>
            {selectedAssignUserId && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {
                  (staffUsers || []).find((u: any) => u.id === selectedAssignUserId)?.name || 
                  (staffUsers || []).find((u: any) => u.id === selectedAssignUserId)?.email || 
                  "Unknown"
                }
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAssignModal(false);
                setAssignSearch("");
                setSelectedAssignUserId(null);
              }}
              disabled={assignMut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAssignUserId !== null) {
                  assignMut.mutate(selectedAssignUserId);
                }
              }}
              disabled={selectedAssignUserId === null || assignMut.isPending}
            >
              {assignMut.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
