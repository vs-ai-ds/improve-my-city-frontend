import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";

type Activity = {
  issue_id: number;
  kind: "created" | "in_progress" | "resolved";
  at: string;
  title?: string;
  description?: string;
  address?: string;
  created_by?: string;
  resolved_at?: string | null;
};

const statusIcons: Record<string, string> = {
  created: "🆕",
  in_progress: "🔄",
  resolved: "✅",
};

const statusBgColors: Record<string, string> = {
  created: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
  in_progress: "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200",
  resolved: "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200",
};

const statusTextColors: Record<string, string> = {
  created: "text-amber-800",
  in_progress: "text-yellow-800",
  resolved: "text-emerald-800",
};

async function fetchRecent(limit = 10): Promise<Activity[]> {
  const { data } = await api.get(`/issues/stats/recent-activity?limit=${limit}`);
  return Array.isArray(data) ? data : (data?.items ?? []);
}

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
      <div className="rounded-2xl border p-6 text-center text-sm text-gray-600">
        No activity yet — new reports and updates will appear here.
      </div>
    );
  }

  const act = items[idx];
  const bgColor = statusBgColors[act.kind] || "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
  const textColor = statusTextColors[act.kind] || "text-gray-800";

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="flex-1 relative">
        {items.map((item, i) => {
          const isActive = i === idx;
          const itemBgColor = statusBgColors[item.kind] || "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
          const itemTextColor = statusTextColors[item.kind] || "text-gray-800";
          
          return (
            <div
              key={`${item.issue_id}-${i}`}
              className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
                isActive ? 'translate-x-0' : i < idx ? '-translate-x-full' : 'translate-x-full'
              }`}
            >
              <button
                onClick={() => onOpenIssue(item.issue_id)}
                className={`w-full h-full text-left p-4 rounded-xl border-2 ${itemBgColor} hover:shadow-lg transition-all shadow-md`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-indigo-600">#{item.issue_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${itemBgColor} ${itemTextColor} flex items-center gap-1`}>
                    <span>{statusIcons[item.kind] || "📋"}</span>
                    <span className="capitalize">{item.kind.replace("_", " ")}</span>
                  </span>
                </div>
                <div className={`text-sm font-bold ${itemTextColor} mb-1 line-clamp-1`}>{item.title || "Issue"}</div>
                {item.description && (
                  <div className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description.substring(0, 25)}...</div>
                )}
                {item.address && (
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <span>📍</span>
                    <span className="truncate">{item.address}</span>
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-1">
                  Created: {new Date(item.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(item.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {item.created_by && (
                  <div className="text-xs text-gray-500 mb-1">
                    By: {item.created_by}
                  </div>
                )}
                {item.resolved_at && (
                  <div className="text-xs text-emerald-600 font-medium">
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
