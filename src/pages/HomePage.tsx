// File: src/pages/HomePage.tsx
// Project: improve-my-city-frontend

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/apiClient";
import { listIssues, updateIssueStatus } from "../services/issues.api";
import { useAuth } from "../store/useAuth";
import { useReportModal } from "../store/useReportModal";
import AuthModal from "../components/auth/AuthModal";
import { IssueDetailModal } from "../components/report/IssueDetailModal";
import type { Issue } from "../types/issue";
import { useIssueTypes } from "../hooks/useIssueTypes";

// Charts (Recharts)
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
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

/** Status pie (merges KPIs + breakdown) */
function StatusPie({
  data, onPick,
}: { data: { name: string; value: number }[]; onPick: (status: string) => void }) {
  const COLORS = ["#f59e0b", "#eab308", "#10b981", "#9ca3af"];
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} onClick={(e: any) => e?.name && onPick(e.name)}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Generic bar for simple name/count data */
function SimpleBar({
  data, xKey = "name", yKey = "count",
}: { data: any[]; xKey?: string; yKey?: string }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey={xKey} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey={yKey} />
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
  const [mineOnly, setMineOnly] = useState(false);
  const [detail, setDetail] = useState<Issue | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const { user } = useAuth();
  const isLoggedIn = !!user;
  const isTeam = !!user && ["staff", "admin", "super_admin"].includes(user.role);

  const { openModal: openReportModal } = useReportModal();

  // Stats (long refresh or none)
  const { data: summary } = useQuery({
    queryKey: ["stats:summary", range],
    queryFn: async () => (await api.get("/issues/stats", { params: { range } })).data,
    refetchInterval: 1800000, // 30m
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
    queryFn: async () => (await api.get("/issues/stats/by-state", { params: { range } })).data as { state: string; count: number }[],
    refetchInterval: 1800000,
    refetchOnWindowFocus: false,
  });

  // Extras
  const { data: types } = useIssueTypes();

  const { data: topContrib } = useQuery({
    queryKey: ["stats:top-contributors"],
    queryFn: async () => (await api.get("/issues/stats/top-contributors", { params: { limit: 10 } })).data as { name: string; count: number }[],
    refetchInterval: 60000, // 60s
    refetchOnWindowFocus: false,
  });

  const { data: avgResolve } = useQuery({
    queryKey: ["stats:avg-resolve-time"],
    queryFn: async () => (await api.get("/issues/stats/avg-resolve-time")).data as { avg_seconds: number },
    refetchInterval: 1800000,
    refetchOnWindowFocus: false,
  });

  const { data: activity } = useQuery({
    queryKey: ["stats:recent-activity"],
    queryFn: async () => (await api.get("/issues/stats/recent-activity", { params: { limit: 20 } })).data as Array<{ issue_id: number; kind: "created" | "in_progress" | "resolved"; at: string; title: string; status: string; }>,
    refetchInterval: 15000, // 15s
    refetchOnWindowFocus: false,
  });

  // Issues list (no auto refresh)
  const {
    data: issues,
    isFetching: fetchingIssues,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ["issues", { search, status, category, mineOnly }],
    queryFn: () =>
      listIssues({
        q: search || undefined,
        status: status || undefined,
        category: category || undefined,
        mine_only: mineOnly ? 1 : 0,
      }),
    refetchOnWindowFocus: false,
  });

  // Derived
  const typeOptions = useMemo(
    () => (Array.isArray(types) ? types.map((t: any) => t.name).filter(Boolean) : [] as string[]),
    [types]
  );

  const pieData = useMemo(() => {
    const src = summary || {};
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
  }, [summary]);

  const typeBarData = useMemo(() => {
    if (Array.isArray(byType) && byType.length > 0) {
      return byType.map((t) => ({ name: t.type, count: t.count }));
    }
    return USE_DEMO
      ? [{ name: "Road", count: 8 }, { name: "Water", count: 5 }, { name: "Electric", count: 3 }]
      : [];
  }, [byType]);

  const regionBarData = useMemo(() => {
    if (Array.isArray(byState) && byState.length > 0) {
      return byState.map((r) => ({ name: r.state || "Unknown", count: r.count ?? 0 }));
    }
    return USE_DEMO
      ? [{ name: "MH", count: 6 }, { name: "KA", count: 4 }, { name: "DL", count: 2 }]
      : [];
  }, [byState]);

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
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* Left: text + CTA + extras */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Improve My City</h1>
              <p className="mt-2 text-gray-700">
                Report local issues with photos and a map location. Track progress, get updates, and help your city respond faster.
              </p>
              <div className="mt-5">
                <button
                  onClick={() => (isLoggedIn ? openReportModal() : setAuthOpen(true))}
                  className="cursor-pointer inline-flex items-center rounded-2xl px-5 py-3 bg-indigo-600 text-white text-base font-medium shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  Report an issue
                </button>
              </div>

              {/* Extras: Avg resolve, Recent activity */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow ring-1 ring-black/5">
                  <div className="text-xs font-medium text-gray-500 uppercase">Avg. resolve time</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{prettyDuration(avgResolve?.avg_seconds)}</div>
                </div>
                <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow ring-1 ring-black/5">
                  <div className="text-xs font-medium text-gray-500 uppercase">Recent activity</div>
                  <div className="mt-2 space-y-2 max-h-32 overflow-auto pr-1">
                    {(activity || []).map((a) => {
                      const color =
                        a.kind === "created" ? "bg-orange-100 text-orange-800 border-orange-200" :
                        a.kind === "in_progress" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                        "bg-emerald-100 text-emerald-800 border-emerald-200";
                      return (
                        <button
                          key={`${a.issue_id}-${a.at}-${a.kind}`}
                          onClick={() => {
                            const hit = (issues || []).find((i) => i.id === a.issue_id);
                            if (hit) setDetail(hit);
                          }}
                          className={`w-full text-left rounded-xl border px-3 py-2 ${color} hover:opacity-90`}
                          title={new Date(a.at).toLocaleString()}
                        >
                          <div className="text-xs">#{a.issue_id} • {a.kind.replace("_", " ")}</div>
                          <div className="text-sm font-medium line-clamp-1">{a.title}</div>
                        </button>
                      );
                    })}
                    {!activity?.length && <div className="text-sm text-gray-600">New reports and updates appear here.</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Top contributors (no report button) */}
            <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-sm ring-1 ring-black/5 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-gray-800 uppercase">Top contributors</h3>
                <span className="text-xs text-gray-500">all time</span>
              </div>
              {topContrib?.length ? (
                <ul className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
                  {topContrib.map((c) => (
                    <li key={`${c.name}-${c.count}`} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm">
                      <span className="truncate pr-3">{c.name}</span>
                      <Badge>{c.count}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 text-sm text-gray-600">No contributors yet—be the first! 🎉</div>
              )}
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
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>

          {/* Row 1: Status pie (half) + Type bar (half) */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-gray-800 uppercase">Status breakdown</h3>
                {status && (
                  <button className="text-xs text-indigo-700 underline" onClick={() => setStatus("")}>Clear filter</button>
                )}
              </div>
              {pieData.length ? (
                <StatusPie data={pieData} onPick={(picked) => setStatus(picked)} />
              ) : (
                <div className="p-6 text-sm text-gray-600">No issues yet — you’ll see a breakdown by type here.</div>
              )}
            </div>

            <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-sm ring-1 ring-black/5">
              <h3 className="text-sm font-semibold tracking-wide text-gray-800 uppercase">Issues by type</h3>
              {typeBarData.length ? (
                <SimpleBar data={typeBarData} />
              ) : (
                <div className="p-6 text-sm text-gray-600">No issues yet — you’ll see a breakdown by type here.</div>
              )}
            </div>
          </div>

          {/* Row 2: Region bar (full width) */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            {regionBarData.length ? (
              <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-sm ring-1 ring-black/5">
                <h3 className="text-sm font-semibold tracking-wide text-gray-800 uppercase">Issues by region</h3>
                <SimpleBar data={regionBarData} />
              </div>
            ) : (
              <div className="rounded-2xl bg-white/90 backdrop-blur p-6 shadow-sm ring-1 ring-black/5">
                <h3 className="text-sm font-semibold tracking-wide text-gray-800 uppercase">Issues by region</h3>
                <div className="mt-2 text-sm text-gray-600">No regional data yet — you’ll see a distribution here.</div>
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
              onChange={(e) => setCategory(e.target.value)}
              className="cursor-pointer rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All categories</option>
              {typeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {user && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="h-4 w-4" />
                My issues
              </label>
            )}
          </div>

          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(issues) ? issues : []).map((it: Issue) => (
              <div key={it.id} className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-[1px] hover:shadow-md">
                <div className="text-xs text-gray-500">#{it.id} • {it.created_at ? new Date(it.created_at).toLocaleDateString() : ""}</div>
                <div className="font-semibold mt-1 line-clamp-1">{it.title}</div>
                <div className="text-sm text-gray-600 line-clamp-2">{it.description}</div>
                <div className="text-xs mt-2">{it.category || "—"} • <span className="capitalize">{it.status?.replace("_", " ")}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDetail(it)} className="cursor-pointer px-3 py-1 rounded-xl border bg-white hover:bg-gray-50">Details</button>
                  {isTeam && it.status !== "resolved" && (
                    <>
                      <button type="button" onClick={() => markStatus(it.id, "in_progress")} className="cursor-pointer px-3 py-1 rounded-xl border bg-white hover:bg-gray-50">In progress</button>
                      <button type="button" onClick={() => markStatus(it.id, "resolved")} className="cursor-pointer px-3 py-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Resolve</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {fetchingIssues && <div className="p-4 text-sm text-gray-500">Refreshing data…</div>}
          {!fetchingIssues && (!Array.isArray(issues) || issues.length === 0) && (
            <div className="p-10 text-center text-gray-700">
              <div className="text-2xl font-semibold">No issues yet</div>
              <div className="mt-1 text-sm">Be the first to report an issue and help improve your city 🌆</div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => (isLoggedIn ? openReportModal() : setAuthOpen(true))}
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
      {detail && <IssueDetailModal issue={detail} onClose={() => setDetail(null)} onChanged={() => refetchIssues()} />}
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