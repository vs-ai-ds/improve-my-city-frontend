// File: src/pages/HomePage.tsx
// Project: improve-my-city-frontend

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { api } from "../services/apiClient";
import { listIssues } from "../services/issues.api";
import { useAuth } from "../store/useAuth";
import { useReportModal } from "../store/useReportModal";
import AuthModal from "../components/auth/AuthModal";
import IssueDetailModal from "../components/report/IssueDetailModal";
import { useIssueTypes } from "../hooks/useIssueTypes";
import { requireAuthAndOpenReport } from "../lib/requireAuthAndOpenReport";
import RecentActivityRotator from "../components/dashboard/RecentActivityRotator";
import IssueTypeChart from "../components/dashboard/IssueTypeChart";
import RegionChart from "../components/dashboard/RegionChart";
import StatusPie from "../components/dashboard/StatusPie";
import Pagination from "../components/ui/Pagination";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getStatusColors } from "../constants/statusColors";
import { CategoryIcon } from "../utils/categoryIcons";


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


export default function HomePage() {
  // Filters / UI state
  const [range, setRange] = useState<RangeKey>("30d");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialView, setAuthInitialView] = useState<"login" | "register" | "forgot" | "verify">("login");
  const [shouldOpenReportAfterAuth, setShouldOpenReportAfterAuth] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { user } = useAuth();
  const { openWith: openReportModal } = useReportModal();
  
  // Handle location state for showing login modal
  const location = useLocation();
  useEffect(() => {
    if (location.state?.showLogin) {
      setAuthOpen(true);
      if (location.state?.initialView) {
        setAuthInitialView(location.state.initialView);
      }
      if (location.state?.openReportAfterAuth) {
        setShouldOpenReportAfterAuth(true);
      }
      // Clear the state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    function onAuthSuccess(e: any) {
      const shouldOpen = e?.detail?.openReport || shouldOpenReportAfterAuth;
      if (shouldOpen) {
        setShouldOpenReportAfterAuth(false);
        setTimeout(() => openReportModal(), 100);
      }
    }
    window.addEventListener("imc:auth-success", onAuthSuccess);
    return () => window.removeEventListener("imc:auth-success", onAuthSuccess);
  }, [shouldOpenReportAfterAuth, openReportModal]);

  // Stats (long refresh or none)
  useQuery({
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-3 sm:p-4 shadow-lg ring-1 ring-gray-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-amber-500 rounded"></span>
                    Status Breakdown
                  </h3>
                  <span className="text-xs text-gray-500 font-medium hidden sm:inline">All Time</span>
                </div>
                {pieData.length ? (
                  <div className="flex flex-col">
                    <StatusPie data={pieData} onPick={(picked) => { setStatus(picked); setPage(1); }} />
                    {status && (
                      <button 
                        className="mt-2 w-full px-4 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-semibold transition-colors shadow-sm border border-indigo-200" 
                        onClick={() => setStatus("")}
                      >
                        ✕ Clear Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="text-xs text-gray-600 text-center">No issues yet</div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 p-3 sm:p-4 shadow-lg ring-1 ring-gray-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
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
          <div className="mt-4 overflow-x-auto">
            <IssueTypeChart 
              range={range} 
              onTypeClick={(type) => { setCategory(type); setPage(1); }}
              selectedCategory={category}
              onClearFilter={() => { setCategory(""); setPage(1); }}
            />
          </div>

          {/* Row 2: Region bar (full width) */}
          <div className="mt-4 overflow-x-auto">
            <RegionChart 
              range={range} 
              onRegionClick={(state) => { setStateCode(state); setPage(1); }}
              selectedState={stateCode}
              onClearFilter={() => { setStateCode(""); setPage(1); }}
            />
          </div>
        </div>
      </section>

      {/* FILTERS + RESULTS (connected card) */}
      <section id="issues" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-indigo-600 rounded"></span>
              Issues List
            </h2>
            <div className="grid md:grid-cols-5 gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues by title, description..."
                className="rounded-xl border-2 border-gray-200 px-4 py-2.5 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="cursor-pointer rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <SearchableSelect
                value={category}
                onChange={(value) => { setCategory(value); setPage(1); }}
                options={typeOptions}
                placeholder="All categories"
                className="md:col-span-1"
              />
              <SearchableSelect
                value={stateCode}
                onChange={(value) => { setStateCode(value); setPage(1); }}
                options={Array.from(new Set(regionBarData.map(r => r.name)))}
                placeholder="All states"
                className="md:col-span-1"
              />
            {user && (
              <label className="flex items-center gap-2 text-sm cursor-pointer px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-colors bg-white shadow-sm">
                <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="font-medium text-gray-700">My issues</span>
              </label>
            )}
            </div>
          </div>

          <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border-2 border-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors shadow-sm bg-white"
              >
                <option value="date">Created Date</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-1.5 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
            <div className="text-sm font-semibold text-gray-700 px-4 py-1.5 rounded-lg bg-white border-2 border-gray-200 shadow-sm">
              {sortedIssues.length} issue{sortedIssues.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedIssues.map((it: any) => {
              const status = (it.status || "pending") as "pending" | "in_progress" | "resolved";
              const colors = getStatusColors(status);
              const isResolved = status === "resolved";
              
              const title = it.title || "Issue";
              const titleTruncated = title.length > 50 ? title.substring(0, 50) : title;
              const titleIsTruncated = title.length > 50;
              
              return (
                <div 
                  key={it.id} 
                  onClick={() => setDetailId(it.id)}
                  className={`group rounded-2xl border-2 ${colors.bg} ${colors.border} ${colors.hover} p-4 shadow-md ring-1 ring-gray-200 transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs font-mono font-bold text-indigo-600">Issue #{it.id}</div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}>
                      {status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  
                  {it.category && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
                      <CategoryIcon category={it.category} className="w-3.5 h-3.5" />
                      <span>{it.category}</span>
                    </div>
                  )}
                  
                  {titleIsTruncated ? (
                    <h3 
                      className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors"
                      title={title}
                    >
                      {titleTruncated}...
                    </h3>
                  ) : (
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {title}
                    </h3>
                  )}
                  
                  {it.address && (
                    <div className="text-xs text-gray-600 mb-2 flex items-start gap-1">
                      <span className="mt-0.5">📍</span>
                      <span className="flex-1">{it.address}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-600 mb-1">
                    Created: {it.created_at ? new Date(it.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                  </div>
                  
                  {!isResolved && it.assigned_to_name && (
                    <div className="text-xs text-gray-600 mb-1">
                      Assigned: {it.assigned_to_name}
                    </div>
                  )}
                  
                  {isResolved && it.resolved_at && (
                    <div className="text-xs text-emerald-700 font-medium">
                      Resolved: {new Date(it.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        initialView={authInitialView}
        onClose={() => {
          setAuthOpen(false);
          setShouldOpenReportAfterAuth(false);
        }}
      />
    </main>
  );
}