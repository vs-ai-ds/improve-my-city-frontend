import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { getStatusColors } from "../../constants/statusColors";

type Activity = {
  issue_id: number;
  kind: "created" | "in_progress" | "resolved";
  at: string;
  title?: string;
  description?: string;
  address?: string;
  created_by?: string;
  resolved_at?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
  in_progress_at?: string | null;
};

const statusIcons: Record<string, string> = {
  created: "🆕",
  in_progress: "🔄",
  resolved: "✅",
};

async function fetchRecent(limit = 10): Promise<Activity[]> {
  const { data } = await api.get(`/issues/stats/recent-activity?limit=${limit}`);
  return Array.isArray(data) ? data : (data?.items ?? []);
}

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) : text;
};

export default function RecentActivityRotator({
  onOpenIssue,
}: { onOpenIssue: (id: number) => void }) {
  const { data } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => fetchRecent(10),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });

  const items = useMemo(() => (data ?? []), [data]);
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => {
      if (!paused.current) setIdx((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border p-4 text-center text-sm text-gray-600">
        No activity yet — new reports and updates will appear here.
      </div>
    );
  }

  const statusMap: Record<string, "pending" | "in_progress" | "resolved"> = {
    created: "pending",
    in_progress: "in_progress",
    resolved: "resolved",
  };

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="flex-1 relative min-h-[280px]">
        {items.map((item, i) => {
          const isActive = i === idx;
          const status = statusMap[item.kind] || "pending";
          const colors = getStatusColors(status);
          const isResolved = item.kind === "resolved" || !!item.resolved_at;
          const assignedDate = item.assigned_at || item.in_progress_at;
          
          const title = item.title || "Issue";
          const titleTruncated = truncateText(title, 50);
          const titleIsTruncated = title.length > 50;
          
          const description = item.description || "";
          const descTruncated = truncateText(description, 50);
          const descIsTruncated = description.length > 50;
          
          return (
            <div
              key={`${item.issue_id}-${i}`}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                isActive 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}
            >
              <button
                onClick={() => onOpenIssue(item.issue_id)}
                className={`w-full h-full text-left p-3 rounded-xl border-2 ${colors.bgGradient} ${colors.border} hover:shadow-lg transition-all shadow-md`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-indigo-600">Issue #{item.issue_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors.badge} flex items-center gap-1`}>
                    <span>{statusIcons[item.kind] || "📋"}</span>
                    <span className="capitalize">{item.kind.replace("_", " ")}</span>
                  </span>
                </div>
                
                {titleIsTruncated ? (
                  <div 
                    className={`text-sm font-bold ${colors.text} mb-1 line-clamp-1`}
                    title={title}
                  >
                    {titleTruncated}...
                  </div>
                ) : (
                  <div className={`text-sm font-bold ${colors.text} mb-1`}>
                    {title}
                  </div>
                )}
                
                {description && (
                  descIsTruncated ? (
                    <div 
                      className="text-xs text-gray-600 mb-2 line-clamp-2"
                      title={description}
                    >
                      {descTruncated}...
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 mb-2">
                      {description}
                    </div>
                  )
                )}
                
                {item.address && (
                  <div className="text-xs text-gray-700 mb-2 flex items-start gap-1">
                    <span className="mt-0.5">📍</span>
                    <span className="flex-1">{item.address}</span>
                  </div>
                )}
                
                {item.created_by && (
                  <div className="text-xs text-gray-600 mb-1">
                    Created by: {item.created_by}
                  </div>
                )}
                
                <div className="text-xs text-gray-600 mb-1">
                  Created: {new Date(item.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                
                {!isResolved && item.assigned_to_name && assignedDate && (
                  <div className="text-xs text-gray-600 mb-1">
                    Assigned to: {item.assigned_to_name} on {new Date(assignedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                
                {isResolved && item.resolved_at && (
                  <div className="text-xs text-emerald-700 font-medium">
                    Resolved: {new Date(item.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
