// src/pages/admin/AdminLayout.tsx
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { Shield, ListChecks, Users, Settings, Tags } from "lucide-react";
import { useAuth } from "../../store/useAuth";

const link = "px-3 py-2 rounded-xl text-sm";
const idle = "text-gray-700 hover:bg-gray-50";
const active = "bg-indigo-50 text-indigo-900";

export default function AdminLayout() {
  const { user } = useAuth();
  
  if (!user || !["admin", "staff", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        <NavLink to="/admin/issues" className={({isActive})=>`${link} ${isActive?active:idle} inline-flex items-center gap-2 font-medium transition-colors`}>
          <ListChecks className="h-4 w-4" /> Issues
        </NavLink>
        <NavLink to="/admin/issue-types" className={({isActive})=>`${link} ${isActive?active:idle} inline-flex items-center gap-2 font-medium transition-colors`}>
          <Tags className="h-4 w-4" /> Issue Types
        </NavLink>
        <NavLink to="/admin/users" className={({isActive})=>`${link} ${isActive?active:idle} inline-flex items-center gap-2 font-medium transition-colors`}>
          <Users className="h-4 w-4" /> Users
        </NavLink>
        <NavLink to="/admin/settings" className={({isActive})=>`${link} ${isActive?active:idle} inline-flex items-center gap-2 font-medium transition-colors`}>
          <Settings className="h-4 w-4" /> Settings
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}
