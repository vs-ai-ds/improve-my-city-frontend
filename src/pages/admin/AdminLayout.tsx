// File: src/pages/admin/AdminLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { Shield, ListChecks, Users, Settings, Tags } from "lucide-react";

const link = "px-3 py-2 rounded-xl text-sm";
const idle = "text-gray-700 hover:bg-gray-50";
const active = "bg-indigo-50 text-indigo-900";

export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5 text-indigo-600" /> Admin Console
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <NavLink to="/admin/issues" className={({isActive})=>`${link} ${isActive?active:idle}`}><ListChecks className="h-4 w-4 inline mr-1" /> Issues</NavLink>
          <NavLink to="/admin/issue-types" className={({isActive})=>`${link} ${isActive?active:idle}`}><Tags className="h-4 w-4 inline mr-1" /> Issue Types</NavLink>
          <NavLink to="/admin/users" className={({isActive})=>`${link} ${isActive?active:idle}`}><Users className="h-4 w-4 inline mr-1" /> Users</NavLink>
          <NavLink to="/admin/settings" className={({isActive})=>`${link} ${isActive?active:idle}`}><Settings className="h-4 w-4 inline mr-1" /> Settings</NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
}