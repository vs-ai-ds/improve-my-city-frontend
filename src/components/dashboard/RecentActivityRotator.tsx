//src\components\dashboard\RecentActivityRotator.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";

type Activity = {
  issue_id: number;
  kind: "created" | "in_progress" | "resolved";
  at: string;
  title?: string;
  address?: string;
  status?: string; // optional convenience
};

const KIND_STYLES: Record<Activity["kind"], string> = {
  created: "bg-amber-500 text-white",
  in_progress: "bg-yellow-500 text-black",
  resolved: "bg-emerald-600 text-white",
};

async function fetchRecent(limit = 20): Promise<Activity[]> {
  const { data } = await api.get(`/issues/stats/recent-activity?limit=${limit}`);
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export default function RecentActivityRotator({
  onOpenIssue,
}: { onOpenIssue: (id: number) => void }) {
  const { data } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => fetchRecent(20),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
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

  const it = items[idx];
  const style = KIND_STYLES[it.kind];

  return (
    <div
      className={`rounded-2xl shadow-lg ring-1 ring-black/10 overflow-hidden transition-all duration-700 ease-in-out ${style}`}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      style={{ minHeight: '120px' }}
    >
      <button
        className="block w-full text-left p-5 focus:outline-none hover:opacity-95 transition-opacity"
        onClick={() => onOpenIssue(it.issue_id)}
        aria-label={`Open issue #${it.issue_id}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium opacity-95 capitalize tracking-wide">{it.kind.replace("_", " ")}</span>
          <span className="text-xs font-semibold opacity-95">#{it.issue_id}</span>
        </div>
        <div className="text-xl font-bold mb-1 truncate">{it.title ?? "Issue"}</div>
        {it.address && <div className="text-sm opacity-90 truncate mb-1">{it.address}</div>}
        <div className="text-xs opacity-80 mt-2">{new Date(it.at).toLocaleString()}</div>
      </button>
    </div>
  );
}
