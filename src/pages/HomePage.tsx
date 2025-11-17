// File: src/pages/HomePage.tsx
// Project: improve-my-city-frontend

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/apiClient";
import { listIssues, updateIssueStatus } from "../services/issues.api";
import { useAuth } from "../store/useAuth";
import { useReportModal } from "../store/useReportModal";
import AuthModal from "../components/auth/AuthModal";
import IssueDetailModal from "../components/report/IssueDetailModal";
import type { Issue } from "../types/issue";
import { useIssueTypes } from "../hooks/useIssueTypes";
import { requireAuthAndOpenReport } from "../lib/requireAuthAndOpenReport";
import RecentActivityRotator from "../components/dashboard/RecentActivityRotator";
import IssueTypeChart from "../components/dashboard/IssueTypeChart";
import StatusPie from "../components/dashboard/StatusPie";
import Pagination from "../components/ui/Pagination";

// Charts (Recharts)
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

/** Toggle demo placeholders if backend is empty */
const USE_DEMO = false;

/** Time ranges shared by insights */
type RangeKey = "today" | "7d" | "15d" | "30d" | "all";
const RANGES: RangeKey[] = ["today", "7d", "15d", "30d", "all"];

/** Pretty duration like "2d 4h" */
function prettyDuration(sec?: number) {
  if (!sec || sec < 0) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [d ? `${d}d` : null, h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean).join(" ") || "0m";
}

/** Mini chip */
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-xl border bg-white px-2 py-1 text-xs text-gray-700">{children}</span>;
}

/** Generic bar for simple name/count data */
function SimpleBar({
  data, xKey = "name", yKey = "count", onBarClick, selectedValue, onClearFilter,
}: { 
  data: any[]; 
  xKey?: string; 
  yKey?: string; 
  onBarClick?: (name: string) => void;
  selectedValue?: string;
  onClearFilter?: () => void;
}) {
  return (
    <div className="h-[550px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 60, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
          <XAxis 
            dataKey={xKey} 
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
            cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              padding: '8px 12px',
              fontWeight: 'bold'
            }}
          />
          <Bar 
            dataKey={yKey} 
            fill="#10b981"
            radius={[0, 0, 0, 0]}
            onClick={(data: any) => onBarClick?.(data[xKey])}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
            barSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HomePage() {
  // Filters / UI state
  const [range, setRange] = useState<RangeKey>("7d");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { user } = useAuth();
  const isTeam = !!user && ["staff", "admin", "super_admin"].includes(user.role);

  const { openWith: openReportModal } = useReportModal();

  // Stats (long refresh or none)
  const { data: summary } = useQuery({
    queryKey: ["stats:summary", range],
    queryFn: async () => (await api.get("/issues/stats/summary", { params: { range } })).data,
    refetchInterval: 1800000, // 30m
    refetchOnWindowFocus: false,
  });

  // Status breakdown for all time (for pie chart widget)
  const { data: summaryAllTime } = useQuery({
    queryKey: ["stats:summary", "all"],
    queryFn: async () => (await api.get("/issues/stats/summary", { params: { range: "all" } })).data,
    refetchInterval: 1800000,
    refetchOnWindowFocus: false,
  });

  const { data: byType } = useQuery({
    queryKey: ["stats:by-type", range],
    queryFn: async () => (await api.get("/issues/stats/by-type", { params: { range } })).data as { type: string; count: number }[],
    refetchInterval: 1800000,
    refetchOnWindowFocus: false,
  });

  const { data: byState } = useQuery({
    queryKey: ["stats:by-state", range],
    queryFn: async () => (await api.get("/issues/stats/by-state", { params: { range } })).data as { state_code: string; count: number }[],
    refetchInterval: 1800000,
    refetchOnWindowFocus: false,
  });

  // Extras
  const { data: types } = useIssueTypes();

  const { data: topContrib } = useQuery({
    queryKey: ["stats:top-contributors"],
    queryFn: async () => (await api.get("/issues/stats/top-contributors", { params: { limit: 10 } })).data as { name: string; count: number }[],
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: avgResolve } = useQuery({
    queryKey: ["stats:avg-resolve-time"],
    queryFn: async () => (await api.get("/issues/stats/avg-resolve-time")).data as { avg_seconds: number },
    refetchInterval: 1800000,
    refetchOnWindowFocus: false,
  });


  // Issues list (no auto refresh)
  const {
    data: issuesData,
    isFetching: fetchingIssues,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ["issues", { search, status, category, stateCode, mineOnly, page }],
    queryFn: async () => {
      const data = await listIssues({
        status: status || undefined,
        category: category || undefined,
        state_code: stateCode || undefined,
        mine_only: mineOnly ? 1 : 0,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return data;
    },
    refetchOnWindowFocus: false,
    enabled: true,
  });
  
  const issues = useMemo(() => {
    if (!issuesData) return [];
    if (Array.isArray(issuesData)) return issuesData;
    return issuesData.items || [];
  }, [issuesData]);
  
  const totalIssues = useMemo(() => {
    if (!issuesData || Array.isArray(issuesData)) return issues.length;
    return issuesData.total || issues.length;
  }, [issuesData, issues.length]);

  // Derived
  const typeOptions = useMemo(
    () => (Array.isArray(types) ? types.map((t: any) => t.name).filter(Boolean) : [] as string[]),
    [types]
  );

  const pieData = useMemo(() => {
    const src = summaryAllTime || {};
    const data = [
      { name: "pending", value: src?.pending ?? 0 },
      { name: "in_progress", value: src?.in_progress ?? 0 },
      { name: "resolved", value: src?.resolved ?? 0 },
    ].filter((d) => d.value > 0);
    if (data.length === 0 && USE_DEMO) {
      return [
        { name: "pending", value: 8 },
        { name: "in_progress", value: 5 },
        { name: "resolved", value: 3 },
      ];
    }
    return data;
  }, [summaryAllTime]);

  useMemo(() => {
    if (Array.isArray(byType) && byType.length > 0) {
      return byType.map((t) => ({ name: t.type, count: t.count }));
    }
    return USE_DEMO
      ? [{ name: "Road", count: 8 }, { name: "Water", count: 5 }, { name: "Electric", count: 3 }]
      : [];
  }, [byType]);

  const regionBarData = useMemo(() => {
    if (Array.isArray(byState) && byState.length > 0) {
      return byState.map((r) => ({ name: r.state_code || "Unknown", count: r.count ?? 0 }));
    }
    return USE_DEMO
      ? [{ name: "MH", count: 6 }, { name: "KA", count: 4 }, { name: "DL", count: 2 }]
      : [];
  }, [byState]);

  const sortedIssues = useMemo(() => {
    if (!Array.isArray(issues)) return [];
    const sorted = [...issues];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === "date") {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sortBy === "title") {
        aVal = (a.title || "").toLowerCase();
        bVal = (b.title || "").toLowerCase();
      } else if (sortBy === "status") {
        const statusOrder = { pending: 1, in_progress: 2, resolved: 3 };
        aVal = statusOrder[a.status as keyof typeof statusOrder] || 0;
        bVal = statusOrder[b.status as keyof typeof statusOrder] || 0;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    return sorted;
  }, [issues, sortBy, sortOrder]);

  
  const totalPages = Math.ceil(totalIssues / pageSize);

  // Actions
  async function markStatus(id: number, newStatus: Issue["status"]) {
    await updateIssueStatus(id, newStatus);
    await refetchIssues();
  }

  // Scroll to issues when a status filter is applied by clicking the pie
  useEffect(() => {
    if (status) {
      document.querySelector("#issues")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  return (
    <main className="pb-14">
      {/* HERO + Contributors / Extras */}
      <section className="relative bg-gradient-to-br from-indigo-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: text + CTA + extras */}
            <div className="flex flex-col">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Improve My City</h1>
              <p className="mt-2 text-gray-700">
                Report local issues with photos and a map location. Track progress, get updates, and help your city respond faster.
              </p>
              <div className="mt-5">
                <button
                  onClick={requireAuthAndOpenReport}
                  className="cursor-pointer inline-flex items-center rounded-2xl px-5 py-3 bg-indigo-600 text-white text-base font-medium shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  Report an issue
                </button>
              </div>

              {/* Extras: Avg resolve + Top contributors side by side */}
              <div className="mt-6 grid grid-cols-2 gap-3 items-stretch">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-lg ring-1 ring-indigo-200 flex flex-col" style={{ minHeight: 'calc(2 * (48px + 8px) + 60px)' }}>
                  <div className="flex items-center justify-between w-full mb-3">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-1 h-5 bg-indigo-500 rounded"></span>
                      Avg. Response Time
                    </h3>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-indigo-900 tabular-nums text-center">{prettyDuration(avgResolve?.avg_seconds)}</div>
                    <div className="mt-1 text-xs text-gray-600 text-center">Time to resolve issues</div>
                  </div>
                </div>
                
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-lg ring-1 ring-emerald-200 flex flex-col" style={{ minHeight: 'calc(2 * (48px + 8px) + 60px)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-1 h-5 bg-emerald-500 rounded"></span>
                      Top Contributors
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">All Time</span>
                  </div>
                  {topContrib?.length ? (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 'calc(2 * (48px + 8px))' }}>
                      {topContrib.map((c: { name: string; count: number }) => (
                        <div key={`${c.name}-${c.count}`} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 border border-emerald-100 flex-shrink-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                            <div className="text-xs text-gray-600">{c.count} issue{c.count !== 1 ? 's' : ''} reported</div>
                          </div>
                          <div className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm border-2 border-emerald-200">
                            {c.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 text-center py-4">No contributors yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Status Breakdown + Recent Activity side by side */}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-4 shadow-lg ring-1 ring-gray-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-amber-500 rounded"></span>
                    Status Breakdown
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">All Time</span>
                </div>
                {pieData.length ? (
                  <div className="flex flex-col">
                    <StatusPie data={pieData} onPick={(picked) => { setStatus(picked); setPage(1); }} />
                    {status && (
                      <button 
                        className="mt-2 w-full px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors" 
                        onClick={() => setStatus("")}
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="text-xs text-gray-600 text-center">No issues yet</div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-4 shadow-lg ring-1 ring-gray-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-500 rounded"></span>
                    Recent Activity
                  </h3>
                </div>
                <RecentActivityRotator onOpenIssue={(id) => setDetailId(id)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INSIGHTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base md:text-lg font-semibold tracking-tight">Insights</h2>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-gray-600">Range</span>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize"
              >
                {RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r === "7d" ? "Last 7 Days" : r === "15d" ? "Last 15 Days" : r === "30d" ? "Last 30 Days" : r === "today" ? "Today" : "All Time"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Row 1: Issue Type Chart (full width) */}
          <div className="mt-4">
            <IssueTypeChart 
              range={range} 
              onTypeClick={(type) => { setCategory(type); setPage(1); }}
              selectedCategory={category}
              onClearFilter={() => { setCategory(""); setPage(1); }}
            />
          </div>

          {/* Row 2: Region bar (full width) */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            {regionBarData.length ? (
              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-lg ring-1 ring-gray-200">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-emerald-600 rounded"></span>
                        Issues by Region
                      </h3>
                      <p className="text-xs text-gray-500 italic mt-1 ml-5">(Click a bar to filter issues by region)</p>
                    </div>
                    {stateCode && (
                      <button
                        onClick={() => { setStateCode(""); setPage(1); }}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                </div>
                <SimpleBar 
                  data={regionBarData} 
                  onBarClick={(sc) => {
                    setStateCode(sc);
                    setPage(1);
                  }}
                  selectedValue={stateCode}
                  onClearFilter={() => { setStateCode(""); setPage(1); }}
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg ring-1 ring-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-6 bg-emerald-600 rounded"></span>
                  Issues by Region
                </h3>
                <div className="mt-2 text-sm text-gray-600 text-center">No regional data yet — you'll see a distribution here.</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FILTERS + RESULTS (connected card) */}
      <section id="issues" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b grid md:grid-cols-5 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues"
              className="rounded-xl border border-gray-200 p-2 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="cursor-pointer rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="cursor-pointer rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All categories</option>
              {typeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={stateCode}
              onChange={(e) => { setStateCode(e.target.value); setPage(1); }}
              className="cursor-pointer rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All states</option>
              {Array.from(new Set(regionBarData.map(r => r.name))).map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
            {user && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }} className="h-4 w-4" />
                My issues
              </label>
            )}
          </div>

          <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {sortedIssues.length} issue{sortedIssues.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedIssues.map((it: Issue) => {
              const statusColors: Record<string, string> = {
                pending: "bg-amber-50 border-amber-200 hover:border-amber-300",
                in_progress: "bg-yellow-50 border-yellow-200 hover:border-yellow-300",
                resolved: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
              };
              const statusBadgeColors: Record<string, string> = {
                pending: "bg-amber-100 text-amber-800 border-amber-300",
                in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
                resolved: "bg-emerald-100 text-emerald-800 border-emerald-300",
              };
              const cardBg = statusColors[it.status || ""] || "bg-white border-gray-200 hover:border-gray-300";
              const statusColor = statusBadgeColors[it.status || ""] || "bg-gray-100 text-gray-800 border-gray-300";
              
              return (
                <div 
                  key={it.id} 
                  onClick={() => setDetailId(it.id)}
                  className={`group rounded-2xl border-2 ${cardBg} p-5 shadow-md ring-1 ring-gray-200 transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs font-semibold text-indigo-600">#{it.id}</div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                      {it.status?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "Unknown"}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {it.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">{it.description || "No description"}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {it.category || "Uncategorized"}
                    </span>
                    <span>•</span>
                    <span>{it.created_at ? new Date(it.created_at).toLocaleDateString() : ""}</span>
                  </div>
                  {isTeam && it.status !== "resolved" && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button" 
                        onClick={() => markStatus(it.id, "in_progress")} 
                        className="flex-1 px-3 py-2 rounded-xl border-2 border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors text-sm"
                      >
                        Start
                      </button>
                      <button 
                        type="button" 
                        onClick={() => markStatus(it.id, "resolved")} 
                        className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-colors shadow-sm text-sm"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalIssues > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalIssues}
              itemsPerPage={pageSize}
              showingFrom={((page - 1) * pageSize) + 1}
              showingTo={Math.min(page * pageSize, totalIssues)}
            />
          )}

          {fetchingIssues && <div className="p-4 text-sm text-gray-500">Refreshing data…</div>}
          {!fetchingIssues && (!Array.isArray(issues) || issues.length === 0) && (
            <div className="p-10 text-center text-gray-700">
              <div className="text-2xl font-semibold">No issues yet</div>
              <div className="mt-1 text-sm">Be the first to report an issue and help improve your city 🌆</div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={requireAuthAndOpenReport}
                  className="cursor-pointer inline-flex items-center rounded-2xl px-5 py-3 bg-indigo-600 text-white text-base font-medium shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  Report an issue
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <IssueDetailModal open={!!detailId} issueId={detailId} onClose={() => { setDetailId(null); refetchIssues(); }} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => {
          setAuthOpen(false);
          openReportModal();
        }}
      />
    </main>
  );
}