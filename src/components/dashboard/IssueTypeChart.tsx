// File: src\components\dashboard\IssueTypeChart.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useQuery } from "@tanstack/react-query";
import type { RangeKey } from "../../services/stats.api";
import { getByType } from "../../services/stats.api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function IssueTypeChart({ range }: { range: RangeKey }) {
  const { data } = useQuery({
    queryKey: ["stats-by-type", range],
    queryFn: () => getByType(range),
  });

  const items = (data ?? []).map(d => ({ name: d.type, count: d.count }));

  if (!items.length) {
    return (
      <div className="rounded-2xl bg-white/90 backdrop-blur p-6 shadow ring-1 ring-black/5 text-center text-sm text-gray-600">
        No issues yet — you’ll see a breakdown by type here.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow ring-1 ring-black/5">
      <div className="mb-2 text-sm font-semibold">Issues by type</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}