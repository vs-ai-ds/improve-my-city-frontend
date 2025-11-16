import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { Link } from "react-router-dom";

async function fetchAdminSummary() {
  const { data } = await api.get("/issues/stats/summary"); // expects { pending, in_progress, resolved, total }
  return data || {};
}

export default function AdminLandingPage() {
  const { data } = useQuery({ queryKey: ["admin-summary"], queryFn: fetchAdminSummary, staleTime: 5 * 60 * 1000 });

  const cells = [
    { k: "pending",      label: "Pending",      className: "bg-amber-50" },
    { k: "in_progress",  label: "In progress",  className: "bg-yellow-50" },
    { k: "resolved",     label: "Resolved",     className: "bg-emerald-50" },
    { k: "total",        label: "Total",        className: "bg-slate-50" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Admin overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cells.map(c => (
          <div key={c.k} className={`rounded-2xl border p-4 ${c.className}`}>
            <div className="text-sm text-gray-600">{c.label}</div>
            <div className="text-2xl font-bold">{Number(data?.[c.k] ?? 0)}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Link to="/admin/issues" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow">
          <div className="text-lg font-semibold">Manage Issues</div>
          <p className="text-sm text-gray-600">Search, assign, and change status</p>
        </Link>
        <Link to="/admin/issue-types" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow">
          <div className="text-lg font-semibold">Manage Issue Types</div>
          <p className="text-sm text-gray-600">Add, rename, or remove types</p>
        </Link>
        <Link to="/admin/users" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow">
          <div className="text-lg font-semibold">Users & Staff</div>
          <p className="text-sm text-gray-600">Admins, staff regions, citizens</p>
        </Link>
        <Link to="/admin/settings" className="rounded-2xl border p-4 bg-white/90 backdrop-blur hover:shadow">
          <div className="text-lg font-semibold">App Settings</div>
          <p className="text-sm text-gray-600">Anonymous reporting, email sender, etc.</p>
        </Link>
      </div>
    </div>
  );
}