// File: src\components\dashboard\StatsCards.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useQuery } from "@tanstack/react-query";
import type { RangeKey } from "../../services/stats.api";
import { getSummary } from "../../services/stats.api";
import Skeleton from "../ui/Skeleton";

export default function StatsCards({ range }: { range: RangeKey }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-summary", range],
    queryFn: () => getSummary(range),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const total = data?.total ?? 0;
  const resolved = data?.resolved ?? 0;
  const in_progress = data?.in_progress ?? 0;
  const pending = data?.pending ?? 0;

  const Card = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow ring-1 ring-black/5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Total" value={total} />
      <Card label="Resolved" value={resolved} />
      <Card label="In progress" value={in_progress} />
      <Card label="Pending" value={pending} />
    </div>
  );
}