import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import IssuesHeatmap from "../../components/admin/IssuesHeatmap";

type TimeRange = "today" | "7d" | "30d" | "year" | "all";

async function fetchAdminSummary(range: TimeRange) {
  const { data } = await api.get("/issues/stats/summary", { params: { range } });
  return data || {};
}

async function fetchDailyTrends(range: TimeRange) {
  const { data } = await api.get("/issues/stats/trends/daily", { params: { range } });
  return data || [];
}

async function fetchResolutionTrend(range: TimeRange) {
  const { data } = await api.get("/issues/stats/trends/resolution-time", { params: { range } });
  return data || [];
}

async function fetchSLAMetrics(range: TimeRange) {
  const { data } = await api.get("/issues/stats/sla", { params: { range } });
  return data || {};
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function AdminLandingPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: summary } = useQuery({
    queryKey: ["admin-summary", timeRange],
    queryFn: () => fetchAdminSummary(timeRange),
    staleTime: 2 * 60 * 1000,
  });

  const { data: dailyTrends } = useQuery({
    queryKey: ["daily-trends", timeRange],
    queryFn: () => fetchDailyTrends(timeRange),
    staleTime: 5 * 60 * 1000,
  });

  const { data: resolutionTrend } = useQuery({
    queryKey: ["resolution-trend", timeRange],
    queryFn: () => fetchResolutionTrend(timeRange),
    staleTime: 5 * 60 * 1000,
  });

  const { data: slaMetrics } = useQuery({
    queryKey: ["sla-metrics", timeRange],
    queryFn: () => fetchSLAMetrics(timeRange),
    staleTime: 5 * 60 * 1000,
  });

  const formattedDailyTrends = useMemo(() => {
    if (!dailyTrends || !Array.isArray(dailyTrends)) return [];
    return dailyTrends.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: item.count,
    }));
  }, [dailyTrends]);

  const formattedResolutionTrend = useMemo(() => {
    if (!resolutionTrend || !Array.isArray(resolutionTrend)) return [];
    return resolutionTrend.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: Math.round(item.avg_seconds / 3600 * 10) / 10,
    }));
  }, [resolutionTrend]);

  const handleStatusClick = (status: string) => {
    navigate(`/admin/issues?status=${status}&dateRange=${timeRange}`);
  };

  const cells = [
    { 
      k: "pending", 
      label: "Pending", 
      className: "bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer transition-colors",
      onClick: () => handleStatusClick("pending")
    },
    { 
      k: "in_progress", 
      label: "In progress", 
      className: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer transition-colors",
      onClick: () => handleStatusClick("in_progress")
    },
    { 
      k: "resolved", 
      label: "Resolved", 
      className: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors",
      onClick: () => handleStatusClick("resolved")
    },
    { 
      k: "total", 
      label: "Total", 
      className: "bg-slate-50 border-slate-200",
      onClick: undefined
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin Overview</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cells.map(c => (
          <div 
            key={c.k} 
            className={`rounded-2xl border p-4 ${c.className}`}
            onClick={c.onClick}
          >
            <div className="text-sm text-gray-600">{c.label}</div>
            <div className="text-2xl font-bold">{Number(summary?.[c.k] ?? 0)}</div>
            {c.onClick && (
              <div className="text-xs text-gray-500 mt-1">Click to view →</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">Issues Per Day</h3>
          {formattedDailyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={formattedDailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">Avg Resolution Time (Hours)</h3>
          {formattedResolutionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={formattedResolutionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">SLA Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
              <div className="text-2xl font-bold text-indigo-900">
                {formatDuration(slaMetrics?.avg_response_time_seconds || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Time to first action</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Resolution Time</div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatDuration(slaMetrics?.avg_resolution_time_seconds || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Time to resolution</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Within SLA</div>
              <div className="text-2xl font-bold text-amber-900">
                {slaMetrics?.within_sla_percentage?.toFixed(1) || 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Resolved within 48h</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">Issue Density Map</h3>
          <IssuesHeatmap range={timeRange} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Link to="/admin/issues" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow transition-shadow">
          <div className="text-lg font-semibold">Manage Issues</div>
          <p className="text-sm text-gray-600">Search, assign, and change status</p>
        </Link>
        <Link to="/admin/issue-types" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow transition-shadow">
          <div className="text-lg font-semibold">Manage Issue Types</div>
          <p className="text-sm text-gray-600">Add, rename, or remove types</p>
        </Link>
        <Link to="/admin/users" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow transition-shadow">
          <div className="text-lg font-semibold">Users & Staff</div>
          <p className="text-sm text-gray-600">Admins, staff regions, citizens</p>
        </Link>
        <Link to="/admin/settings" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow transition-shadow">
          <div className="text-lg font-semibold">App Settings</div>
          <p className="text-sm text-gray-600">Anonymous reporting, email sender, etc.</p>
        </Link>
      </div>
    </div>
  );
}
