import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RangeKey } from "../../services/stats.api";
import { getByType } from "../../services/stats.api";
import { api } from "../../services/apiClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function IssueTypeChart({ 
  range, 
  onTypeClick 
}: { 
  range: RangeKey;
  onTypeClick?: (type: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["stats-by-type", range],
    queryFn: () => getByType(range),
  });

  const { data: typeStatusData } = useQuery({
    queryKey: ["stats-by-type-status", range],
    queryFn: async () => {
      const { data } = await api.get("/issues/stats/by-type-status", { params: { range } });
      return data as Array<{ type: string; pending: number; in_progress: number; resolved: number }>;
    },
  });

  const items = useMemo(() => {
    if (typeStatusData && typeStatusData.length > 0) {
      return typeStatusData.map(d => ({
        name: d.type,
        pending: d.pending || 0,
        in_progress: d.in_progress || 0,
        resolved: d.resolved || 0,
        total: (d.pending || 0) + (d.in_progress || 0) + (d.resolved || 0),
      }));
    }
    return (data ?? []).map(d => ({ 
      name: d.type, 
      count: d.count,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      total: d.count,
    }));
  }, [data, typeStatusData]);
  const [scrollIndex, setScrollIndex] = useState(0);
  const itemsPerPage = 5;
  const maxScroll = Math.max(0, items.length - itemsPerPage);

  const visibleItems = useMemo(() => {
    return items.slice(scrollIndex, scrollIndex + itemsPerPage);
  }, [items, scrollIndex]);

  if (!items.length) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg ring-1 ring-gray-200 text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Issues by Type</h3>
        <p className="text-sm text-gray-500">No issues yet — you'll see a breakdown by type here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-lg ring-1 ring-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-indigo-600 rounded"></span>
        Issues by Type
      </h3>
      
      {/* Slider controls */}
      {items.length > itemsPerPage && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
            disabled={scrollIndex === 0}
            className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <div className="flex-1 text-xs text-gray-600 text-center">
            Showing {scrollIndex + 1}-{Math.min(scrollIndex + itemsPerPage, items.length)} of {items.length}
          </div>
          <button
            onClick={() => setScrollIndex(Math.min(maxScroll, scrollIndex + 1))}
            disabled={scrollIndex >= maxScroll}
            className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleItems} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip 
              cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
              formatter={(value: number, name: string) => [value, name === "total" ? "Total" : name.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())]}
            />
            <Legend />
            {typeStatusData && typeStatusData.length > 0 ? (
              <>
                <Bar 
                  dataKey="pending" 
                  stackId="a"
                  fill="#f59e0b"
                  onClick={(data: any) => onTypeClick?.(data.name)}
                  style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                />
                <Bar 
                  dataKey="in_progress" 
                  stackId="a"
                  fill="#eab308"
                  onClick={(data: any) => onTypeClick?.(data.name)}
                  style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                />
                <Bar 
                  dataKey="resolved" 
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 8, 8]}
                  onClick={(data: any) => onTypeClick?.(data.name)}
                  style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                />
              </>
            ) : (
              <Bar 
                dataKey="total" 
                fill="#6366f1"
                radius={[8, 8, 0, 0]}
                onClick={(data: any) => onTypeClick?.(data.name)}
                style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-gray-500 mt-2 text-center">Click a bar to filter issues by type</p>
    </div>
  );
}
