import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RangeKey } from "../../services/stats.api";
import { getByType } from "../../services/stats.api";
import { api } from "../../services/apiClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function IssueTypeChart({ 
  range, 
  onTypeClick,
  selectedCategory,
  onClearFilter
}: { 
  range: RangeKey;
  onTypeClick?: (type: string) => void;
  selectedCategory?: string;
  onClearFilter?: () => void;
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
      return typeStatusData.map((d: { type: string; pending: number; in_progress: number; resolved: number }) => ({
        name: d.type,
        pending: d.pending || 0,
        in_progress: d.in_progress || 0,
        resolved: d.resolved || 0,
        total: (d.pending || 0) + (d.in_progress || 0) + (d.resolved || 0),
      }));
    }
    return (data ?? []).map((d: { type: string; count: number }) => ({ 
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
    <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg ring-1 ring-gray-200">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-8 bg-indigo-600 rounded"></span>
              Issues by Type
            </h3>
            <p className="text-xs text-gray-500 italic mt-1 ml-5">(Click a bar to filter issues by type)</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCategory && onClearFilter && (
              <button
                onClick={onClearFilter}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
              >
                Clear Filter
              </button>
            )}
            {items.length > itemsPerPage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
                  disabled={scrollIndex === 0}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  ←
                </button>
                <div className="text-xs text-gray-600 font-medium px-3">
                  {scrollIndex + 1}-{Math.min(scrollIndex + itemsPerPage, items.length)} of {items.length}
                </div>
                <button
                  onClick={() => setScrollIndex(Math.min(maxScroll, scrollIndex + 1))}
                  disabled={scrollIndex >= maxScroll}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-[550px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleItems} margin={{ top: 20, right: 20, left: 60, bottom: 150 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12, fill: '#374151', fontWeight: 'bold' }}
              interval={0}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fontSize: 12, fill: '#374151', fontWeight: 'bold' }}
              label={{ value: 'Number of Issues', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151', fontWeight: 'bold', fontSize: '13px' } }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: 'bold'
              }}
              formatter={(value: number, name: string) => [
                value, 
                name === "total" ? "Total" : name.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
              ]}
            />
            {typeStatusData && typeStatusData.length > 0 ? (
              <>
                <Bar 
                  dataKey="pending" 
                  stackId="a"
                  fill="#f59e0b"
                  onClick={(data: any) => onTypeClick?.(data.name)}
                  style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                  radius={[0, 0, 0, 0]}
                  barSize={60}
                />
                <Bar 
                  dataKey="in_progress" 
                  stackId="a"
                  fill="#eab308"
                  onClick={(data: any) => onTypeClick?.(data.name)}
                  style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                  radius={[0, 0, 0, 0]}
                  barSize={60}
                />
                <Bar 
                  dataKey="resolved" 
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  onClick={(data: any) => onTypeClick?.(data.name)}
                  style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                  barSize={60}
                />
              </>
            ) : (
              <Bar 
                dataKey="total" 
                fill="#6366f1"
                radius={[0, 0, 0, 0]}
                onClick={(data: any) => onTypeClick?.(data.name)}
                style={{ cursor: onTypeClick ? 'pointer' : 'default' }}
                barSize={60}
              />
            )}
            <Legend 
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '0px', fontWeight: 'bold' }}
              formatter={(value: string) => value.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
              verticalAlign="bottom"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
